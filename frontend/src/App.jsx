import React, { useEffect, useState, useCallback, useRef } from 'react';
import { listerProduits, profil, mesCommandes } from './api.js';
import FilterBar from './components/FilterBar.jsx';
import ProductCard from './components/ProductCard.jsx';
import AuthModal from './components/AuthModal.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import ChatBubble from './components/ChatBubble.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import ClientOrders from './components/ClientOrders.jsx';
import LocationPromptModal from './components/LocationPromptModal.jsx';

const HERO_IMAGES = [
  '/images/poulet dg.jpg',
  '/images/ndole.jpg',
  '/images/eru.jpg',
  '/images/poisson braiser.jpg',
  '/images/taro.jpg'
];

export default function App() {
  const [plats, setPlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [conditions, setConditions] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [cuisine, setCuisine] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 10000);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) {
      const dismissed = sessionStorage.getItem('pwa_ios_dismissed');
      if (!dismissed) {
        setShowIosPrompt(true);
      }
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));

  const [cart, setCart] = useState([]);
  const [showAuth, setShowAuth] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [vue, setVue] = useState('catalogue');

  const [clientOrders, setClientOrders] = useState([]);
  const [toasts, setToasts] = useState([]);
  const clientOrdersRef = useRef([]);
  const [userCoords, setUserCoords] = useState(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        (err) => {
          console.warn("Location permission not granted initially.");
        }
      );
    }
  }, []);

  const STATUT_LABELS = {
    en_attente: 'En attente',
    confirmee: 'Confirmée',
    en_preparation: 'En préparation',
    en_livraison: 'En livraison',
    livree: 'Livrée',
    annulee: 'Annulée'
  };

  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playNote = (freq, start, duration, volume) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        
        gainNode.gain.setValueAtTime(volume, start);
        gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = ctx.currentTime;
      playNote(587.33, now, 0.4, 0.08); // D5
      playNote(880.00, now + 0.12, 0.6, 0.12); // A5
    } catch (e) {
      console.warn("Web Audio chime failed:", e);
    }
  }, []);

  const addToast = useCallback((msg) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 6000);
  }, []);

  // 1. Real-time Stream SSE Connection
  useEffect(() => {
    if (!token) return;

    const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const streamUrl = `${BASE}/api/orders/stream?token=${token}`;
    let eventSource;

    try {
      eventSource = new EventSource(streamUrl);

      eventSource.onmessage = (e) => {
        if (e.data === 'ping') return;
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'order_update') {
            const { orderId, status, updatedOrder } = data;
            
            // Instantly play sound and update views!
            playChime();

            setClientOrders((prev) => {
              return prev.map((o) => {
                if (o.id === orderId) {
                  return updatedOrder ? { ...o, ...updatedOrder } : { ...o, status };
                }
                return o;
              });
            });
            
            if (clientOrdersRef.current) {
              clientOrdersRef.current = clientOrdersRef.current.map((o) => {
                if (o.id === orderId) {
                  return updatedOrder ? { ...o, ...updatedOrder } : { ...o, status };
                }
                return o;
              });
            }

            const statusLabel = STATUT_LABELS[status] || status;
            const msg = `Commande #${orderId} : ${statusLabel}`;
            addToast(msg);

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Commande #${orderId} mise à jour`, {
                body: `Votre commande est désormais : ${statusLabel}`,
              });
            }
          } else if (data.type === 'admin_order_update') {
            const { orderId, updatedOrder } = data;
            const event = new CustomEvent('admin-order-update', { detail: { orderId, updatedOrder } });
            window.dispatchEvent(event);
          } else if (data.type === 'admin_new_order') {
            const { orderId, orderRows } = data;
            playChime();
            const event = new CustomEvent('admin-new-order', { detail: { orderId, orderRows } });
            window.dispatchEvent(event);
            addToast(`Nouvelle commande reçue : #${orderId} !`);
          } else if (data.type === 'new_review') {
            const { review } = data;
            const event = new CustomEvent('admin-new-review', { detail: { review } });
            window.dispatchEvent(event);
            addToast(`Nouvel avis reçu de ${review.customer_name} : ${review.app_rating}/5`);
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.warn("SSE disconnected, polling fallback is active.");
        eventSource.close();
      };
    } catch (err) {
      console.error("SSE error:", err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [token, playChime, addToast]);

  const triggerRefreshClientOrders = useCallback(async () => {
    if (!token) {
      setClientOrders([]);
      clientOrdersRef.current = [];
      return;
    }
    try {
      const res = await mesCommandes(token);
      const map = {};
      res.forEach((r) => {
        if (!map[r.id]) {
          map[r.id] = {
            id: r.id,
            status: r.status,
            total_fcfa: r.total_fcfa,
            delivery_address: r.delivery_address,
            payment_method: r.payment_method,
            created_at: r.created_at,
            latitude: r.latitude,
            longitude: r.longitude,
            delivery_choice_made: r.delivery_choice_made,
            has_review: r.has_review,
            items: [],
          };
        }
        if (r.name) {
          map[r.id].items.push({
            name: r.name,
            quantity: r.quantity,
            unit_price_fcfa: r.unit_price_fcfa,
            product_id: r.product_id,
          });
        }
      });
      const grouped = Object.values(map).sort((a, b) => b.id - a.id);

      const prevOrders = clientOrdersRef.current;
      if (prevOrders.length > 0) {
        let hasChanged = false;
        grouped.forEach((newOrder) => {
          const oldOrder = prevOrders.find((o) => o.id === newOrder.id);
          if (oldOrder && oldOrder.status !== newOrder.status) {
            hasChanged = true;
            const statusLabel = STATUT_LABELS[newOrder.status] || newOrder.status;
            const msg = `Commande #${newOrder.id} : ${statusLabel}`;
            addToast(msg);
            
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Commande #${newOrder.id} mise à jour`, {
                body: `Votre commande est désormais : ${statusLabel}`,
              });
            }
          }
        });
        if (hasChanged) {
          playChime();
        }
      }
      
      clientOrdersRef.current = grouped;
      setClientOrders(grouped);
    } catch (err) {
      console.error(err);
    }
  }, [token, playChime, addToast]);

  // 2. Polling Fallback (Runs every 15s to guarantee updates)
  useEffect(() => {
    if (!token) return;

    triggerRefreshClientOrders();
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const interval = setInterval(triggerRefreshClientOrders, 15000);
    return () => clearInterval(interval);
  }, [token, triggerRefreshClientOrders]);

  useEffect(() => {
    if (!token) return;
    profil(token)
      .then((p) => { setConditions(p.conditions || []); setAllergies(p.allergies || []); })
      .catch(() => {});
  }, [token]);

  const charger = useCallback(() => {
    setLoading(true);
    listerProduits({ conditions, allergies, cuisine })
      .then((d) => setPlats(d.plats || []))
      .catch(() => setPlats([]))
      .finally(() => setLoading(false));
  }, [conditions, allergies, cuisine]);

  useEffect(() => { charger(); }, [charger]);

  const toggleCondition = (v) =>
    setConditions((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]));

  const ajouter = (plat) =>
    setCart((c) => {
      const ex = c.find((it) => it.plat.id === plat.id);
      if (ex) return c.map((it) => (it.plat.id === plat.id ? { ...it, qty: it.qty + 1 } : it));
      return [...c, { plat, qty: 1 }];
    });
  const changerQty = (id, d) =>
    setCart((c) =>
      c.map((it) => (it.plat.id === id ? { ...it, qty: Math.max(1, it.qty + d) } : it)));
  const retirer = (id) => setCart((c) => c.filter((it) => it.plat.id !== id));

  const nbPanier = cart.reduce((s, it) => s + it.qty, 0);

  function onAuth(tk, usr, conds, allergs) {
    localStorage.setItem('token', tk);
    localStorage.setItem('user', JSON.stringify(usr));
    setToken(tk);
    setUser(usr);
    if (conds && conds.length) setConditions(conds);
    if (allergs && allergs.length) setAllergies(allergs);
    setShowAuth(false);
  }
  function deconnexion() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  }

  const filteredPlats = plats.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeLocationPromptOrder = clientOrders.find(
    (o) => o.status === 'en_livraison' && !o.delivery_choice_made
  );

  return (
    <>
      {vue !== 'admin' && (
        <header className="header">
          <div className="brand">
            <div className="mark">M</div>
            <div>
              <div className="name">Mboa</div>
              <div className="tag">manger bon, manger juste</div>
            </div>
          </div>
          <div className="header-actions">
            {user ? (
              <>
                <span className="note" style={{ marginRight: 4 }}>Bonjour {user.full_name?.split(' ')[0]}</span>
                <button className="btn" onClick={() => setVue(vue === 'commandes' ? 'catalogue' : 'commandes')} title={vue === 'commandes' ? 'Voir le catalogue' : 'Mes Commandes'}>
                  <span className="btn-icon-mobile">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                  </span>
                  <span className="btn-label-desktop">{vue === 'commandes' ? 'Voir le catalogue' : 'Mes Commandes'}</span>
                </button>
                {user.role === 'admin' && (
                  <button className="btn" onClick={() => setVue(vue === 'admin' ? 'catalogue' : 'admin')} title={vue === 'admin' ? 'Voir le site' : 'Espace admin'}>
                    <span className="btn-icon-mobile">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
                    </span>
                    <span className="btn-label-desktop">{vue === 'admin' ? 'Voir le site' : 'Espace admin'}</span>
                  </button>
                )}
                <button className="btn" onClick={() => { setVue('catalogue'); deconnexion(); }} title="Déconnexion">
                  <span className="btn-icon-mobile">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  </span>
                  <span className="btn-label-desktop">Déconnexion</span>
                </button>
              </>
            ) : (
              <button className="btn" onClick={() => setShowAuth(true)} title="Connexion">
                <span className="btn-icon-mobile">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </span>
                <span className="btn-label-desktop">Connexion</span>
              </button>
            )}
            <button className="btn btn-primary cart-btn" onClick={() => setShowCart(true)} title="Panier">
              <span className="btn-icon-mobile" style={{ marginRight: nbPanier > 0 ? 6 : 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              </span>
              <span className="btn-label-desktop">Panier</span>
              {nbPanier > 0 && <span className="cart-count">{nbPanier}</span>}
            </button>
          </div>
        </header>
      )}

      {/* PWA Install Banner */}
      {vue !== 'admin' && showInstallBtn && (
        <div className="pwa-banner" style={{
          background: 'rgba(228, 239, 233, 0.9)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(21, 96, 74, 0.1)',
          padding: '10px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          position: 'sticky',
          top: 64,
          zIndex: 29
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/images/logo.webp" alt="Logo" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
            <div>
              <strong style={{ fontSize: 13, color: 'var(--green-deep)' }}>Mboa Resto</strong>
              <div className="note" style={{ fontSize: 11 }}>Ajoutez notre application sur votre écran d'accueil !</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setShowInstallBtn(false)}>Plus tard</button>
            <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={handleInstallClick}>Installer</button>
          </div>
        </div>
      )}

      {/* iOS PWA Banner Instructions */}
      {vue !== 'admin' && showIosPrompt && (
        <div className="pwa-banner" style={{
          background: 'rgba(228, 239, 233, 0.9)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(21, 96, 74, 0.1)',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          position: 'sticky',
          top: 64,
          zIndex: 29
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/images/logo.webp" alt="Logo" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
            <div>
              <strong style={{ fontSize: 13, color: 'var(--green-deep)' }}>Installer l'appli sur iPhone</strong>
              <div className="note" style={{ fontSize: 11, color: 'var(--ink)', marginTop: 2 }}>
                Appuyez sur Partager <span style={{ fontSize: 16 }}>⎋</span> puis sur "Sur l'écran d'accueil".
              </div>
            </div>
          </div>
          <button className="btn" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => { setShowIosPrompt(false); sessionStorage.setItem('pwa_ios_dismissed', 'true'); }}>Fermer</button>
        </div>
      )}

      {vue === 'admin' && user?.role === 'admin' ? (
        <AdminPanel token={token} onBack={() => setVue('catalogue')} />
      ) : vue === 'commandes' && user ? (
        <main className="grid" style={{ display: 'block', maxWidth: 900, margin: '20px auto', padding: '0 24px' }}>
          <ClientOrders 
            orders={clientOrders} 
            onBack={() => setVue('catalogue')} 
            token={token} 
            onRefresh={triggerRefreshClientOrders} 
          />
        </main>
      ) : (
      <>
      <section className="hero">
        {/* Sliding background images */}
        <div className="hero-bg-container" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          {HERO_IMAGES.map((img, idx) => (
            <div 
              key={img}
              className={`hero-bg-image ${idx === currentImgIndex ? 'active' : ''}`}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${encodeURI(img)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: idx === currentImgIndex ? 0.65 : 0,
                transition: 'opacity 1.8s ease-in-out',
              }}
            />
          ))}
          <div className="hero-overlay" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(20, 18, 15, 0.9) 0%, rgba(20, 18, 15, 0.6) 45%, rgba(20, 18, 15, 0.15) 100%)', zIndex: 2 }} />
        </div>

        <div className="hero-content-card">
          <h1>La cuisine camerounaise <span className="accent">qui vous correspond</span>.</h1>
          <p>
            Ndolè, poulet DG, fast-food maison… filtrés selon votre santé. Choisissez votre profil,
            on vous montre uniquement les plats qui vous conviennent.
          </p>
          {conditions.length > 0 && (
            <div className="profile-note">
              ✓ Filtrage actif&nbsp;: {conditions.join(', ')}
              {allergies.length > 0 && ` · sans ${allergies.join(', ')}`}
            </div>
          )}
        </div>
      </section>

      <FilterBar
        conditions={conditions}
        onToggle={toggleCondition}
        cuisine={cuisine}
        onCuisine={setCuisine}
      />

      {/* Search Input */}
      <div className="search-bar-container" style={{ maxWidth: 1100, margin: '0 auto 20px auto', padding: '0 24px' }}>
        <div className="search-input-wrapper">
          <input 
            type="text" 
            placeholder="Rechercher un plat par son nom ou ses ingrédients..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 20px 14px 44px',
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.4)',
              background: 'rgba(255, 255, 255, 0.72)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              fontSize: 15,
              fontWeight: 500,
              boxShadow: '0 4px 20px rgba(28, 26, 22, 0.02)',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
          />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ 
              position: 'absolute', 
              left: 16, 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'var(--muted)',
              pointerEvents: 'none'
            }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </div>

      {loading ? (
        <div className="loading">Chargement des plats…</div>
      ) : filteredPlats.length === 0 ? (
        <div className="empty">
          Aucun plat ne correspond à votre recherche ou vos filtres.
        </div>
      ) : (
        <>
          <p className="result-count">{filteredPlats.length} plat{filteredPlats.length > 1 ? 's' : ''} trouvé{filteredPlats.length > 1 ? 's' : ''}</p>
          <main className="grid">
            {filteredPlats.map((p) => (
              <ProductCard key={p.id} plat={p} onAdd={ajouter} />
            ))}
          </main>
        </>
      )}
      </>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={onAuth} />}
      {showCart && (
        <CartDrawer
          items={cart}
          token={token}
          onClose={() => setShowCart(false)}
          onQty={changerQty}
          onRemove={retirer}
          onAfterOrder={() => setCart([])}
          onNeedAuth={() => { setShowCart(false); setShowAuth(true); }}
        />
      )}

      <ChatBubble onAdd={ajouter} />

      {activeLocationPromptOrder && (
        <LocationPromptModal 
          order={activeLocationPromptOrder} 
          token={token} 
          userCoords={userCoords}
          setUserCoords={setUserCoords}
          onUpdate={(updatedOrder) => {
            setClientOrders((prev) =>
              prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
            );
            if (clientOrdersRef.current) {
              clientOrdersRef.current = clientOrdersRef.current.map((o) =>
                o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o
              );
            }
          }}
        />
      )}

      {/* Toast Notifications Stack */}
      <div className="toast-container" style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none'
      }}>
        {toasts.map((toast) => (
          <div key={toast.id} className="toast-item" style={{
            background: 'var(--green-deep)',
            color: '#fff',
            padding: '14px 20px',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(14, 68, 53, 0.25)',
            fontSize: 14,
            fontWeight: 600,
            pointerEvents: 'auto',
            animation: 'slideIn 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderLeft: '4px solid var(--spice)'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span>{toast.msg}</span>
          </div>
        ))}
      </div>
    </>
  );
}
