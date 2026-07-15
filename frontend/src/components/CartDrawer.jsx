import React, { useState } from 'react';
import { passerCommande } from '../api.js';

const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA';

const PAIEMENTS = [
  ['mtn_momo', 'MTN Mobile Money'],
  ['orange_money', 'Orange Money'],
  ['a_la_livraison', 'À la livraison'],
];

export default function CartDrawer({ items, token, onClose, onQty, onRemove, onAfterOrder, onNeedAuth }) {
  const [adresse, setAdresse] = useState('');
  const [paiement, setPaiement] = useState('mtn_momo');
  const [erreur, setErreur] = useState('');
  const [ok, setOk] = useState(null);
  const [busy, setBusy] = useState(false);

  const total = items.reduce((s, it) => s + it.plat.price_fcfa * it.qty, 0);

  async function commander() {
    setErreur('');
    if (!token) { onNeedAuth(); return; }
    if (!adresse.trim()) { setErreur('Indiquez une adresse de livraison.'); return; }
    setBusy(true);
    try {
      const res = await passerCommande(token, {
        items: items.map((it) => ({ product_id: Number(it.plat.id), quantity: it.qty })),
        delivery_address: adresse,
        payment_method: paiement,
      });
      setOk(res.commande);
      onAfterOrder();
    } catch (e) {
      setErreur(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>Mon panier</h2>
          <button className="icon-btn" aria-label="Fermer" onClick={onClose}>×</button>
        </div>

        {ok ? (
          <div className="msg-ok">
            Commande #{ok.id} enregistrée. Total&nbsp;: {fmt(ok.total_fcfa)}.<br />
            Statut&nbsp;: {ok.status.replace('_', ' ')}.
          </div>
        ) : items.length === 0 ? (
          <p className="note">Votre panier est vide. Ajoutez des plats depuis le catalogue.</p>
        ) : (
          <>
            {items.map((it) => (
              <div className="cart-item" key={it.plat.id}>
                <div>
                  <div className="ci-name">{it.plat.name}</div>
                  <div className="ci-price">{fmt(it.plat.price_fcfa)}</div>
                </div>
                <div className="qty">
                  <button aria-label="Retirer un" onClick={() => onQty(it.plat.id, -1)}>−</button>
                  <span>{it.qty}</span>
                  <button aria-label="Ajouter un" onClick={() => onQty(it.plat.id, 1)}>+</button>
                  <button aria-label="Supprimer" onClick={() => onRemove(it.plat.id)} style={{ marginLeft: 4 }}>×</button>
                </div>
              </div>
            ))}

            <div className="cart-total"><span>Total</span><span>{fmt(total)}</span></div>

            <div className="field">
              <label>Adresse de livraison</label>
              <textarea rows={2} value={adresse} onChange={(e) => setAdresse(e.target.value)}
                placeholder="Quartier, repère, ville" />
            </div>
            <div className="field">
              <label>Mode de paiement</label>
              <select value={paiement} onChange={(e) => setPaiement(e.target.value)}>
                {PAIEMENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            {erreur && <div className="msg-error">{erreur}</div>}
            {!token && <p className="note">Connectez-vous pour finaliser votre commande.</p>}

            <button className="btn btn-spice" disabled={busy} onClick={commander}>
              {busy ? 'Envoi…' : token ? 'Commander' : 'Se connecter pour commander'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
