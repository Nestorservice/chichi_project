'use strict';
// Test du moteur de filtrage — exécutable sans base de données : `npm test`
const { deriverTagsSante, tagsRequis } = require('../src/healthEngine');

let echecs = 0;
function verifier(condition, message) {
  if (condition) { console.log('  OK    ', message); }
  else { console.error('  ÉCHEC ', message); echecs++; }
}

console.log('Plat 1 — Ndolè aux crevettes (allégé) :');
const ndole = deriverTagsSante(
  { glycemic_index: 40, sugars_g: 5, calories_kcal: 350, protein_g: 25, sodium_mg: 420 },
  { isVegetarian: false });
verifier(ndole.includes('diabetique_compatible'), 'compatible diabétique');
verifier(ndole.includes('sportif'),               'sportif (protéines)');
verifier(ndole.includes('minceur'),               'minceur (calories)');
verifier(ndole.includes('hypertension_compatible'),'hypertension OK');

console.log('Plat 2 — Burger maison (riche, salé, sucré) :');
const burger = deriverTagsSante(
  { glycemic_index: 72, sugars_g: 16, calories_kcal: 820, protein_g: 30, sodium_mg: 1050 }, {});
verifier(!burger.includes('diabetique_compatible'), 'NON compatible diabétique');
verifier(!burger.includes('minceur'),               'NON minceur');
verifier(burger.includes('sportif'),                'sportif (protéines élevées)');
verifier(!burger.includes('hypertension_compatible'),'NON hypertension');

console.log('Plat 3 — Salade végane sans gluten :');
const salade = deriverTagsSante(
  { glycemic_index: 30, sugars_g: 7, calories_kcal: 210, protein_g: 9, sodium_mg: 280 },
  { isVegan: true, isGlutenFree: true });
verifier(salade.includes('vegan') && salade.includes('vegetarien'), 'végane + végétarienne');
verifier(salade.includes('sans_gluten'),                           'sans gluten');
verifier(salade.includes('diabetique_compatible'),                 'compatible diabétique');

console.log('Mapping conditions -> tags :');
verifier(
  JSON.stringify(tagsRequis(['diabetique', 'sportif'])) ===
  JSON.stringify(['diabetique_compatible', 'sportif']),
  "['diabetique','sportif'] -> ['diabetique_compatible','sportif']");

console.log(echecs === 0 ? '\nTous les tests passent.' : `\n${echecs} test(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
