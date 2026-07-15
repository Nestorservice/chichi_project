'use strict';

const db = require('../db');
const { tagsRequis } = require('../healthEngine');

// -------------------- RÈGLES --------------------

const REGLES_CONDITIONS = [
  [/diab[ée]t|glyc[ée]m|sucre.*surveill|surveill.*sucre/i, 'diabetique'],
  [/sport|muscl|prot[ée]in|salle|fitness|apr[èe]s.*entra[îi]n/i, 'sportif'],
  [/minceur|maigrir|perdre.*poids|r[ée]gime|l[ée]ger|moins.*calor/i, 'minceur'],
  [/tension|hypertens|sel|sod/i, 'hypertension'],
  [/v[ée]g[ée]tarien|sans.*viande/i, 'vegetarien'],
  [/v[ée]gan|v[ée]g[ée]talien/i, 'vegan'],
  [/sans.*gluten|gluten|c[œo]eliaque/i, 'sans_gluten'],
];

const REGLES_ALLERGIES = [
  [/arachide|cacahu[èe]te/i, 'arachide'],
  [/lactose|lait/i, 'lactose'],
  [/[œo]euf/i, 'oeuf'],
  [/fruits?.*de.*mer|crevette|crabe/i, 'fruits_de_mer'],
  [/poisson/i, 'poisson'],
  [/soja/i, 'soja'],
  [/porc|cochon/i, 'porc'],
];

const REGLES_CUISINE = [
  [/camerounais|local|ndol[èe]|eru|poulet.*dg|terroir/i, 'camerounais'],
  [/fast.?food|burger|sandwich|rapide/i, 'fastfood'],
  [/boisson|jus|boire/i, 'boisson'],
  [/dessert|g[âa]teau|p[âa]tisser|glace/i, 'dessert'],
];

function chercher(message, regles) {
  const trouves = [];

  for (const [regex, valeur] of regles) {
    if (regex.test(message) && !trouves.includes(valeur)) {
      trouves.push(valeur);
    }
  }

  return trouves;
}

function interpreter(message) {
  const conditions = chercher(message, REGLES_CONDITIONS);
  const allergies = chercher(message, REGLES_ALLERGIES);
  const cuisines = chercher(message, REGLES_CUISINE);

  let prixMax = null;

  const m = message.match(/(\d{3,6})/);

  if (m) {
    prixMax = Number(m[1]);
  }

  return {
    conditions,
    allergies,
    cuisine: cuisines[0] || null,
    prixMax,
  };
}

function formulerReponse(criteres, nbPlats) {

  const parts = [];

  if (criteres.conditions.length)
    parts.push("profil " + criteres.conditions.join(", "));

  if (criteres.allergies.length)
    parts.push("sans " + criteres.allergies.join(", "));

  if (criteres.cuisine)
    parts.push("cuisine " + criteres.cuisine);

  if (criteres.prixMax)
    parts.push("moins de " + criteres.prixMax + " FCFA");

  if (nbPlats === 0) {
    return "Aucun plat trouvé.";
  }

  return (parts.length ? "Pour " + parts.join(", ") + ", " : "") +
         "voici " + nbPlats + " plat(s).";
}

// -------------------- CHAT --------------------

async function discuter(req, res) {

  const message = (req.body.message || "").trim();

  if (!message) {
    return res.status(400).json({
      erreur: "Message vide"
    });
  }

  const criteres = interpreter(message);

  const tags = tagsRequis(criteres.conditions);

  let sql = `
SELECT
    p.id,
    p.name,
    p.description,
    p.price_fcfa,
    p.cuisine,
    p.image_url,
    p.nutritionist_validated,
    GROUP_CONCAT(DISTINCT t.tag) AS tags
FROM products p
LEFT JOIN product_health_tags t
ON t.product_id = p.id
WHERE p.is_available = 1
`;

  const params = [];

  if (criteres.cuisine) {
    sql += " AND p.cuisine = ?";
    params.push(criteres.cuisine);
  }

  if (criteres.prixMax) {
    sql += " AND p.price_fcfa <= ?";
    params.push(criteres.prixMax);
  }

  // Exclusion des allergènes
  for (const allergie of criteres.allergies) {
    sql += `
    AND p.id NOT IN (
        SELECT product_id
        FROM product_allergens
        WHERE allergen = ?
    )
    `;
    params.push(allergie);
  }

  // Tous les tags santé doivent être présents
  for (const tag of tags) {
    sql += `
    AND p.id IN (
        SELECT product_id
        FROM product_health_tags
        WHERE tag = ?
    )
    `;
    params.push(tag);
  }

  sql += `
GROUP BY p.id
ORDER BY
    p.nutritionist_validated DESC,
    p.price_fcfa ASC
LIMIT 6
`;

  try {

    const [rows] = await db.query(sql, params);

    rows.forEach(p => {
      p.tags = p.tags ? p.tags.split(",") : [];
    });

    res.json({
      reponse: formulerReponse(criteres, rows.length),
      criteres,
      plats: rows
    });

  } catch (e) {

    console.error(e);

    res.status(500).json({
      erreur: "Erreur de l'assistant"
    });

  }

}

module.exports = {
  discuter,
  interpreter
};