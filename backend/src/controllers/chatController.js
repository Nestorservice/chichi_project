'use strict';

const db = require('../db');
const { tagsRequis } = require('../healthEngine');

// -------------------- REGEX FALLBACK (OLD LOGIC) --------------------
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
  if (criteres.conditions.length) parts.push("profil " + criteres.conditions.join(", "));
  if (criteres.allergies.length) parts.push("sans " + criteres.allergies.join(", "));
  if (criteres.cuisine) parts.push("cuisine " + criteres.cuisine);
  if (criteres.prixMax) parts.push("moins de " + criteres.prixMax + " FCFA");

  if (nbPlats === 0) {
    return "Aucun plat trouvé.";
  }

  return (parts.length ? "Pour " + parts.join(", ") + ", " : "") +
         "voici " + nbPlats + " plat(s).";
}

// -------------------- CHAT DISPATCHER (GROQ AI OR REGEX FALLBACK) --------------------
async function discuter(req, res) {
  const message = (req.body.message || "").trim();

  if (!message) {
    return res.status(400).json({ erreur: "Message vide" });
  }

  // Check if Groq API Key is available
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return discuterRegexFallback(message, res);
  }

  try {
    // 1. Fetch all available products with nutrition info from the database
    const [products] = await db.query(`
      SELECT p.id, p.name, p.description, p.price_fcfa, p.cuisine, p.is_available, p.nutritionist_validated,
             n.portion_g, n.calories_kcal, n.carbs_g, n.sugars_g, n.protein_g, n.fat_g, n.fiber_g, n.sodium_mg, n.glycemic_index,
             GROUP_CONCAT(DISTINCT t.tag) AS tags
        FROM products p
        LEFT JOIN product_nutrition n ON n.product_id = p.id
        LEFT JOIN product_health_tags t ON t.product_id = p.id
       WHERE p.is_available = 1
       GROUP BY p.id
    `);

    // Format products catalog into a concise text representation
    const catalogText = products.map((p) => {
      const tagsList = p.tags ? p.tags.split(',') : [];
      const nut = p.portion_g 
        ? `Portion: ${p.portion_g}g, Calories: ${p.calories_kcal} kcal, Glucides: ${p.carbs_g}g, Sucres: ${p.sugars_g}g, Protéines: ${p.protein_g}g, Lipides: ${p.fat_g}g, Fibres: ${p.fiber_g}g, Sodium: ${p.sodium_mg}mg, Index Glycémique: ${p.glycemic_index}`
        : "Valeurs nutritionnelles non spécifiées";
      return `ID: ${p.id} | Nom: ${p.name} | Prix: ${p.price_fcfa} FCFA | Cuisine: ${p.cuisine}
Description: ${p.description || "Aucune"}
Tags Santé: ${tagsList.join(', ')}
Nutrition: ${nut}`;
    }).join('\n\n');

    // 2. Build system instruction prompt for Llama 3 via Groq with explicit reasoning rules
    const systemPrompt = `Tu es l'assistant nutritionnel expert et officiel de "Mboa Resto", un restaurant de cuisine camerounaise saine et équilibrée. 
Ton rôle est de guider les clients, leur donner des conseils en nutrition et leur recommander des plats adaptés du menu selon leur profil de santé (diabète, musculation, minceur, hypertension, végétarien, vegan, sans gluten) ou leurs allergies.

Voici la liste des plats actuellement disponibles au menu chez Mboa Resto :
${catalogText}

Règles de RAISONNEMENT et de comportement :
1. ANALYSE ET RAISONNEMENT CLINIQUE (Pas-à-pas) : 
   Avant de formuler ta réponse, effectue mentalement cette analyse logique de la demande du client :
   a. Restriction stricte : Identifie toutes les allergies ou aliments à bannir (ex: arachide, gluten, lait, porc). Élimine immédiatement tous les plats qui contiennent l'un de ces éléments.
   b. Objectif santé / Pathologie : Détermine les besoins spécifiques du profil (ex : diabète = index glycémique < 55 et sucres faibles ; hypertension = sodium faible ; sportif = protéines élevées ; minceur = faible apport calorique).
   c. Évaluation comparative : Compare les plats restants et classe-les selon leur pertinence par rapport aux objectifs du client.
   d. Recommandation finale : Choisis de 1 à 3 plats du menu qui conviennent le mieux.
2. Justifie toujours tes conseils auprès du client en citant les valeurs nutritionnelles réelles du plat (calories, protéines, sucres ou sodium) figurant dans les données pour prouver ton raisonnement.
3. Comporte-toi comme un nutritionniste chaleureux, poli, rassurant et rigoureux.
4. Ne propose JAMAIS de plats qui ne figurent pas au menu ci-dessus.
5. Rédige ta réponse en français de façon concise et structurée (utilise des listes à puces et du gras pour faciliter la lecture).
6. Ne mets AUCUN emoji dans tes réponses (pas d'émoticônes du tout).
7. À la toute fin de ton message, ajoute une ligne spéciale contenant uniquement les IDs des plats recommandés au format exact suivant (sans autre texte sur cette ligne) : [RECOMMENDATIONS: [id1, id2, id3]]`;

    // 3. Make the API Call to Groq (Llama 3.3 70B reasoning model)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Groq API returned status ${response.status}`);
    }

    const result = await response.json();
    let reply = result.choices[0].message.content;

    // 4. Extract recommended product IDs
    let platsRecommandes = [];
    const match = reply.match(/\[RECOMMENDATIONS:\s*\[([\d,\s]*)\]\]/);
    if (match) {
      // Remove the system tag from the visible user reply
      reply = reply.replace(/\[RECOMMENDATIONS:\s*\[[\d,\s]*\]\]/, '').trim();
      const ids = match[1].split(',').map((id) => Number(id.trim())).filter((id) => !isNaN(id) && id > 0);
      platsRecommandes = products.filter((p) => ids.includes(p.id));
    }

    // Post-process plats tags formatting
    platsRecommandes.forEach(p => {
      p.tags = p.tags ? p.tags.split(",") : [];
    });

    res.json({
      reponse: reply,
      plats: platsRecommandes
    });

  } catch (err) {
    console.error("Groq AI Chat failed, falling back to regex logic:", err.message);
    discuterRegexFallback(message, res);
  }
}

// Fallback logic if Groq is not configured or fails
async function discuterRegexFallback(message, res) {
  const criteres = interpreter(message);
  const tags = tagsRequis(criteres.conditions);

  let sql = `
    SELECT p.id, p.name, p.description, p.price_fcfa, p.cuisine, p.image_url, p.nutritionist_validated,
           GROUP_CONCAT(DISTINCT t.tag) AS tags
      FROM products p
      LEFT JOIN product_health_tags t ON t.product_id = p.id
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
  for (const allergie of criteres.allergies) {
    sql += ` AND p.id NOT IN (SELECT product_id FROM product_allergens WHERE allergen = ?)`;
    params.push(allergie);
  }
  for (const tag of tags) {
    sql += ` AND p.id IN (SELECT product_id FROM product_health_tags WHERE tag = ?)`;
    params.push(tag);
  }

  sql += ` GROUP BY p.id ORDER BY p.nutritionist_validated DESC, p.price_fcfa ASC LIMIT 6`;

  try {
    const [rows] = await db.query(sql, params);
    rows.forEach(p => {
      p.tags = p.tags ? p.tags.split(",") : [];
    });

    res.json({
      reponse: formulerReponse(criteres, rows.length) + "\n\n(Note : L'assistant fonctionne en mode simplifié. Configurez la variable GROQ_API_KEY sur Railway pour activer l'intelligence artificielle.)",
      criteres,
      plats: rows
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: "Erreur de l'assistant" });
  }
}

module.exports = {
  discuter,
  interpreter
};