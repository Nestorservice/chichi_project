import React, { useEffect, useState } from 'react';
import OrderMap from './OrderMap.jsx';
import GlobalDeliveryMap from './GlobalDeliveryMap.jsx';
import AdminReviews from './AdminReviews.jsx';
import { 
  adminLister, 
  adminCreer, 
  adminModifier, 
  adminSupprimer, 
  adminListerCommandes, 
  adminChangerStatutCommande, 
  detailProduit, 
  mediaUrl 
} from '../api.js';

const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA';

const CUISINES = ['camerounais', 'fastfood', 'boisson', 'dessert'];
const ALLERGENS = ['arachide', 'gluten', 'lactose', 'oeuf', 'poisson', 'fruits_de_mer', 'soja', 'porc'];
const NUTRI = [
  ['portion_g', 'Portion (g)'], ['calories_kcal', 'Calories (kcal)'], ['carbs_g', 'Glucides (g)'],
  ['sugars_g', 'Sucres (g)'], ['protein_g', 'Protéines (g)'], ['fat_g', 'Lipides (g)'],
  ['fiber_g', 'Fibres (g)'], ['sodium_mg', 'Sodium (mg)'], ['glycemic_index', 'Index glycémique'],
];

const STATUT_LABELS = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  en_preparation: 'En préparation',
  en_livraison: 'En livraison',
  livree: 'Livrée',
  annulee: 'Annulée'
};

const STATUT_COLORS = {
  en_attente: 'en_attente',
  confirmee: 'confirmee',
  en_preparation: 'en_preparation',
  en_livraison: 'en_livraison',
  livree: 'livree',
  annulee: 'annulee'
};

const formeVide = () => ({
  name: '', description: '', price_fcfa: '', cuisine: 'camerounais',
  is_vegetarian: false, is_vegan: false, is_gluten_free: false, nutritionist_validated: false,
  is_available: true,
  nutrition: {}, allergenes: [],
});

export default function AdminPanel({ token, onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'orders', 'products'
  const [plats, setPlats] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Commandes
  const [commandes, setCommandes] = useState([]);
  const [commandesRaw, setCommandesRaw] = useState([]);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [searchOrder, setSearchOrder] = useState('');
  const [filterOrderStatus, setFilterOrderStatus] = useState('tous');
  
  // Plats
  const [searchPlat, setSearchPlat] = useState('');
  const [form, setForm] = useState(formeVide());
  const [formSection, setFormSection] = useState('general'); // 'general', 'nutrition', 'allergens'
  const [editId, setEditId] = useState(null);
  const [imagePrincipale, setImagePrincipale] = useState(null);
  const [galerie, setGalerie] = useState([]);
  
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const chargerPlats = () => adminLister(token).then((d) => setPlats(d.plats || [])).catch((err) => console.error(err));
  
  const chargerCommandes = () => {
    adminListerCommandes(token)
      .then((d) => {
        const raw = d.commandes || [];
        setCommandesRaw(raw);
        // Group raw flat rows by order id
        const map = {};
        raw.forEach((r) => {
          if (!map[r.id]) {
            map[r.id] = {
              id: r.id,
              status: r.status,
              total_fcfa: r.total_fcfa,
              delivery_address: r.delivery_address,
              payment_method: r.payment_method,
              created_at: r.created_at,
              full_name: r.full_name || 'Client Anonyme',
              phone: r.phone || 'Non renseigné',
              latitude: r.latitude,
              longitude: r.longitude,
              delivery_choice_made: r.delivery_choice_made,
              items: []
            };
          }
          if (r.name) {
            map[r.id].items.push({
              name: r.name,
              quantity: r.quantity,
              unit_price_fcfa: r.unit_price_fcfa
            });
          }
        });
        const list = Object.values(map).sort((a, b) => b.id - a.id);
        setCommandes(list);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    chargerPlats();
    chargerCommandes();
  }, []);

  useEffect(() => {
    const handleUpdate = (e) => {
      const { orderId, updatedOrder } = e.detail;
      setCommandes((prev) => {
        return prev.map((o) => {
          if (o.id === orderId) {
            return { ...o, ...updatedOrder };
          }
          return o;
        });
      });
    };
    window.addEventListener('admin-order-update', handleUpdate);
    return () => window.removeEventListener('admin-order-update', handleUpdate);
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setBool = (k) => (e) => setForm({ ...form, [k]: e.target.checked });
  const setNutri = (k) => (e) => setForm({ ...form, nutrition: { ...form.nutrition, [k]: e.target.value } });
  const toggleAllergen = (a) =>
    setForm({ ...form, allergenes: form.allergenes.includes(a) ? form.allergenes.filter((x) => x !== a) : [...form.allergenes, a] });

  function reset() {
    setForm(formeVide()); 
    setEditId(null); 
    setImagePrincipale(null); 
    setGalerie([]);
    setFormSection('general');
  }

  async function editer(p) {
    setBusy(true);
    setMsg('');
    try {
      const full = await detailProduit(p.id);
      setEditId(full.id);
      setForm({
        name: full.name || '', 
        description: full.description || '', 
        price_fcfa: full.price_fcfa || '',
        cuisine: full.cuisine || 'camerounais',
        is_vegetarian: !!full.is_vegetarian, 
        is_vegan: !!full.is_vegan, 
        is_gluten_free: !!full.is_gluten_free,
        nutritionist_validated: !!full.nutritionist_validated,
        is_available: !!full.is_available,
        nutrition: full.nutrition || {}, 
        allergenes: full.allergenes || [],
      });
      setImagePrincipale(null); 
      setGalerie([]);
      setFormSection('general');
      const formEl = document.querySelector('.admin-form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (e) {
      setMsg('Erreur de chargement du plat : ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function enregistrer() {
    if (!form.name || !form.price_fcfa || !form.cuisine) {
      setMsg('Erreur : Veuillez remplir le nom, le prix et la cuisine.');
      return;
    }
    setMsg(''); 
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('price_fcfa', form.price_fcfa);
      fd.append('cuisine', form.cuisine);
      fd.append('is_vegetarian', form.is_vegetarian);
      fd.append('is_vegan', form.is_vegan);
      fd.append('is_gluten_free', form.is_gluten_free);
      fd.append('nutritionist_validated', form.nutritionist_validated);
      fd.append('is_available', form.is_available);
      fd.append('nutrition', JSON.stringify(form.nutrition));
      fd.append('allergenes', JSON.stringify(form.allergenes));
      if (imagePrincipale) fd.append('image', imagePrincipale);
      galerie.forEach((f) => fd.append('gallery', f));

      const res = editId ? await adminModifier(token, editId, fd) : await adminCreer(token, fd);
      setMsg(editId ? 'Plat mis à jour avec succès.' : 'Plat créé avec succès.');
      reset();
      chargerPlats();
    } catch (e) {
      setMsg('Erreur : ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function supprimer(id) {
    if (!confirm('Voulez-vous vraiment supprimer ce plat de la carte ?')) return;
    try { 
      await adminSupprimer(token, id); 
      setMsg('Plat supprimé de la carte.');
      chargerPlats(); 
    } catch (e) { 
      setMsg(e.message); 
    }
  }

  async function modifierStatut(orderId, newStatus) {
    try {
      await adminChangerStatutCommande(token, orderId, newStatus);
      setMsg(`Statut de la commande #${orderId} mis à jour : ${STATUT_LABELS[newStatus]}.`);
      chargerCommandes();
    } catch (e) {
      setMsg(`Erreur lors du changement de statut : ${e.message}`);
    }
  }

  const toggleOrderExpand = (id) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // KPI Calculations
  const ordersCompleted = commandes.filter(c => c.status === 'livree');
  const activeOrders = commandes.filter(c => ['en_attente', 'confirmee', 'en_preparation', 'en_livraison'].includes(c.status));
  const totalRevenue = ordersCompleted.reduce((acc, curr) => acc + Number(curr.total_fcfa), 0);
  const totalOrdersCount = commandes.length;
  const averageTicketValue = ordersCompleted.length > 0 ? Math.round(totalRevenue / ordersCompleted.length) : 0;

  // Chart data calculation
  const getChartData = () => {
    const dailyData = {};
    commandes.slice().reverse().forEach((c) => {
      if (c.status === 'annulee') return;
      const dateStr = new Date(c.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit'
      });
      dailyData[dateStr] = (dailyData[dateStr] || 0) + Number(c.total_fcfa);
    });

    const dates = Object.keys(dailyData);
    if (dates.length === 0) {
      // Default placeholder data
      return [
        { label: 'Lun', val: 12000 },
        { label: 'Mar', val: 19000 },
        { label: 'Mer', val: 32000 },
        { label: 'Jeu', val: 24000 },
        { label: 'Ven', val: 38000 },
        { label: 'Sam', val: 45000 },
        { label: 'Dim', val: 55000 }
      ];
    }

    return dates.map((d) => ({
      label: d,
      val: dailyData[d]
    })).slice(-7); // Last 7 active days
  };

  const chartData = getChartData();
  const maxChartVal = Math.max(...chartData.map(d => d.val), 5000);
  const chartWidth = 500;
  const chartHeight = 160;
  const chartPadding = 30;
  const graphWidth = chartWidth - chartPadding * 2;
  const graphHeight = chartHeight - chartPadding * 2;

  const points = chartData.map((d, i) => {
    const x = chartPadding + (i * (graphWidth / (chartData.length - 1 || 1)));
    const y = chartPadding + graphHeight - (d.val / maxChartVal * graphHeight);
    return { x, y, label: d.label, val: d.val };
  });

  const pathData = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const areaData = points.length > 0 
    ? `${pathData} L ${points[points.length - 1].x} ${chartHeight - chartPadding} L ${points[0].x} ${chartHeight - chartPadding} Z`
    : '';

  // Popular cuisines analysis
  const getCuisineStats = () => {
    const stats = {};
    plats.forEach(p => {
      stats[p.cuisine] = (stats[p.cuisine] || 0) + 1;
    });
    const total = plats.length || 1;
    return CUISINES.map(c => {
      const count = stats[c] || 0;
      return {
        name: c === 'camerounais' ? 'Cuisine Camerounaise' : c === 'fastfood' ? 'Fast-Food' : c === 'boisson' ? 'Boissons' : 'Desserts',
        count,
        pct: Math.round((count / total) * 100)
      };
    });
  };

  const cuisineStats = getCuisineStats();

  // Search and Filter logic
  const filteredCommandes = commandes.filter((c) => {
    const matchesSearch = c.id.toString().includes(searchOrder) || 
                          c.full_name.toLowerCase().includes(searchOrder.toLowerCase()) ||
                          c.phone.includes(searchOrder);
    const matchesStatus = filterOrderStatus === 'tous' || c.status === filterOrderStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredPlats = plats.filter((p) => {
    return p.name.toLowerCase().includes(searchPlat.toLowerCase()) || 
           p.cuisine.toLowerCase().includes(searchPlat.toLowerCase());
  });

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="brand-name">Mboa Resto</div>
          <div className="brand-sub">Espace Prestige Admin</div>
        </div>
        
        <nav className="admin-sidebar-menu">
          <button 
            className={`admin-menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setMsg(''); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9"></rect>
              <rect x="14" y="3" width="7" height="5"></rect>
              <rect x="14" y="12" width="7" height="9"></rect>
              <rect x="3" y="16" width="7" height="5"></rect>
            </svg>
            Tableau de Bord
          </button>
          
          <button 
            className={`admin-menu-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => { setActiveTab('orders'); setMsg(''); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Commandes
            {activeOrders.length > 0 && <span className="cart-count" style={{ position: 'static', marginLeft: 'auto' }}>{activeOrders.length}</span>}
          </button>
          
          <button 
            className={`admin-menu-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => { setActiveTab('products'); setMsg(''); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            Carte & Menu
          </button>

          <button 
            className={`admin-menu-item ${activeTab === 'deliveries' ? 'active' : ''}`}
            onClick={() => { setActiveTab('deliveries'); setMsg(''); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
              <line x1="9" y1="3" x2="9" y2="18"></line>
              <line x1="15" y1="6" x2="15" y2="21"></line>
            </svg>
            Livraisons
          </button>

          <button 
            className={`admin-menu-item ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => { setActiveTab('reviews'); setMsg(''); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Avis
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button className="btn btn-primary" style={{ width: '100%', borderRadius: '12px' }} onClick={onBack}>
            ← Retour au site
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <header className="admin-main-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isMobile && (
                <button className="btn" style={{ padding: '6px 12px', fontSize: 13, borderRadius: 8 }} onClick={onBack}>
                  ← Site
                </button>
              )}
              <h1 style={{ margin: 0 }}>
                {activeTab === 'dashboard' && (isMobile ? 'Dashboard' : 'Statistiques & Performance')}
                {activeTab === 'orders' && (isMobile ? 'Commandes' : 'Gestion des Commandes')}
                {activeTab === 'products' && (isMobile ? 'Carte' : 'Édition de la Carte')}
                {activeTab === 'deliveries' && (isMobile ? 'Livraisons' : 'Carte des Livraisons du Jour')}
                {activeTab === 'reviews' && (isMobile ? 'Avis' : 'Avis & Retours Clients')}
              </h1>
            </div>
            <p className="note" style={{ marginTop: 4 }}>
              {activeTab === 'dashboard' && 'Aperçu financier et volumétrie.'}
              {activeTab === 'orders' && 'Suivez et traitez les commandes.'}
              {activeTab === 'products' && 'Ajoutez ou modifiez des plats.'}
              {activeTab === 'deliveries' && 'Suivi géographique depuis 6h.'}
              {activeTab === 'reviews' && 'Consultez les notes et suggestions d\'amélioration.'}
            </p>
          </div>
          <div className="date-badge">
            Date : {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {msg && <div className="msg-ok" style={{ marginBottom: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>{msg}</div>}

        {/* =========================================================
            TAB 1 : DASHBOARD
            ========================================================= */}
        {activeTab === 'dashboard' && (
          <>
            {/* KPI Cards Grid */}
            <section className="stat-grid">
              <div className="stat-card">
                <div className="stat-icon-wrapper revenue">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Chiffre d'Affaires</span>
                  <span className="stat-value">{fmt(totalRevenue)}</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper orders">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Commandes Totales</span>
                  <span className="stat-value">{totalOrdersCount}</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Panier Moyen</span>
                  <span className="stat-value">{fmt(averageTicketValue)}</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper pending">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">En traitement</span>
                  <span className="stat-value">{activeOrders.length}</span>
                </div>
              </div>
            </section>

            {/* Charts Section */}
            <div className="charts-grid">
              {/* Revenue Trend Chart */}
              <div className="chart-card">
                <h3>Évolution du Chiffre d'Affaires (7 derniers jours actifs)</h3>
                <div className="svg-chart-container">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="100%" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--green)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Gridlines */}
                    <line x1={chartPadding} y1={chartPadding} x2={chartWidth - chartPadding} y2={chartPadding} stroke="rgba(28, 26, 22, 0.05)" strokeDasharray="3 3" />
                    <line x1={chartPadding} y1={chartPadding + graphHeight / 2} x2={chartWidth - chartPadding} y2={chartPadding + graphHeight / 2} stroke="rgba(28, 26, 22, 0.05)" strokeDasharray="3 3" />
                    <line x1={chartPadding} y1={chartPadding + graphHeight} x2={chartWidth - chartPadding} y2={chartPadding + graphHeight} stroke="rgba(28, 26, 22, 0.1)" />
                    
                    {/* Area path */}
                    {areaData && <path d={areaData} fill="url(#chartGrad)" />}
                    
                    {/* Line path */}
                    {pathData && <path d={pathData} fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
                    
                    {/* Dots and Labels */}
                    {points.map((p, idx) => (
                      <g key={idx}>
                        <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="var(--green)" strokeWidth="2.5" />
                        <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--green-deep)">
                          {p.val >= 1000 ? (p.val / 1000).toFixed(1) + 'k' : p.val}
                        </text>
                        <text x={p.x} y={chartHeight - 10} textAnchor="middle" fontSize="10" fontWeight="500" fill="var(--muted)">
                          {p.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: 'var(--green)' }}></span>
                    <span>Ventes journalières (FCFA)</span>
                  </div>
                </div>
              </div>

              {/* Cuisine breakdown stats */}
              <div className="chart-card">
                <h3>Répartition de la Carte par Cuisine</h3>
                <div className="progress-list" style={{ marginTop: 8 }}>
                  {cuisineStats.map((item) => (
                    <div className="progress-item" key={item.name}>
                      <div className="progress-header">
                        <span className="progress-name">{item.name}</span>
                        <span className="progress-count">{item.count} plat{item.count > 1 ? 's' : ''} ({item.pct}%)</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-bar" style={{ width: `${item.pct}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Orders Panel */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h2>Dernières Commandes Reçues</h2>
                <button className="btn" onClick={() => setActiveTab('orders')}>Voir toutes les commandes →</button>
              </div>
              
              <div className="orders-table-wrapper">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Client</th>
                      <th>Montant</th>
                      <th>Méthode</th>
                      <th>Date</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commandes.slice(0, 5).map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 700 }}>#{c.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.full_name}</div>
                          <div className="note">{c.phone}</div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--green-deep)' }}>{fmt(c.total_fcfa)}</td>
                        <td style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 500 }}>
                          {c.payment_method.replace(/_/g, ' ')}
                        </td>
                        <td>{new Date(c.created_at).toLocaleDateString('fr-FR')} {new Date(c.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>
                          <span className={`status-pill ${STATUT_COLORS[c.status] || ''}`}>
                            {STATUT_LABELS[c.status] || c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {commandes.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0' }}>
                          Aucune commande enregistrée pour le moment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* =========================================================
            TAB 2 : ORDERS MANAGEMENT
            ========================================================= */}
        {activeTab === 'orders' && (
          <section className="admin-card">
            {/* Search and Filters */}
            <div className="search-bar-container">
              <div className="search-input-wrapper">
                <input 
                  type="text" 
                  placeholder="Rechercher par ID, nom de client ou téléphone..." 
                  value={searchOrder}
                  onChange={(e) => setSearchOrder(e.target.value)}
                />
              </div>
              <select 
                className="select" 
                style={{ marginLeft: 0, minWidth: 160 }}
                value={filterOrderStatus}
                onChange={(e) => setFilterOrderStatus(e.target.value)}
              >
                <option value="tous">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="confirmee">Confirmées</option>
                <option value="en_preparation">En préparation</option>
                <option value="en_livraison">En livraison</option>
                <option value="livree">Livrées</option>
                <option value="annulee">Annulées</option>
              </select>
            </div>

            <div className="orders-table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>ID</th>
                    <th>Client</th>
                    <th>Montant</th>
                    <th>Adresse</th>
                    <th>Méthode</th>
                    <th>Date</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCommandes.map((c) => (
                    <React.Fragment key={c.id}>
                      <tr 
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleOrderExpand(c.id)}
                      >
                        <td>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {expandedOrders[c.id] ? '▼' : '▶'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>#{c.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.full_name}</div>
                          <div className="note">{c.phone}</div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--green-deep)' }}>{fmt(c.total_fcfa)}</td>
                        <td style={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.delivery_address}
                        </td>
                        <td style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 500 }}>
                          {c.payment_method.replace(/_/g, ' ')}
                        </td>
                        <td>{new Date(c.created_at).toLocaleDateString('fr-FR')} {new Date(c.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>
                          <span className={`status-pill ${STATUT_COLORS[c.status] || ''}`}>
                            {STATUT_LABELS[c.status] || c.status}
                          </span>
                        </td>
                      </tr>
                      {expandedOrders[c.id] && (
                        <tr>
                          <td colSpan="8" style={{ padding: '0 16px 16px 16px', background: '#faf9f6' }}>
                            <div className="order-details-expanded">
                              <div className="order-details-grid">
                                <div className="order-details-col">
                                  <h4>Détails des Plats</h4>
                                  <div className="order-items-list">
                                    {c.items.map((it, idx) => (
                                      <div className="order-item-row" key={idx}>
                                        <span>
                                          <strong style={{ color: 'var(--green-deep)' }}>{it.quantity}x</strong> {it.name}
                                        </span>
                                        <span style={{ fontWeight: 600 }}>
                                          {fmt(it.unit_price_fcfa * it.quantity)}
                                        </span>
                                      </div>
                                    ))}
                                    <div className="order-item-row" style={{ borderTop: '2px solid rgba(0,0,0,0.08)', paddingTop: 8, fontWeight: 700 }}>
                                      <span>TOTAL</span>
                                      <span style={{ color: 'var(--green-deep)' }}>{fmt(c.total_fcfa)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="order-details-col">
                                  <h4>Informations de Livraison & Contact</h4>
                                  <p style={{ margin: '0 0 8px 0', fontSize: 14 }}>
                                    <strong>Client :</strong> {c.full_name} <br/>
                                    <strong>Téléphone :</strong> {c.phone} <br/>
                                    <strong>Adresse :</strong> {c.delivery_address} <br/>
                                    <strong>Moyen de paiement :</strong> <span style={{ textTransform: 'uppercase' }}>{c.payment_method.replace(/_/g, ' ')}</span>
                                  </p>

                                  {c.latitude && c.longitude && (
                                    <OrderMap latitude={c.latitude} longitude={c.longitude} address={c.delivery_address} />
                                  )}
                                  
                                  <div className="order-actions-panel">
                                    <span className="order-actions-label">Changer l'état :</span>
                                    {c.status !== 'livree' && c.status !== 'annulee' && (
                                      <>
                                        {c.status === 'en_attente' && (
                                          <button className="btn btn-primary" onClick={() => modifierStatut(c.id, 'confirmee')}>
                                            Confirmer
                                          </button>
                                        )}
                                        {c.status === 'confirmee' && (
                                          <button className="btn btn-spice" onClick={() => modifierStatut(c.id, 'en_preparation')}>
                                            Préparer
                                          </button>
                                        )}
                                        {c.status === 'en_preparation' && (
                                          <button className="btn btn-spice" onClick={() => modifierStatut(c.id, 'en_livraison')}>
                                            Expédier
                                          </button>
                                        )}
                                        {c.status === 'en_livraison' && (
                                          <button className="btn" style={{ borderColor: 'var(--green)', color: 'var(--green)' }} onClick={() => modifierStatut(c.id, 'livree')}>
                                            Terminer / Livrée
                                          </button>
                                        )}
                                        <button className="btn btn-danger" onClick={() => modifierStatut(c.id, 'annulee')}>
                                          Annuler
                                        </button>
                                      </>
                                    )}
                                    {(c.status === 'livree' || c.status === 'annulee') && (
                                      <span className="note" style={{ fontStyle: 'italic' }}>Cette commande est archivée et ne peut plus être modifiée.</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {filteredCommandes.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0' }}>
                        Aucune commande ne correspond aux filtres de recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* =========================================================
            TAB 3 : MENU & PLATS
            ========================================================= */}
        {activeTab === 'products' && (
          <div className="split-pane">
            {/* Form Column */}
            <div className="card admin-form">
              <h2>{editId ? 'Modifier le plat #' + editId : 'Créer un nouveau chef-d\'œuvre'}</h2>
              
              {/* Form Section Navigation */}
              <div className="form-section-selectors">
                <button 
                  type="button" 
                  className={`form-tab ${formSection === 'general' ? 'active' : ''}`}
                  onClick={() => setFormSection('general')}
                >
                  1. Informations
                </button>
                <button 
                  type="button" 
                  className={`form-tab ${formSection === 'nutrition' ? 'active' : ''}`}
                  onClick={() => setFormSection('nutrition')}
                >
                  2. Nutrition
                </button>
                <button 
                  type="button" 
                  className={`form-tab ${formSection === 'allergens' ? 'active' : ''}`}
                  onClick={() => setFormSection('allergens')}
                >
                  3. Régimes & Allergènes
                </button>
              </div>

              {formSection === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="field">
                    <label>Nom du plat</label>
                    <input className="input" placeholder="Ex: Ndolè prestige aux crevettes" value={form.name} onChange={set('name')} />
                  </div>
                  <div className="field">
                    <label>Description gastronomique</label>
                    <textarea rows={3} placeholder="Présentez le plat, sa cuisson, ses saveurs..." value={form.description} onChange={set('description')} />
                  </div>
                  <div className="row2">
                    <div className="field">
                      <label>Prix (FCFA)</label>
                      <input className="input" type="number" placeholder="Ex: 3500" value={form.price_fcfa} onChange={set('price_fcfa')} />
                    </div>
                    <div className="field">
                      <label>Type de cuisine</label>
                      <select value={form.cuisine} onChange={set('cuisine')}>
                        <option value="camerounais">Cuisine Camerounaise</option>
                        <option value="fastfood">Fast-Food</option>
                        <option value="boisson">Boisson</option>
                        <option value="dessert">Dessert / Sucré</option>
                      </select>
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Image principale (Format recommandé: Paysage)</label>
                    <input type="file" accept="image/*" onChange={(e) => setImagePrincipale(e.target.files[0] || null)} />
                    {imagePrincipale && (
                      <img className="preview" src={URL.createObjectURL(imagePrincipale)} alt="Aperçu image principale" />
                    )}
                  </div>

                  <div className="field">
                    <label className="field-label">Galerie Photos additionnelles</label>
                    <input type="file" accept="image/*" multiple onChange={(e) => setGalerie([...e.target.files])} />
                    {galerie.length > 0 && (
                      <div className="preview-row">
                        {galerie.map((f, i) => <img key={i} className="preview-mini" src={URL.createObjectURL(f)} alt="" />)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {formSection === 'nutrition' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: 14, color: 'var(--green-deep)' }}>Profil nutritionnel (par portion individuelle)</h4>
                  <div className="nutri-grid">
                    {NUTRI.map(([k, l]) => (
                      <div className="field" key={k}>
                        <label>{l}</label>
                        <input className="input" type="number" value={form.nutrition[k] || ''} onChange={setNutri(k)} />
                      </div>
                    ))}
                  </div>
                  <p className="note" style={{ borderLeft: '3px solid var(--green)', paddingLeft: 8, fontStyle: 'italic' }}>
                    Le moteur calcule les compatibilités de santé (diabétique, minceur, hypertension, etc.) de manière autonome en fonction de ces valeurs.
                  </p>
                </div>
              )}

              {formSection === 'allergens' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 14, color: 'var(--green-deep)' }}>Régimes alimentaires particuliers (saisie manuelle)</h4>
                  
                  <div className="custom-toggle-grid">
                    <label className="custom-switch-label">
                      <span>Végétarien</span>
                      <span className="switch-control">
                        <input type="checkbox" checked={form.is_vegetarian} onChange={setBool('is_vegetarian')} />
                        <span className="switch-slider"></span>
                      </span>
                    </label>
                    <label className="custom-switch-label">
                      <span>Végan</span>
                      <span className="switch-control">
                        <input type="checkbox" checked={form.is_vegan} onChange={setBool('is_vegan')} />
                        <span className="switch-slider"></span>
                      </span>
                    </label>
                    <label className="custom-switch-label">
                      <span>Sans gluten</span>
                      <span className="switch-control">
                        <input type="checkbox" checked={form.is_gluten_free} onChange={setBool('is_gluten_free')} />
                        <span className="switch-slider"></span>
                      </span>
                    </label>
                    <label className="custom-switch-label">
                      <span>Validé par nutritionniste</span>
                      <span className="switch-control">
                        <input type="checkbox" checked={form.nutritionist_validated} onChange={setBool('nutritionist_validated')} />
                        <span className="switch-slider"></span>
                      </span>
                    </label>
                    {editId && (
                      <label className="custom-switch-label">
                        <span>Disponible sur le site</span>
                        <span className="switch-control">
                          <input type="checkbox" checked={form.is_available} onChange={setBool('is_available')} />
                          <span className="switch-slider"></span>
                        </span>
                      </label>
                    )}
                  </div>

                  <h4 style={{ margin: '12px 0 4px 0', fontSize: 14, color: 'var(--green-deep)' }}>Exclusion d'allergènes (Sélectionnez ceux présents dans la recette)</h4>
                  <div className="pickgroup">
                    {ALLERGENS.map((a) => (
                      <button 
                        key={a} 
                        type="button" 
                        className={'pick' + (form.allergenes.includes(a) ? ' on' : '')}
                        onClick={() => toggleAllergen(a)}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {a.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Action buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 24, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 16 }}>
                <button className="btn btn-primary" disabled={busy} onClick={enregistrer} style={{ flex: 1, borderRadius: '12px' }}>
                  {busy ? 'Traitement...' : editId ? 'Confirmer les modifications' : 'Ajouter le plat à la carte'}
                </button>
                <button className="btn" type="button" onClick={reset} style={{ borderRadius: '12px' }}>
                  Réinitialiser
                </button>
              </div>
            </div>

            {/* List Column */}
            <div className="admin-list-panel">
              <div className="search-bar-container">
                <div className="search-input-wrapper">
                  <input 
                    type="text" 
                    placeholder="Filtrer les plats par nom, cuisine..." 
                    value={searchPlat}
                    onChange={(e) => setSearchPlat(e.target.value)}
                  />
                </div>
              </div>

              <div className="plates-compact-list">
                <h3 style={{ margin: '0 0 10px 0', fontSize: 16, color: 'var(--muted)' }}>Le Menu Actuel ({plats.length} plats)</h3>
                
                {filteredPlats.map((p) => (
                  <div className="plate-compact-item" key={p.id}>
                    <div className="plate-compact-thumb">
                      {p.image_url ? (
                        <img src={mediaUrl(p.image_url)} alt={p.name} />
                      ) : (p.name || '?').charAt(0)}
                    </div>
                    
                    <div className="plate-compact-details">
                      <div className="plate-compact-name">
                        {p.name}
                        <span className={`plate-status-badge ${p.is_available ? 'visible' : 'hidden'}`}>
                          {p.is_available ? 'En ligne' : 'Masqué'}
                        </span>
                      </div>
                      <div className="plate-compact-meta">
                        <strong>{fmt(p.price_fcfa)}</strong> · <span style={{ textTransform: 'capitalize' }}>{p.cuisine}</span>
                        {p.tags && p.tags.length > 0 && (
                          <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {p.tags.slice(0, 3).map(t => (
                              <span key={t} className="badge health" style={{ fontSize: 9, padding: '1px 5px' }}>{t.replace(/_compatible/g, '').replace(/_/g, ' ')}</span>
                            ))}
                            {p.tags.length > 3 && <span className="badge" style={{ fontSize: 9, padding: '1px 5px' }}>+{p.tags.length - 3}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="plate-compact-actions">
                      <button 
                        className="btn" 
                        aria-label="Modifier"
                        onClick={() => editer(p)}
                        style={{ padding: 8, display: 'grid', placeItems: 'center', borderRadius: '8px' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button 
                        className="btn btn-danger" 
                        aria-label="Supprimer"
                        onClick={() => supprimer(p.id)}
                        style={{ padding: 8, display: 'grid', placeItems: 'center', borderRadius: '8px' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {filteredPlats.length === 0 && (
                  <div className="empty" style={{ margin: '20px 0' }}>
                    Aucun plat ne correspond à votre recherche.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deliveries' && (
          <GlobalDeliveryMap orders={commandes} />
        )}

        {activeTab === 'reviews' && (
          <AdminReviews token={token} />
        )}
      </main>
    </div>
  );
}
