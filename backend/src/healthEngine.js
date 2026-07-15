'use strict';

// =====================================================================
//  MOTEUR DE FILTRAGE SANTÉ — cœur de la plateforme
//
//  L'admin saisit les VALEURS NUTRITIONNELLES d'un plat ; le moteur en
//  DÉDUIT automatiquement les tags de compatibilité santé. On évite ainsi
//  toute saisie manuelle erronée et le filtrage reste cohérent.
//
//  /!\ Les seuils ci-dessous sont des valeurs de DÉPART. Ils DOIVENT être
//      validés par un(e) nutritionniste avant la mise en production.
//      Ils sont regroupés ici pour être faciles à ajuster.
// =====================================================================

const SEUILS = {
  DIABETE_IG_MAX: 55,            // index glycémique considéré comme bas
  DIABETE_SUCRES_MAX: 10,        // g de sucres / portion
  MINCEUR_CALORIES_MAX: 400,     // kcal / portion
  PROTEINES_MIN: 20,             // g / portion (sportif)
  HYPERTENSION_SODIUM_MAX: 500,  // mg / portion
};

/**
 * Déduit l'ensemble des tags santé d'un plat à partir de sa nutrition
 * et de ses indicateurs de régime.
 * @param {object} nutrition  valeurs nutritionnelles par portion
 * @param {object} flags      { isVegetarian, isVegan, isGlutenFree }
 * @returns {string[]} tags (valeurs de l'enum health_tag)
 */
function deriverTagsSante(nutrition = {}, flags = {}) {
  const tags = new Set();
  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

  const ig       = num(nutrition.glycemic_index);
  const sucres   = num(nutrition.sugars_g);
  const calories = num(nutrition.calories_kcal);
  const proteine = num(nutrition.protein_g);
  const sodium   = num(nutrition.sodium_mg);

  // Diabétique : index glycémique bas ET sucres limités
  if (ig !== null && sucres !== null &&
      ig <= SEUILS.DIABETE_IG_MAX && sucres <= SEUILS.DIABETE_SUCRES_MAX) {
    tags.add('diabetique_compatible');
  }

  // Minceur / faible calorie
  if (calories !== null && calories <= SEUILS.MINCEUR_CALORIES_MAX) {
    tags.add('faible_calorie');
    tags.add('minceur');
  }

  // Sportif / riche en protéines
  if (proteine !== null && proteine >= SEUILS.PROTEINES_MIN) {
    tags.add('riche_proteines');
    tags.add('sportif');
  }

  // Hypertension : sodium limité
  if (sodium !== null && sodium <= SEUILS.HYPERTENSION_SODIUM_MAX) {
    tags.add('hypertension_compatible');
  }

  // Régimes (saisis par l'admin)
  if (flags.isVegan) {
    tags.add('vegan');
    tags.add('vegetarien');   // végan implique végétarien
  } else if (flags.isVegetarian) {
    tags.add('vegetarien');
  }
  if (flags.isGlutenFree) {
    tags.add('sans_gluten');
  }

  return [...tags];
}

// Correspondance condition utilisateur -> tag requis pour le filtrage
const CONDITION_VERS_TAG = {
  diabetique:  'diabetique_compatible',
  sportif:     'sportif',
  minceur:     'minceur',
  hypertension:'hypertension_compatible',
  vegetarien:  'vegetarien',
  vegan:       'vegan',
  sans_gluten: 'sans_gluten',
};

function tagsRequis(conditions = []) {
  return conditions.map((c) => CONDITION_VERS_TAG[c]).filter(Boolean);
}

module.exports = { SEUILS, deriverTagsSante, CONDITION_VERS_TAG, tagsRequis };
