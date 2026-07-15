import React from 'react';

const CONDITIONS = [
  ['diabetique', 'Diabétique'],
  ['sportif', 'Sportif'],
  ['minceur', 'Minceur'],
  ['hypertension', 'Hypertension'],
  ['vegetarien', 'Végétarien'],
  ['vegan', 'Végan'],
  ['sans_gluten', 'Sans gluten'],
];

const CUISINES = [
  ['', 'Toutes les cuisines'],
  ['camerounais', 'Camerounais'],
  ['fastfood', 'Fast-food'],
  ['boisson', 'Boissons'],
  ['dessert', 'Desserts'],
];

export default function FilterBar({ conditions, onToggle, cuisine, onCuisine }) {
  return (
    <div className="filters">
      <div className="filters-inner">
        <span className="filters-label">Mon profil&nbsp;:</span>
        {CONDITIONS.map(([val, label]) => (
          <button
            key={val}
            className={'chip' + (conditions.includes(val) ? ' on' : '')}
            onClick={() => onToggle(val)}
          >
            {label}
          </button>
        ))}
        <select className="select" value={cuisine} onChange={(e) => onCuisine(e.target.value)}>
          {CUISINES.map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
