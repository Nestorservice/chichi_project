import React, { useState } from 'react';
import { definirChoixLivraison } from '../api.js';

export default function LocationPromptModal({ order, token, userCoords, setUserCoords, onUpdate }) {
  const [choice, setChoice] = useState(''); // 'actuel' or 'autre'
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGetCurrentLocation = () => {
    setLoading(true);
    setError('');
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserCoords(coords);
        submitLocation(coords);
      },
      (err) => {
        setError("Impossible d'obtenir votre position. Veuillez autoriser la localisation ou saisir une adresse.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const submitLocation = async (coords) => {
    setLoading(true);
    try {
      const res = await definirChoixLivraison(token, order.id, {
        latitude: coords.latitude,
        longitude: coords.longitude
      });
      onUpdate(res);
    } catch (err) {
      setError(err.message || "Erreur de transmission.");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAddress = async () => {
    if (!address.trim()) {
      setError("Veuillez saisir votre adresse de livraison.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await definirChoixLivraison(token, order.id, {
        delivery_address: address.trim()
      });
      onUpdate(res);
    } catch (err) {
      setError(err.message || "Erreur de transmission.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" style={{ zIndex: 10000 }}>
      <div className="drawer" style={{ 
        maxWidth: 480, 
        height: 'auto', 
        borderRadius: 20, 
        padding: 28, 
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        margin: 'auto',
        position: 'relative',
        top: '10%'
      }}>
        <h2 style={{ fontSize: 20, color: 'var(--green-deep)', fontWeight: 800, margin: '0 0 8px 0' }}>
          Mode de livraison
        </h2>
        <p className="note" style={{ fontSize: 13, marginBottom: 20 }}>
          Votre commande #{order.id} est prête et en route ! Dites-nous où vous livrer.
        </p>

        {error && (
          <div className="msg-error" style={{ marginBottom: 16, fontSize: 13, padding: '10px 14px', borderRadius: 10 }}>
            {error}
          </div>
        )}

        {choice === '' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button 
              className="btn btn-primary" 
              onClick={() => {
                if (userCoords) {
                  submitLocation(userCoords);
                } else {
                  handleGetCurrentLocation();
                }
              }}
              disabled={loading}
              style={{ padding: '14px 20px', borderRadius: 12 }}
            >
              {loading ? 'Localisation...' : 'Livrer à ma position actuelle'}
            </button>

            <button 
              className="btn" 
              onClick={() => setChoice('autre')}
              disabled={loading}
              style={{ padding: '14px 20px', borderRadius: 12, borderColor: 'var(--green)', color: 'var(--green)' }}
            >
              Livrer à une autre adresse
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label style={{ fontSize: 12, fontWeight: 600 }}>Nouvelle adresse de livraison</label>
              <textarea 
                className="input" 
                rows={3} 
                value={address} 
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Rue de l'Indépendance, face Boulangerie, Douala" 
                style={{ borderRadius: 12, padding: 12 }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button 
                className="btn btn-spice" 
                onClick={handleCustomAddress}
                disabled={loading}
                style={{ flex: 1, borderRadius: 12 }}
              >
                {loading ? 'Validation...' : 'Valider'}
              </button>
              <button 
                className="btn" 
                onClick={() => { setChoice(''); setError(''); }}
                disabled={loading}
                style={{ borderRadius: 12 }}
              >
                Retour
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
