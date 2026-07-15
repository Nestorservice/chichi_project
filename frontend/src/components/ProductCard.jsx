import React from 'react';
import { parseTags, TAG_LABELS, mediaUrl } from '../api.js';

const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA';

const HEALTH = new Set(['diabetique_compatible', 'hypertension_compatible']);

export default function ProductCard({ plat, onAdd }) {
  const tags = parseTags(plat.tags);
  const initiale = (plat.name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="card">
      <div className="card-img">
        {plat.image_url
          ? <img className="card-photo" src={mediaUrl(plat.image_url)} alt={plat.name} />
          : initiale}
        {plat.nutritionist_validated && (
          <span className="card-validated">✓ validé nutritionniste</span>
        )}
      </div>
      <div className="card-body">
        <div className="card-name">{plat.name}</div>
        <div className="card-desc">{plat.description}</div>
        <div className="badges">
          {tags.slice(0, 4).map((t) => (
            <span key={t} className={'badge' + (HEALTH.has(t) ? ' health' : '')}>
              {TAG_LABELS[t] || t}
            </span>
          ))}
        </div>
        <div className="card-foot">
          <span className="price">{fmt(plat.price_fcfa)}</span>
          <button className="add-btn" aria-label={'Ajouter ' + plat.name} onClick={() => onAdd(plat)}>
            +
          </button>
        </div>
      </div>
    </div>
  );
}
