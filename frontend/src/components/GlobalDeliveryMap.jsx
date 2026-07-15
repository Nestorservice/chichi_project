import React, { useEffect, useRef, useState } from 'react';

export default function GlobalDeliveryMap({ orders }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getStartTime = () => {
    const now = new Date();
    const sixAM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0, 0);
    if (now < sixAM) {
      sixAM.setDate(sixAM.getDate() - 1);
    }
    return sixAM.getTime();
  };

  const startTime = getStartTime();

  const dailyOrders = orders.filter(
    (o) => new Date(o.created_at).getTime() >= startTime && o.status !== 'annulee'
  );

  const mapOrders = dailyOrders.filter((o) => o.latitude && o.longitude);

  useEffect(() => {
    if (!mapRef.current || mapOrders.length === 0) {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      return;
    }

    const initMap = () => {
      const L = window.L;
      if (!L) return;

      if (!mapInstance.current) {
        const first = mapOrders[0];
        const map = L.map(mapRef.current, {
          zoomControl: true,
          attributionControl: false
        }).setView([Number(first.latitude), Number(first.longitude)], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        mapInstance.current = map;
      }

      const map = mapInstance.current;

      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};

      const bounds = [];

      mapOrders.forEach((o) => {
        const lat = Number(o.latitude);
        const lng = Number(o.longitude);
        bounds.push([lat, lng]);

        const redMarkerIcon = L.divIcon({
          className: 'custom-red-marker',
          html: `<div style="width: 16px; height: 16px; background: #e02424; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 0 12px rgba(224, 36, 36, 0.8); animation: pulse 1.5s infinite; cursor: pointer;"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const itemsText = o.items.map((it) => `${it.quantity}x ${it.name}`).join(', ');
        const popupHtml = `
          <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4; min-width: 200px;">
            <h4 style="margin: 0 0 6px 0; color: var(--green-deep); font-size: 14px;">Commande #${o.id}</h4>
            <b>Client:</b> ${o.full_name}<br/>
            <b>Téléphone:</b> ${o.phone}<br/>
            <b>Plats:</b> ${itemsText}<br/>
            <b>Total:</b> ${Number(o.total_fcfa).toLocaleString('fr-FR')} FCFA<br/>
            <b>Adresse:</b> ${o.delivery_address}
          </div>
        `;

        const marker = L.marker([lat, lng], { icon: redMarkerIcon }).addTo(map);
        marker.bindPopup(popupHtml);
        
        marker.on('click', () => {
          setSelectedOrderId(o.id);
        });

        markersRef.current[o.id] = marker;
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    };

    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.body.appendChild(script);
    } else {
      initMap();
    }
  }, [orders]);

  const focusOrder = (o) => {
    setSelectedOrderId(o.id);
    if (mapInstance.current && o.latitude && o.longitude) {
      mapInstance.current.setView([Number(o.latitude), Number(o.longitude)], 17);
      const marker = markersRef.current[o.id];
      if (marker) {
        marker.openPopup();
      }
    }
  };

  const containerStyle = isMobile ? {
    display: 'flex',
    flexDirection: 'column-reverse',
    gap: 16,
    height: 'auto'
  } : {
    display: 'grid',
    gridTemplateColumns: '1.2fr 2.8fr',
    gap: 24,
    height: 550
  };

  return (
    <div style={containerStyle}>
      {/* Sidebar order list */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 20, maxHeight: isMobile ? 300 : 'none', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: 'var(--green-deep)' }}>Livraisons actives</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dailyOrders.length === 0 ? (
            <div className="note" style={{ textAlign: 'center', padding: '20px 0' }}>
              Aucune livraison active depuis 6h.
            </div>
          ) : (
            dailyOrders.map((o) => {
              const hasGps = o.latitude && o.longitude;
              return (
                <div 
                  key={o.id}
                  onClick={() => focusOrder(o)}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: '1px solid',
                    borderColor: selectedOrderId === o.id ? 'var(--green)' : 'rgba(28,26,22,0.06)',
                    background: selectedOrderId === o.id ? 'var(--green-soft)' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ fontSize: 14 }}>Commande #{o.id}</strong>
                    <span 
                      style={{ 
                        fontSize: 10, 
                        padding: '2px 6px', 
                        borderRadius: 99, 
                        fontWeight: 600,
                        background: hasGps ? 'var(--green-soft)' : '#f3f4f6',
                        color: hasGps ? 'var(--green)' : '#9ca3af'
                      }}
                    >
                      {hasGps ? 'GPS Actif' : 'Adresse seule'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{o.full_name}</div>
                  <div className="note" style={{ fontSize: 11, marginTop: 2 }}>{o.phone}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Map display */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', height: isMobile ? 350 : '100%', position: 'relative' }}>
        {mapOrders.length === 0 ? (
          <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 32, textAlign: 'center' }}>
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--muted)', marginBottom: 12 }}>
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
                <line x1="9" y1="3" x2="9" y2="18"></line>
                <line x1="15" y1="6" x2="15" y2="21"></line>
              </svg>
              <h3 style={{ margin: '0 0 8px 0' }}>En attente de coordonnées GPS</h3>
              <p className="note" style={{ maxWidth: 300, margin: '0 auto' }}>
                Les points de livraison s'afficheront ici en rouge dès que les clients auront activé la localisation.
              </p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
        )}
      </div>
    </div>
  );
}
