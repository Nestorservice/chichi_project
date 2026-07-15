'use strict';

const db = require('../db');

const STATUTS = [
  'en_attente',
  'confirmee',
  'en_preparation',
  'en_livraison',
  'livree',
  'annulee'
];

// =========================
// Passer une commande
// =========================
async function passerCommande(req, res) {

  const userId = req.utilisateur.id;
  const { items = [], delivery_address, payment_method } = req.body;

  if (!items.length || !delivery_address || !payment_method) {
    return res.status(400).json({
      erreur: 'Articles, adresse et mode de paiement requis'
    });
  }

  const conn = await db.getConnection();

  try {

    await conn.beginTransaction();

    const ids = items.map(i => i.product_id);

    const placeholders = ids.map(() => '?').join(',');

    const [produits] = await conn.query(
      `SELECT id, price_fcfa
       FROM products
       WHERE id IN (${placeholders})
       AND is_available = 1`,
      ids
    );

    const prixMap = {};

    produits.forEach(p => {
      prixMap[p.id] = p.price_fcfa;
    });

    let total = 0;

    for (const item of items) {

      if (!prixMap[item.product_id]) {
        throw new Error('Plat indisponible');
      }

      total += prixMap[item.product_id] * item.quantity;
    }

    const [result] = await conn.query(
      `INSERT INTO orders
      (user_id,total_fcfa,delivery_address,payment_method)
      VALUES (?,?,?,?)`,
      [
        userId,
        total,
        delivery_address,
        payment_method
      ]
    );

    const orderId = result.insertId;

    for (const item of items) {

      await conn.query(
        `INSERT INTO order_items
        (order_id,product_id,quantity,unit_price_fcfa)
        VALUES (?,?,?,?)`,
        [
          orderId,
          item.product_id,
          item.quantity,
          prixMap[item.product_id]
        ]
      );

    }

    await conn.commit();

    res.status(201).json({
      commande: {
        id: orderId,
        status: 'en_attente',
        total_fcfa: total
      }
    });

  } catch (e) {

    await conn.rollback();

    console.error(e);

    res.status(400).json({
      erreur: e.message
    });

  } finally {

    conn.release();

  }

}

// =========================
// Mes commandes
// =========================
async function mesCommandes(req, res) {

  const [rows] = await db.query(`
SELECT
o.id,
o.status,
o.total_fcfa,
o.delivery_address,
o.payment_method,
o.created_at,
o.latitude,
o.longitude,
o.delivery_choice_made,
o.has_review,
oi.product_id,
p.name,
oi.quantity,
oi.unit_price_fcfa
FROM orders o
LEFT JOIN order_items oi ON oi.order_id=o.id
LEFT JOIN products p ON p.id=oi.product_id
WHERE o.user_id=?
ORDER BY o.created_at DESC
`, [req.utilisateur.id]);

  res.json(rows);

}

// =========================
// Toutes les commandes
// =========================
async function toutesCommandes(req, res) {

  const [rows] = await db.query(`
SELECT
o.id,
o.status,
o.total_fcfa,
o.delivery_address,
o.payment_method,
o.created_at,
o.latitude,
o.longitude,
o.delivery_choice_made,
o.has_review,
u.full_name,
u.phone,
oi.product_id,
p.name,
oi.quantity,
oi.unit_price_fcfa
FROM orders o
LEFT JOIN users u ON u.id=o.user_id
LEFT JOIN order_items oi ON oi.order_id=o.id
LEFT JOIN products p ON p.id=oi.product_id
ORDER BY o.created_at DESC
`);

  res.json({
    commandes: rows
  });

}

// =========================
let activeClients = [];

// =========================
// Stream des commandes (SSE)
// =========================
function streamCommandes(req, res) {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ erreur: 'Token requis' });
  }

  let decoded;
  try {
    const jwt = require('jsonwebtoken');
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ erreur: 'Token invalide' });
  }

  const userId = decoded.id;
  const isAdmin = decoded.role === 'admin';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const client = { id: userId, isAdmin, res };
  activeClients.push(client);

  const pingInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(pingInterval);
    activeClients = activeClients.filter(c => c !== client);
    res.end();
  });
}

// =========================
// Modifier le statut
// =========================
async function changerStatut(req, res) {

  const { status } = req.body;

  if (!STATUTS.includes(status)) {

    return res.status(400).json({
      erreur: 'Statut invalide'
    });

  }

  await db.query(
    `UPDATE orders
     SET status=?
     WHERE id=?`,
    [status, req.params.id]
  );

  const [rows] = await db.query(
    `SELECT id, status, user_id
     FROM orders
     WHERE id=?`,
    [req.params.id]
  );

  if (!rows.length) {

    return res.status(404).json({
      erreur: 'Commande introuvable'
    });

  }

  const order = rows[0];

  // Notification SSE en temps réel
  activeClients.forEach(c => {
    if (c.id === order.user_id) {
      c.res.write(`data: ${JSON.stringify({ type: 'order_update', orderId: order.id, status: order.status })}\n\n`);
    }
    if (c.isAdmin) {
      c.res.write(`data: ${JSON.stringify({ type: 'admin_order_update', orderId: order.id, status: order.status })}\n\n`);
    }
  });

  res.json({ id: order.id, status: order.status });

}

// =========================
// Définir le choix de livraison (Position actuelle vs Autre endroit)
// =========================
async function definirChoixLivraison(req, res) {
  const { id } = req.params;
  const { latitude, longitude, delivery_address } = req.body;
  const userId = req.utilisateur.id; // wait, let's verify if req.utilisateur or req.user is set by authentication middleware.

  try {
    const [orders] = await db.query(
      'SELECT id, user_id, status FROM orders WHERE id = ?',
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ erreur: 'Commande introuvable' });
    }

    const order = orders[0];
    if (order.user_id !== userId && req.utilisateur.role !== 'admin') {
      return res.status(403).json({ erreur: 'Non autorisé' });
    }

    if (latitude !== undefined && longitude !== undefined) {
      await db.query(
        `UPDATE orders 
         SET latitude = ?, longitude = ?, delivery_choice_made = 1 
         WHERE id = ?`,
        [latitude, longitude, id]
      );
    } else if (delivery_address !== undefined) {
      await db.query(
        `UPDATE orders 
         SET delivery_address = ?, delivery_choice_made = 1 
         WHERE id = ?`,
        [delivery_address, id]
      );
    } else {
      return res.status(400).json({ erreur: 'Données manquantes' });
    }

    const [updatedRows] = await db.query(
      `SELECT id, status, total_fcfa, delivery_address, payment_method, created_at, latitude, longitude, delivery_choice_made
       FROM orders
       WHERE id = ?`,
      [id]
    );

    const updatedOrder = updatedRows[0];

    // Notification SSE en temps réel
    activeClients.forEach(c => {
      if (c.id === order.user_id) {
        c.res.write(`data: ${JSON.stringify({ 
          type: 'order_update', 
          orderId: order.id, 
          status: order.status,
          updatedOrder 
        })}\n\n`);
      }
      if (c.isAdmin) {
        c.res.write(`data: ${JSON.stringify({ 
          type: 'admin_order_update', 
          orderId: order.id, 
          updatedOrder 
        })}\n\n`);
      }
    });

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
}

// =========================
// Ajouter un avis client
// =========================
async function ajouterAvis(req, res) {
  const { id } = req.params;
  const { app_rating, suggestions, product_ratings } = req.body;
  const userId = req.utilisateur.id;

  if (app_rating === undefined || app_rating < 1 || app_rating > 5) {
    return res.status(400).json({ erreur: 'Note de l\'application invalide (doit être entre 1 et 5)' });
  }

  const conn = await db.getConnection();
  try {
    const [orders] = await conn.query(
      'SELECT id, user_id, status, has_review FROM orders WHERE id = ?',
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ erreur: 'Commande introuvable' });
    }

    const order = orders[0];
    if (order.user_id !== userId) {
      return res.status(403).json({ erreur: 'Non autorisé à évaluer cette commande' });
    }

    if (order.status !== 'livree') {
      return res.status(400).json({ erreur: 'Vous ne pouvez évaluer qu\'une commande livrée.' });
    }

    if (order.has_review) {
      return res.status(400).json({ erreur: 'Vous avez déjà évalué cette commande.' });
    }

    await conn.beginTransaction();

    const [reviewRes] = await conn.query(
      `INSERT INTO reviews (order_id, user_id, app_rating, suggestions) VALUES (?, ?, ?, ?)`,
      [id, userId, app_rating, suggestions || null]
    );

    const reviewId = reviewRes.insertId;

    if (product_ratings && Array.isArray(product_ratings)) {
      for (const pr of product_ratings) {
        if (pr.product_id && pr.rating >= 1 && pr.rating <= 5) {
          await conn.query(
            `INSERT INTO product_reviews (review_id, product_id, rating) VALUES (?, ?, ?)`,
            [reviewId, pr.product_id, pr.rating]
          );
        }
      }
    }

    await conn.query(`UPDATE orders SET has_review = 1 WHERE id = ?`, [id]);

    await conn.commit();

    const [customerRows] = await conn.query('SELECT full_name FROM users WHERE id = ?', [userId]);
    const customerName = customerRows[0]?.full_name || 'Client';

    const [prodRatings] = await conn.query(
      `SELECT pr.product_id, pr.rating, p.name as product_name
       FROM product_reviews pr
       JOIN products p ON pr.product_id = p.id
       WHERE pr.review_id = ?`,
      [reviewId]
    );

    const newFeedback = {
      id: reviewId,
      order_id: Number(id),
      app_rating,
      suggestions,
      customer_name: customerName,
      created_at: new Date(),
      product_ratings: prodRatings
    };

    activeClients.forEach(c => {
      if (c.isAdmin) {
        c.res.write(`data: ${JSON.stringify({ type: 'new_review', review: newFeedback })}\n\n`);
      }
    });

    res.status(201).json({ message: 'Avis enregistré avec succès !', review: newFeedback });

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ erreur: err.message });
  } finally {
    await conn.release();
  }
}

// =========================
// Lister tous les avis clients (Admin)
// =========================
async function listerAvis(req, res) {
  try {
    const [reviews] = await db.query(`
      SELECT r.id, r.order_id, r.app_rating, r.suggestions, r.created_at, u.full_name as customer_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `);

    for (const rev of reviews) {
      const [ratings] = await db.query(`
        SELECT pr.product_id, pr.rating, p.name as product_name
        FROM product_reviews pr
        JOIN products p ON pr.product_id = p.id
        WHERE pr.review_id = ?
      `, [rev.id]);
      rev.product_ratings = ratings;
    }

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
}

module.exports = {
  passerCommande,
  mesCommandes,
  toutesCommandes,
  changerStatut,
  streamCommandes,
  definirChoixLivraison,
  ajouterAvis,
  listerAvis,
  STATUTS
};