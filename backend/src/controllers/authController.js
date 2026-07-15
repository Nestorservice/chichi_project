'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

function signer(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/inscription
async function inscription(req, res) {
  const {
    full_name,
    phone,
    email,
    password,
    conditions = [],
    allergies = [],
    admin_secret,
  } = req.body;

  if (!full_name || !phone || !password) {
    return res
      .status(400)
      .json({ erreur: 'Nom, téléphone et mot de passe requis' });
  }

  const conn = await db.getConnection();

  try {
    // Verifier si le numero de telephone est deja utilise
    const [existing] = await conn.query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing && existing.length > 0) {
      return res.status(409).json({
        erreur: 'Ce numéro de téléphone est déjà utilisé. Veuillez utiliser un autre numéro ou vous connecter.'
      });
    }

    // Verifier la tentative de creation de compte admin
    let role = 'client';
    if (admin_secret !== undefined || req.body.devenir_admin) {
      if (!admin_secret || admin_secret !== process.env.ADMIN_REGISTRATION_SECRET) {
        return res.status(400).json({
          erreur: "Le code secret d'administrateur est incorrect. Si vous souhaitez créer un compte client simple, veuillez décocher l'option administrateur."
        });
      }
      role = 'admin';
    }

    await conn.beginTransaction();

    const hash = await bcrypt.hash(password, 10);

    const [result] = await conn.query(
      `INSERT INTO users (full_name, phone, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [full_name, phone, email || null, hash, role]
    );

    const userId = result.insertId;

    const [rows] = await conn.query(
      `SELECT id, full_name, phone, role
       FROM users
       WHERE id = ?`,
      [userId]
    );

    const user = rows[0];

    for (const c of conditions) {
      await conn.query(
        `INSERT IGNORE INTO user_health_conditions (user_id, \`condition\`)
         VALUES (?, ?)`,
        [user.id, c]
      );
    }

    for (const a of allergies) {
      await conn.query(
        `INSERT IGNORE INTO user_allergies (user_id, allergen)
         VALUES (?, ?)`,
        [user.id, a]
      );
    }

    await conn.commit();

    res.status(201).json({
      token: signer(user),
      utilisateur: user,
    });

  } catch (e) {
    await conn.rollback();

    if (e.code === 'ER_DUP_ENTRY') {
      return res
        .status(409)
        .json({ erreur: 'Téléphone ou email déjà utilisé' });
    }

    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur' });

  } finally {
    conn.release();
  }
}

// POST /api/auth/connexion
async function connexion(req, res) {
  const { phone, password } = req.body;

  const [rows] = await db.query(
    'SELECT * FROM users WHERE phone = ?',
    [phone]
  );

  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res
      .status(401)
      .json({ erreur: 'Identifiants incorrects' });
  }

  res.json({
    token: signer(user),
    utilisateur: {
      id: user.id,
      full_name: user.full_name,
      role: user.role,
    },
  });
}

// GET /api/auth/profil
async function profil(req, res) {
  const uid = req.utilisateur.id;

  const [conditions] = await db.query(
    'SELECT `condition` FROM user_health_conditions WHERE user_id = ?',
    [uid]
  );

  const [allergies] = await db.query(
    'SELECT allergen FROM user_allergies WHERE user_id = ?',
    [uid]
  );

  res.json({
    conditions: conditions.map((r) => r.condition),
    allergies: allergies.map((r) => r.allergen),
  });
}

module.exports = {
  inscription,
  connexion,
  profil,
};