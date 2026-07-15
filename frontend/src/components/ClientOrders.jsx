import React, { useState } from 'react';
import ReviewModal from './ReviewModal.jsx';

const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA';

const STATUT_LABELS = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  en_preparation: 'En préparation',
  en_livraison: 'En livraison',
  livree: 'Livrée',
  annulee: 'Annulée'
};

const ETAPES = [
  { key: 'en_attente', label: 'En attente', desc: 'Reçue par le restaurant', number: 1 },
  { key: 'confirmee', label: 'Confirmée', desc: 'Validée par le chef', number: 2 },
  { key: 'en_preparation', label: 'En cuisine', desc: 'Préparation de vos plats', number: 3 },
  { key: 'en_livraison', label: 'En livraison', desc: 'En route vers votre adresse', number: 4 },
  { key: 'livree', label: 'Livrée', desc: 'Bon appétit !', number: 5 }
];

export default function ClientOrders({ orders, onBack, token, onRefresh }) {
  const [reviewOrder, setReviewOrder] = useState(null);
  
  // Helper to determine the status of a step relative to the current order status
  const getStepState = (currentStatus, stepKey) => {
    if (currentStatus === 'annulee') return 'cancelled';
    
    const currentIndex = ETAPES.findIndex(e => e.key === currentStatus);
    const stepIndex = ETAPES.findIndex(e => e.key === stepKey);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'upcoming';
  };

  return (
    <div className="client-orders-view">
      <div className="admin-main-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ color: 'var(--green-deep)', fontSize: 30, fontWeight: 800 }}>Suivi de vos commandes</h1>
          <p className="note" style={{ marginTop: 4 }}>Suivez la préparation et la livraison de vos plats en temps réel.</p>
        </div>
        <button className="btn" onClick={onBack}>← Retour au menu</button>
      </div>

      <div className="client-orders-list" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {orders.map((o) => {
          const currentStepIndex = ETAPES.findIndex(e => e.key === o.status);
          
          return (
            <div className="admin-card" key={o.id} style={{ padding: 24, borderRadius: 16 }}>
              {/* Order Header info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 16, marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, color: 'var(--green-deep)' }}>
                    Commande <span style={{ fontFamily: 'monospace' }}>#{o.id}</span>
                  </h3>
                  <span className="note">
                    Passée le {new Date(o.created_at).toLocaleDateString('fr-FR')} à {new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>Statut actuel :</span>
                  <span className={`status-pill ${o.status === 'annulee' ? 'annulee' : 'confirmee'}`} style={{ fontSize: 11, padding: '4px 10px' }}>
                    {STATUT_LABELS[o.status] || o.status}
                  </span>
                  {o.status === 'livree' && (
                    o.has_review ? (
                      <span className="badge health" style={{ fontSize: 12, padding: '4px 10px', borderRadius: 99 }}>
                        Évaluée
                      </span>
                    ) : (
                      <button 
                        className="btn btn-primary"
                        onClick={() => setReviewOrder(o)}
                        style={{ 
                          fontSize: 12, 
                          padding: '6px 12px', 
                          background: 'var(--spice)', 
                          borderColor: 'var(--spice)',
                          color: '#fff'
                        }}
                      >
                        Évaluer la commande
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Order Tracking Timeline ("Tree") */}
              {o.status === 'annulee' ? (
                <div style={{ background: '#fdf2f2', border: '1px solid #fde2e2', borderRadius: 12, padding: 14, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 20px' }}>
                  <span style={{ fontSize: 16, fontWeight: 'bold', border: '2px solid #b91c1c', width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', lineHeight: 1 }}>X</span>
                  <div>
                    <strong style={{ fontSize: 14 }}>Commande annulée</strong>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>Cette commande a été annulée. Contactez le restaurant pour plus de détails.</div>
                  </div>
                </div>
              ) : (
                <div className="timeline-container" style={{ margin: '12px 0 28px' }}>
                  <div className="timeline-progress-bar" style={{ 
                    position: 'relative', 
                    height: 4, 
                    background: '#e5e7eb', 
                    borderRadius: 2, 
                    top: 24, 
                    margin: '0 40px',
                    zIndex: 1
                  }}>
                    {/* Active highlighted line */}
                    <div style={{ 
                      height: '100%', 
                      background: 'var(--green)', 
                      width: `${(currentStepIndex / (ETAPES.length - 1)) * 100}%`,
                      transition: 'width 0.5s ease-in-out'
                    }}></div>
                  </div>

                  <div className="timeline" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
                    {ETAPES.map((step) => {
                      const state = getStepState(o.status, step.key);
                      
                      return (
                        <div className="timeline-step" key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, textAlign: 'center' }}>
                          {/* Circle Node */}
                          <div 
                            className={`step-circle ${state}`}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: '50%',
                              background: state === 'completed' ? 'var(--green)' : state === 'active' ? 'var(--spice)' : '#f3f4f6',
                              color: state === 'completed' || state === 'active' ? '#fff' : '#9ca3af',
                              border: state === 'active' ? '4px solid var(--spice-soft)' : '1px solid rgba(0,0,0,0.06)',
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: 14,
                              fontWeight: '700',
                              boxShadow: state === 'active' ? '0 0 15px rgba(217, 135, 15, 0.4)' : 'none',
                              transition: 'all 0.3s ease',
                              cursor: 'default'
                            }}
                          >
                            {state === 'completed' ? '✓' : step.number}
                          </div>
                          
                          {/* Label info */}
                          <div style={{ marginTop: 8, padding: '0 4px' }}>
                            <div style={{ 
                              fontSize: 13, 
                              fontWeight: state === 'active' ? '700' : '600', 
                              color: state === 'active' ? 'var(--spice)' : state === 'completed' ? 'var(--green-deep)' : 'var(--muted)'
                            }}>
                              {step.label}
                            </div>
                            <div className="note" style={{ fontSize: 10, marginTop: 2, display: 'block', maxWidth: 100, marginLeft: 'auto', marginRight: 'auto' }}>
                              {step.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Order Items & Summary */}
              <div className="order-details-grid" style={{ background: '#faf9f6', padding: 18, borderRadius: 12, border: '1px solid rgba(28, 26, 22, 0.05)' }}>
                <div className="order-details-col">
                  <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Plats commandés
                  </h4>
                  <div className="order-items-list">
                    {o.items.map((item, idx) => (
                      <div className="order-item-row" key={idx} style={{ fontSize: 14 }}>
                        <span>
                          <strong style={{ color: 'var(--green)' }}>{item.quantity}x</strong> {item.name}
                        </span>
                        <span style={{ fontWeight: 600 }}>{fmt(item.unit_price_fcfa * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="order-item-row" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 8, fontWeight: 700, marginTop: 4 }}>
                      <span>Total réglé</span>
                      <span style={{ color: 'var(--green-deep)' }}>{fmt(o.total_fcfa)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="order-details-col">
                  <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Informations de Livraison
                  </h4>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--ink)' }}>
                    <strong>Adresse :</strong> {o.delivery_address} <br/>
                    <strong>Paiement :</strong> <span style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 600 }}>{o.payment_method.replace(/_/g, ' ')}</span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {orders.length === 0 && (
          <div className="empty" style={{ margin: '40px 0' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted)', marginBottom: 12 }}>
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <h2>Aucune commande trouvée</h2>
            <p>Vous n'avez pas encore passé de commande sur notre plateforme. Rendez-vous sur le catalogue pour faire votre choix !</p>
            <button className="btn btn-primary" onClick={onBack} style={{ marginTop: 12 }}>Voir le menu</button>
          </div>
        )}
      </div>

      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          token={token}
          onClose={() => setReviewOrder(null)}
          onSuccess={() => {
            setReviewOrder(null);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
