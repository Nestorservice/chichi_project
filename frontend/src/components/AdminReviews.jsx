import React, { useEffect, useState } from 'react';
import { adminListerAvis } from '../api.js';

export default function AdminReviews({ token }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadReviews() {
      try {
        const data = await adminListerAvis(token);
        setReviews(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadReviews();
  }, [token]);

  // Listen for real-time review SSE updates
  useEffect(() => {
    const handleNewReview = (e) => {
      const { review } = e.detail;
      setReviews((prev) => {
        // Prevent duplicate appending
        if (prev.some((r) => r.id === review.id)) return prev;
        return [review, ...prev];
      });
    };
    window.addEventListener('admin-new-review', handleNewReview);
    return () => window.removeEventListener('admin-new-review', handleNewReview);
  }, []);

  const getStats = () => {
    if (reviews.length === 0) return { avg: 0, count: 0, distribution: [0, 0, 0, 0, 0] };
    const sum = reviews.reduce((acc, r) => acc + r.app_rating, 0);
    const avg = (sum / reviews.length).toFixed(1);
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      const idx = Math.min(5, Math.max(1, r.app_rating)) - 1;
      dist[idx]++;
    });
    return { avg, count: reviews.length, distribution: dist.reverse() };
  };

  const stats = getStats();

  const renderStars = (rating, size = 16) => {
    return (
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= rating;
          return (
            <svg
              key={star}
              xmlns="http://www.w3.org/2000/svg"
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={isFilled ? 'var(--spice)' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: isFilled ? 'var(--spice)' : 'rgba(28, 26, 22, 0.18)' }}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="loading">Chargement des avis et suggestions...</div>;
  if (error) return <div className="msg-error" style={{ margin: 24 }}>{error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Summary Cards */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Rating Average Card */}
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#fdf2e2', color: 'var(--spice)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Note Moyenne</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="stat-value">{stats.avg}</span>
              <span className="note" style={{ fontSize: 14 }}>/ 5.0</span>
            </div>
            {renderStars(Math.round(stats.avg), 18)}
          </div>
        </div>

        {/* Count Card */}
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Total des avis</span>
            <span className="stat-value">{stats.count}</span>
            <span className="note">Retours d'expérience clients</span>
          </div>
        </div>

        {/* Distribution Card */}
        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
          <span className="stat-label" style={{ marginBottom: 4 }}>Répartition des notes</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {stats.distribution.map((count, i) => {
              const stars = 5 - i;
              const percent = stats.count > 0 ? (count / stats.count) * 100 : 0;
              return (
                <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <span style={{ width: 10, fontWeight: 'bold' }}>{stars}</span>
                  <div style={{ flex: 1, height: 6, background: '#f0ede6', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: 'var(--spice)', borderRadius: 99 }}></div>
                  </div>
                  <span style={{ width: 24, color: 'var(--muted)', textAlign: 'right' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reviews feed grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: 18, color: 'var(--green-deep)', margin: '8px 0 0 0' }}>Flux des avis clients</h3>
        
        {reviews.length === 0 ? (
          <div className="admin-card" style={{ textAlign: 'center', padding: 40 }}>
            <p className="note">Aucun avis client n'a été enregistré pour le moment.</p>
          </div>
        ) : (
          reviews.map((rev) => (
            <div className="admin-card" key={rev.id} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 15, color: 'var(--ink)' }}>{rev.customer_name}</strong>
                    <span className="note" style={{ fontSize: 11 }}>· Commande #{rev.order_id}</span>
                  </div>
                  <span className="note" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                    Publié le {new Date(rev.created_at).toLocaleDateString('fr-FR')} à {new Date(rev.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>{renderStars(rev.app_rating, 18)}</div>
              </div>

              {/* Suggestions */}
              {rev.suggestions ? (
                <div style={{ background: '#faf9f6', padding: 14, borderRadius: 10, border: '1px solid rgba(28,26,22,0.04)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                    Suggestion client
                  </span>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--ink)', fontStyle: 'italic', lineHeight: 1.5 }}>
                    "{rev.suggestions}"
                  </p>
                </div>
              ) : (
                <span className="note" style={{ fontStyle: 'italic' }}>Aucune suggestion textuelle fournie.</span>
              )}

              {/* Product reviews list */}
              {rev.product_ratings && rev.product_ratings.length > 0 && (
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                    Notes des plats commandés
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {rev.product_ratings.map((pr, idx) => (
                      <div 
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 12px',
                          background: 'var(--green-soft)',
                          borderRadius: 99,
                          border: '1px solid rgba(21,96,74,0.06)'
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-deep)' }}>
                          {pr.product_name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--spice)' }}>{pr.rating}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--spice)' }}>
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
