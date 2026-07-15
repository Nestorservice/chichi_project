'use strict';
const fs = require('fs');
const path = require('path');
const db = require('../db'); // Supposé exporter un pool MySQL (ex: mysql2/promise)
const { deriverTagsSante, tagsRequis } = require('../healthEngine');
const { uploadToCloudinary } = require('../middleware/upload');


const UPLOADS = path.join(__dirname, '..', '..', 'uploads');

const bool = (v) => v === true || v === 'true' || v === 'on' || v === '1' ? 1 : 0; // MySQL utilise 1/0 pour les BOOLEAN
const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
function parseJSON(v, def) {
  if (v == null) return def;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return def; }
}

// Helper pour formater les chaînes issues de GROUP_CONCAT en tableaux JS
function stringToArray(str) {
  if (!str) return [];
  return str.split(',').filter(Boolean);
}

async function recalculerTags(connection, productId) {
  const [rows] = await connection.query(
    `SELECT p.is_vegetarian, p.is_vegan, p.is_gluten_free,
            n.glycemic_index, n.sugars_g, n.calories_kcal, n.protein_g, n.sodium_mg
       FROM products p
       LEFT JOIN product_nutrition n ON n.product_id = p.id
      WHERE p.id = ?`, [productId]);
  
  if (!rows[0]) return [];
  const r = rows[0];
  const tags = deriverTagsSante(r, {
    isVegetarian: !!r.is_vegetarian, 
    isVegan: !!r.is_vegan, 
    isGlutenFree: !!r.is_gluten_free,
  });

  await connection.query('DELETE FROM product_health_tags WHERE product_id = ?', [productId]);
  for (const tag of tags) {
    await connection.query('INSERT INTO product_health_tags (product_id, tag) VALUES (?, ?)', [productId, tag]);
  }
  return tags;
}

async function listerProduits(req, res) {
  const conditions = (req.query.conditions || '').split(',').filter(Boolean);
  const allergies = (req.query.allergies || '').split(',').filter(Boolean);
  const cuisine = req.query.cuisine || null;
  const tags = tagsRequis(conditions);

  const params = [];
  let sql = `
    SELECT p.id, p.name, p.description, p.price_fcfa, p.cuisine, p.image_url,
           p.nutritionist_validated,
           GROUP_CONCAT(DISTINCT t.tag) AS tags
      FROM products p
      LEFT JOIN product_health_tags t ON t.product_id = p.id
     WHERE p.is_available = 1`;

  if (cuisine) { 
    sql += ` AND p.cuisine = ?`; 
    params.push(cuisine); 
  }
  
  if (allergies.length) {
    // MySQL n'a pas '= ANY(array)'. On utilise un NOT EXISTS classique avec IN (?)
    sql += ` AND NOT EXISTS (
      SELECT 1 FROM product_allergens pa
       WHERE pa.product_id = p.id AND pa.allergen IN (${allergies.map(() => '?').join(',')})
    )`;
    params.push(...allergies);
  }
  
  if (tags.length) {
    sql += ` AND p.id IN (
      SELECT product_id FROM product_health_tags
       WHERE tag IN (${tags.map(() => '?').join(',')})
       GROUP BY product_id HAVING COUNT(DISTINCT tag) = ?
    )`;
    params.push(...tags, tags.length);
  }
  
  sql += ' GROUP BY p.id ORDER BY p.nutritionist_validated DESC, p.created_at DESC';

  try {
    const [rows] = await db.query(sql, params);
    
    // Post-processing pour transformer la chaîne GROUP_CONCAT en tableau JS
    const plats = rows.map(r => ({
      ...r,
      tags: stringToArray(r.tags),
      nutritionist_validated: !!r.nutritionist_validated
    }));

    res.json({ nombre: plats.length, plats });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur lors du filtrage' });
  }
}

async function listerTous(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.name, p.price_fcfa, p.cuisine, p.image_url, p.is_available, p.nutritionist_validated,
             GROUP_CONCAT(DISTINCT t.tag) AS tags
        FROM products p
        LEFT JOIN product_health_tags t ON t.product_id = p.id
       GROUP BY p.id ORDER BY p.created_at DESC`);
    
    const plats = rows.map(r => ({
      ...r,
      tags: stringToArray(r.tags),
      is_available: !!r.is_available,
      nutritionist_validated: !!r.nutritionist_validated
    }));

    res.json({ plats });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
}

async function detailProduit(req, res) {
  try {
    // Dans MySQL, pour éviter l'absence de row_to_json, on sélectionne à plat
    // et on reconstruit l'objet "nutrition" en JavaScript.
    const [rows] = await db.query(`
      SELECT p.*,
             n.portion_g, n.calories_kcal, n.carbs_g, n.sugars_g, n.protein_g, 
             n.fat_g, n.fiber_g, n.sodium_mg, n.glycemic_index,
             GROUP_CONCAT(DISTINCT t.tag) AS tags,
             GROUP_CONCAT(DISTINCT a.allergen) AS allergenes
        FROM products p
        LEFT JOIN product_nutrition n  ON n.product_id = p.id
        LEFT JOIN product_health_tags t ON t.product_id = p.id
        LEFT JOIN product_allergens a  ON a.product_id = p.id
       WHERE p.id = ?
       GROUP BY p.id`, [req.params.id]);

    if (!rows[0]) return res.status(404).json({ erreur: 'Plat introuvable' });
    
    const raw = rows[0];
    
    // Reconstruction propre de la structure attendue
    const produit = {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      price_fcfa: raw.price_fcfa,
      category_id: raw.category_id,
      chef_id: raw.chef_id,
      cuisine: raw.cuisine,
      image_url: raw.image_url,
      is_available: !!raw.is_available,
      is_vegetarian: !!raw.is_vegetarian,
      is_vegan: !!raw.is_vegan,
      is_gluten_free: !!raw.is_gluten_free,
      nutritionist_validated: !!raw.nutritionist_validated,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      tags: stringToArray(raw.tags),
      allergenes: stringToArray(raw.allergenes),
      nutrition: raw.portion_g !== null ? {
        portion_g: raw.portion_g,
        calories_kcal: raw.calories_kcal,
        carbs_g: raw.carbs_g,
        sugars_g: raw.sugars_g,
        protein_g: raw.protein_g,
        fat_g: raw.fat_g,
        fiber_g: raw.fiber_g,
        sodium_mg: raw.sodium_mg,
        glycemic_index: raw.glycemic_index
      } : null
    };

    const [gal] = await db.query(
      'SELECT id, url, position FROM product_images WHERE product_id = ? ORDER BY position, id', [req.params.id]);
    
    produit.galerie = gal;
    res.json(produit);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
}

async function creerProduit(req, res) {
  const b = req.body;
  const nutrition = parseJSON(b.nutrition, {});
  const allergenes = parseJSON(b.allergenes, []);
  const files = req.files || {};

  if (!b.name || b.price_fcfa == null || b.price_fcfa === '' || !b.cuisine) {
    return res.status(400).json({ erreur: 'name, price_fcfa et cuisine sont requis' });
  }

  // Upload principal image to Cloudinary
  let principale = null;
  if (files.image && files.image[0]) {
    try {
      principale = await uploadToCloudinary(files.image[0]);
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      return res.status(500).json({ erreur: "Échec de l'hébergement de l'image principale" });
    }
  }

  // Upload gallery images to Cloudinary
  const galerie = [];
  if (files.gallery && files.gallery.length) {
    try {
      for (const file of files.gallery) {
        const url = await uploadToCloudinary(file);
        if (url) galerie.push(url);
      }
    } catch (err) {
      console.error("Cloudinary gallery upload failed:", err);
      return res.status(500).json({ erreur: "Échec de l'hébergement des images de la galerie" });
    }
  }

  const connection = await db.getConnection(); // Obtention d'une connexion dédiée du pool MySQL
  try {
    await connection.beginTransaction();

    const [resProd] = await connection.query(`
      INSERT INTO products
        (name, description, price_fcfa, category_id, chef_id, cuisine, image_url,
         is_vegetarian, is_vegan, is_gluten_free, nutritionist_validated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.name, b.description || null, Number(b.price_fcfa), b.category_id || null, b.chef_id || null,
       b.cuisine, principale, bool(b.is_vegetarian), bool(b.is_vegan), bool(b.is_gluten_free), bool(b.nutritionist_validated)]);
    
    const id = resProd.insertId; // Récupération de l'ID généré par MySQL

    await connection.query(`
      INSERT INTO product_nutrition
        (product_id, portion_g, calories_kcal, carbs_g, sugars_g, protein_g, fat_g, fiber_g, sodium_mg, glycemic_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, num(nutrition.portion_g), num(nutrition.calories_kcal), num(nutrition.carbs_g), num(nutrition.sugars_g),
       num(nutrition.protein_g), num(nutrition.fat_g), num(nutrition.fiber_g), num(nutrition.sodium_mg), num(nutrition.glycemic_index)]);

    for (const a of allergenes) {
      await connection.query('INSERT INTO product_allergens (product_id, allergen) VALUES (?, ?)', [id, a]);
    }
    
    let pos = 0;
    for (const url of galerie) {
      await connection.query('INSERT INTO product_images (product_id, url, position) VALUES (?, ?, ?)', [id, url, pos++]);
    }

    const tags = await recalculerTags(connection, id);
    await connection.commit();
    res.status(201).json({ id, tags_calcules: tags });
  } catch (e) {
    await connection.rollback();
    console.error(e);
    res.status(500).json({ erreur: 'Création impossible' });
  } finally {
    connection.release();
  }
}

async function modifierProduit(req, res) {
  const id = req.params.id;
  const b = req.body;
  const files = req.files || {};
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const set = [];
    const params = [];
    const push = (col, val) => { params.push(val); set.push(`${col} = ?`); };
    if (b.name != null) push('name', b.name);
    if (b.description != null) push('description', b.description);
    if (b.price_fcfa != null && b.price_fcfa !== '') push('price_fcfa', Number(b.price_fcfa));
    if (b.cuisine) push('cuisine', b.cuisine);
    if (b.is_vegetarian != null) push('is_vegetarian', bool(b.is_vegetarian));
    if (b.is_vegan != null) push('is_vegan', bool(b.is_vegan));
    if (b.is_gluten_free != null) push('is_gluten_free', bool(b.is_gluten_free));
    if (b.nutritionist_validated != null) push('nutritionist_validated', bool(b.nutritionist_validated));
    if (b.is_available != null) push('is_available', bool(b.is_available));
    
    if (files.image && files.image[0]) {
      const url = await uploadToCloudinary(files.image[0]);
      if (url) push('image_url', url);
    }
    
    if (set.length) {
      params.push(id);
      await connection.query(`UPDATE products SET ${set.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
    }

    if (b.nutrition) {
      const n = parseJSON(b.nutrition, {});
      await connection.query(`
        INSERT INTO product_nutrition
          (product_id, portion_g, calories_kcal, carbs_g, sugars_g, protein_g, fat_g, fiber_g, sodium_mg, glycemic_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          portion_g = VALUES(portion_g), 
          calories_kcal = VALUES(calories_kcal), 
          carbs_g = VALUES(carbs_g),
          sugars_g = VALUES(sugars_g), 
          protein_g = VALUES(protein_g), 
          fat_g = VALUES(fat_g),
          fiber_g = VALUES(fiber_g), 
          sodium_mg = VALUES(sodium_mg), 
          glycemic_index = VALUES(glycemic_index)`,
        [id, num(n.portion_g), num(n.calories_kcal), num(n.carbs_g), num(n.sugars_g),
         num(n.protein_g), num(n.fat_g), num(n.fiber_g), num(n.sodium_mg), num(n.glycemic_index)]);
    }

    const galerie = [];
    if (files.gallery && files.gallery.length) {
      for (const file of files.gallery) {
        const url = await uploadToCloudinary(file);
        if (url) galerie.push(url);
      }
    }
    if (galerie.length) {
      const [mx] = await connection.query(
        'SELECT COALESCE(MAX(position), -1) AS m FROM product_images WHERE product_id = ?', [id]);
      let pos = mx[0].m + 1;
      for (const url of galerie) {
        await connection.query('INSERT INTO product_images (product_id, url, position) VALUES (?, ?, ?)', [id, url, pos++]);
      }
    }

    const tags = await recalculerTags(connection, id);
    await connection.commit();
    res.json({ id, tags_recalcules: tags });
  } catch (e) {
    await connection.rollback();
    console.error(e);
    res.status(500).json({ erreur: 'Modification impossible' });
  } finally {
    connection.release();
  }
}

async function supprimerProduit(req, res) {
  try {
    await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Suppression impossible' });
  }
}

async function supprimerImage(req, res) {
  try {
    // Émulation de RETURNING : Récupérer d'abord l'url avant de supprimer (car MySQL ne supporte pas RETURNING)
    const [rows] = await db.query('SELECT url FROM product_images WHERE id = ?', [req.params.id]);
    if (rows[0]) {
      await db.query('DELETE FROM product_images WHERE id = ?', [req.params.id]);
      const f = path.join(UPLOADS, path.basename(rows[0].url));
      fs.unlink(f, () => {});
    }
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Suppression de l\'image impossible' });
  }
}

module.exports = {
  listerProduits, listerTous, detailProduit,
  creerProduit, modifierProduit, supprimerProduit, supprimerImage, recalculerTags,
};