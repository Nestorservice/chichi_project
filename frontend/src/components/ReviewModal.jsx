import React, { useState } from 'react';
import { soumettreAvis } from '../api.js';

export default function ReviewModal({ order, token, onClose, onSuccess }) {
  const [appRating, setAppRating] = useState(5);
  const [suggestions, setSuggestions] = useState('');
  const [productRatings, setProductRatings] = useState(
    order.items.reduce((acc, item) => {
      acc[item.product_id] = 5;
      return acc;
    }, {})
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setProductRating = (productId, rating) => {
    setProductRatings({
      ...productRatings,
      [productId]: rating
    });
  };

  const handleAppRating = (rating) => {
    setAppRating(rating);
  };

  async function handleSubmit() {
    setBusy(true);
    setError('');

    const formattedProductRatings = Object.entries(productRatings).map(([productId, rating]) => ({
      product_id: Number(productId),
      rating
    }));

    try {
      await soumettreAvis(token, order.id, {
        app_rating: appRating,
        suggestions,
        product_ratings: formattedProductRatings
      });
      onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const renderStars = (currentRating, onRate) => {
    return (
      <div style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= currentRating;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onRate(star)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 4,
                cursor: 'pointer',
                color: isFilled ? 'var(--spice)' : 'rgba(28, 26, 22, 0.18)',
                transition: 'transform 0.1s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill={isFilled ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="overlay center" onClick={onClose}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: 480, 
          background: 'rgba(250, 246, 239, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          borderRadius: 20,
          boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}
      >
        <div className="modal-head">
          <h2>Évaluez votre commande #{order.id}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        {error && <div className="msg-error">{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '60vh', overflowY: 'auto', paddingRight: 6 }}>
          {/* App Rating */}
          <div style={{ borderBottom: '1px solid rgba(28,26,22,0.06)', paddingBottom: 14 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--green-deep)' }}>Note générale du service</label>
            {renderStars(appRating, handleAppRating)}
          </div>

          {/* Product Ratings */}
          <div style={{ borderBottom: '1px solid rgba(28,26,22,0.06)', paddingBottom: 14 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--green-deep)', marginBottom: 8, display: 'block' }}>
              Notez les plats commandés
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {order.items.map((item) => (
                <div key={item.product_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(28,26,22,0.04)' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', maxWidth: '50%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  {renderStars(productRatings[item.product_id] || 5, (rating) => setProductRating(item.product_id, rating))}
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          <div className="field">
            <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--green-deep)' }}>Suggestions d'amélioration</label>
            <textarea
              placeholder="Un conseil, une suggestion ou une remarque ? Écrivez-nous..."
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              rows="3"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--line-strong)',
                background: '#fff',
                fontSize: 14,
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button 
            className="btn" 
            style={{ flex: 1, borderRadius: 12 }} 
            onClick={onClose}
            disabled={busy}
          >
            Annuler
          </button>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, borderRadius: 12 }} 
            onClick={handleSubmit}
            disabled={busy}
          >
            {busy ? 'Envoi...' : 'Envoyer mon avis'}
          </button>
        </div>
      </div>
    </div>
  );
}
