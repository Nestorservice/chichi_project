import React, { useEffect, useRef } from 'react';

export default function OrderMap({ latitude, longitude, address }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!latitude || !longitude || !mapRef.current) return;

    const lat = Number(latitude);
    const lng = Number(longitude);

    const initMap = () => {
      if (mapInstance.current) {
        mapInstance.current.setView([lat, lng], 16);
        if (mapInstance.current._marker) {
          mapInstance.current._marker.setLatLng([lat, lng]);
        }
        return;
      }

      const L = window.L;
      if (!L) return;

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([lat, lng], 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      const redMarkerIcon = L.divIcon({
        className: 'custom-red-marker',
        html: `<div style="width: 14px; height: 14px; background: #e02424; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 0 10px rgba(224, 36, 36, 0.6); animation: pulse 1.5s infinite;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker([lat, lng], { icon: redMarkerIcon }).addTo(map);
      marker.bindPopup(`<b>Position de livraison</b><br/>Commande en cours`).openPopup();

      mapInstance.current = map;
      mapInstance.current._marker = marker;
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

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [latitude, longitude]);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e02424', display: 'inline-block' }}></span>
        <span>Localisation GPS Client (Point Rouge)</span>
      </div>
      <div ref={mapRef} style={{ height: 180, width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}></div>
    </div>
  );
}
