import React, { useState } from 'react';
import { connexion, inscription } from '../api.js';

const CONDITIONS = [
  ['diabetique', 'Diabétique'], ['sportif', 'Sportif'], ['minceur', 'Minceur'],
  ['hypertension', 'Hypertension'], ['vegetarien', 'Végétarien'], ['vegan', 'Végan'], ['sans_gluten', 'Sans gluten'],
];
const ALLERGENS = [
  ['arachide', 'Arachide'], ['gluten', 'Gluten'], ['lactose', 'Lactose'], ['oeuf', 'Œuf'],
  ['poisson', 'Poisson'], ['fruits_de_mer', 'Fruits de mer'], ['soja', 'Soja'], ['porc', 'Porc'],
];

export default function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState('connexion');
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '', admin_secret: '' });
  const [conditions, setConditions] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [isAdminRegister, setIsAdminRegister] = useState(false);
  const [erreur, setErreur] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggle = (list, setList, v) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function submit() {
    setErreur('');
    setBusy(true);
    
    // Nettoyer les espaces superflus des entrées
    const cleanPhone = form.phone.trim();
    const cleanPassword = form.password.trim();

    try {
      const payload = {
        full_name: form.full_name,
        phone: cleanPhone,
        email: form.email,
        password: cleanPassword,
        conditions,
        allergies,
      };
      if (isAdminRegister) {
        payload.devenir_admin = true;
        payload.admin_secret = form.admin_secret;
      }

      const res =
        mode === 'connexion'
          ? await connexion({ phone: cleanPhone, password: cleanPassword })
          : await inscription(payload);
      onAuth(res.token, res.utilisateur, conditions, allergies);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay center" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{mode === 'connexion' ? 'Connexion' : 'Créer un compte'}</h2>
          <button className="icon-btn" aria-label="Fermer" onClick={onClose}>×</button>
        </div>

        <div className="tabs">
          <button className={mode === 'connexion' ? 'on' : ''} onClick={() => setMode('connexion')}>Connexion</button>
          <button className={mode === 'inscription' ? 'on' : ''} onClick={() => setMode('inscription')}>Inscription</button>
        </div>

        {erreur && <div className="msg-error">{erreur}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          {mode === 'inscription' && (
            <div className="field">
              <label>Nom complet</label>
              <input className="input" value={form.full_name} onChange={set('full_name')} />
            </div>
          )}
          <div className="field">
            <label>Téléphone</label>
            <input className="input" value={form.phone} onChange={set('phone')} placeholder="6XXXXXXXX" />
          </div>
          {mode === 'inscription' && (
            <div className="field">
              <label>Email (optionnel)</label>
              <input className="input" value={form.email} onChange={set('email')} />
            </div>
          )}
          <div className="field">
            <label>Mot de passe</label>
            <input className="input" type="password" value={form.password} onChange={set('password')} />
          </div>

          {mode === 'inscription' && (
            <div className="field-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 4 }}>
              <input type="checkbox" id="admin-reg-check" checked={isAdminRegister} onChange={(e) => setIsAdminRegister(e.target.checked)} />
              <label htmlFor="admin-reg-check" style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}>S'inscrire en tant qu'administrateur</label>
            </div>
          )}

          {mode === 'inscription' && isAdminRegister && (
            <div className="field">
              <label>Code secret administrateur</label>
              <input className="input" type="password" value={form.admin_secret} onChange={set('admin_secret')} placeholder="Code de sécurité admin" />
            </div>
          )}

          {mode === 'inscription' && (
            <>
              <div className="field">
                <label>Mon profil santé (filtre automatique)</label>
                <div className="pickgroup">
                  {CONDITIONS.map(([v, l]) => (
                    <button key={v} className={'pick' + (conditions.includes(v) ? ' on' : '')}
                      onClick={() => toggle(conditions, setConditions, v)}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Mes allergies (à exclure)</label>
                <div className="pickgroup">
                  {ALLERGENS.map(([v, l]) => (
                    <button key={v} className={'pick' + (allergies.includes(v) ? ' on' : '')}
                      onClick={() => toggle(allergies, setAllergies, v)}>{l}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          <button className="btn btn-primary" disabled={busy} onClick={submit} style={{ marginTop: 6 }}>
            {busy ? 'Patientez…' : mode === 'connexion' ? 'Se connecter' : "S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  );
}
