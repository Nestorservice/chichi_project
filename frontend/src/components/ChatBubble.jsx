import React, { useState, useRef, useEffect } from 'react';
import { discuter } from '../api.js';

const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA';

const SUGGESTIONS = [
  'Je suis diabétique, un plat camerounais',
  'Quelque chose pour sportif sans arachide',
  'Un plat végan à moins de 1500 FCFA',
];

export default function ChatBubble({ onAdd }) {
  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState([
    { de: 'bot', texte: 'Bonjour ! Dites-moi votre besoin (diabétique, sportif, végan, allergies, budget…) et je vous propose des plats adaptés.' },
  ]);
  const [saisie, setSaisie] = useState('');
  const [busy, setBusy] = useState(false);
  const finRef = useRef(null);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, ouvert]);

  async function envoyer(texte) {
    const msg = (texte ?? saisie).trim();
    if (!msg || busy) return;
    setMessages((m) => [...m, { de: 'user', texte: msg }]);
    setSaisie('');
    setBusy(true);
    try {
      const r = await discuter(msg);
      setMessages((m) => [...m, { de: 'bot', texte: r.reponse, plats: r.plats || [] }]);
    } catch (e) {
      setMessages((m) => [...m, { de: 'bot', texte: "Désolé, l'assistant est indisponible pour le moment." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="chat-fab" aria-label="Ouvrir l'assistant" onClick={() => setOuvert((o) => !o)}>
        {ouvert ? '×' : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>

      {ouvert && (
        <div className="chat-panel">
          <div className="chat-head">
            <div>
              <div className="chat-title">Assistant Mboa</div>
              <div className="chat-sub">trouve le plat qui vous convient</div>
            </div>
            <button className="icon-btn" aria-label="Fermer" onClick={() => setOuvert(false)}>×</button>
          </div>

          <div className="chat-body">
            {messages.map((m, i) => (
              <div key={i} className={'chat-msg ' + m.de}>
                <div className="bubble">{m.texte}</div>
                {m.plats && m.plats.length > 0 && (
                  <div className="chat-plats">
                    {m.plats.map((p) => (
                      <div className="chat-plat" key={p.id}>
                        <div>
                          <div className="cp-name">{p.name}</div>
                          <div className="cp-price">{fmt(p.price_fcfa)}</div>
                        </div>
                        <button className="cp-add" aria-label={'Ajouter ' + p.name} onClick={() => onAdd(p)}>+</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="chat-msg bot"><div className="bubble">…</div></div>}
            <div ref={finRef} />
          </div>

          {messages.length <= 1 && (
            <div className="chat-sugg">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => envoyer(s)}>{s}</button>
              ))}
            </div>
          )}

          <div className="chat-input">
            <input
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && envoyer()}
              placeholder="Votre message…"
            />
            <button className="btn btn-primary" onClick={() => envoyer()} disabled={busy}>Envoyer</button>
          </div>
        </div>
      )}
    </>
  );
}
