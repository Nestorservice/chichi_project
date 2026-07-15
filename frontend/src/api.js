// Client de l'API. Modifiez BASE si votre backend tourne ailleurs.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function mediaUrl(p) {
  if (!p) return null;
  return p.startsWith('http') ? p : BASE + p;
}

export function parseTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    return tags.replace(/[{}]/g, '').split(',').map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

async function json(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erreur || 'Erreur réseau');
  return data;
}

export function listerProduits({ conditions = [], allergies = [], cuisine = '' } = {}) {
  const p = new URLSearchParams();
  if (conditions.length) p.set('conditions', conditions.join(','));
  if (allergies.length) p.set('allergies', allergies.join(','));
  if (cuisine) p.set('cuisine', cuisine);
  return fetch(`${BASE}/api/products?${p.toString()}`).then(json);
}

export function detailProduit(id) {
  return fetch(`${BASE}/api/products/${id}`).then(json);
}

export function inscription(payload) {
  return fetch(`${BASE}/api/auth/inscription`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }).then(json);
}

export function connexion(payload) {
  return fetch(`${BASE}/api/auth/connexion`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }).then(json);
}

export function profil(token) {
  return fetch(`${BASE}/api/auth/profil`, { headers: { Authorization: `Bearer ${token}` } }).then(json);
}

export function mesCommandes(token) {
  return fetch(`${BASE}/api/orders`, { headers: { Authorization: `Bearer ${token}` } }).then(json);
}

export function passerCommande(token, payload) {
  return fetch(`${BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  }).then(json);
}

export function definirChoixLivraison(token, id, payload) {
  return fetch(`${BASE}/api/orders/${id}/delivery-location`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  }).then(json);
}

export function adminLister(token) {
  return fetch(`${BASE}/api/admin/products`, { headers: { Authorization: `Bearer ${token}` } }).then(json);
}

export function adminCreer(token, formData) {
  return fetch(`${BASE}/api/admin/products`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
  }).then(json);
}

export function adminModifier(token, id, formData) {
  return fetch(`${BASE}/api/admin/products/${id}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: formData,
  }).then(json);
}

export function adminSupprimer(token, id) {
  return fetch(`${BASE}/api/admin/products/${id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  }).then((r) => { if (!r.ok) throw new Error('Suppression impossible'); return true; });
}

export function adminListerCommandes(token) {
  return fetch(`${BASE}/api/admin/orders`, { headers: { Authorization: `Bearer ${token}` } }).then(json);
}

export function adminChangerStatutCommande(token, id, status) {
  return fetch(`${BASE}/api/admin/orders/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  }).then(json);
}

export function soumettreAvis(token, orderId, payload) {
  return fetch(`${BASE}/api/orders/${orderId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  }).then(json);
}

export function adminListerAvis(token) {
  return fetch(`${BASE}/api/admin/reviews`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(json);
}

export function discuter(message) {
  return fetch(`${BASE}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }),
  }).then(json);
}

export const TAG_LABELS = {
  diabetique_compatible: 'Diabète OK',
  hypertension_compatible: 'Tension OK',
  sportif: 'Sportif',
  riche_proteines: 'Protéines',
  minceur: 'Minceur',
  faible_calorie: 'Léger',
  vegetarien: 'Végétarien',
  vegan: 'Végan',
  sans_gluten: 'Sans gluten',
};
