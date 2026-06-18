import { useState, useRef, useEffect } from 'react';
import api from '../api/axios';
import { renderMarkdown } from '../utils/renderMarkdown';

/* ── Geocoding helpers (logic unchanged) ─────────────────────── */
const LOCATION_KW = /\b(rue|avenue|av\.|boulevard|bd\.|place|quartier|hay|derb|lotissement|cit[eé]|m[eé]dina|souk|march[eé]|centre)\b/i;
const CITY_KW     = /\b(casablanca|rabat|f[eè]s|marrakech|tanger|agadir|mekn[eè]s|oujda|k[eé]nitra|t[eé]touan|safi|mohammedia|maarif|ain|oulfa|anfa)\b/i;

function extractAddress(text) {
  const sm = text.match(/\b(?:rue|avenue|av\.|boulevard|bd\.|place|quartier|hay|derb|lotissement)[^\n.!?]*/i);
  if (sm) return sm[0].trim().replace(/,\s*$/, '');
  const cm = text.match(/\b(?:casablanca|rabat|f[eè]s|marrakech|tanger|agadir|mekn[eè]s|oujda|k[eé]nitra|t[eé]touan|safi|mohammedia)[^\n.!?]*/i);
  return cm ? cm[0].trim() : text;
}

async function geocode(raw) {
  const query = extractAddress(raw);
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Maroc')}&format=json&limit=1&countrycodes=ma`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
    const data = await res.json();
    if (data.length > 0) {
      const { lat, lon, display_name } = data[0];
      return { latitude: parseFloat(lat), longitude: parseFloat(lon), address: display_name };
    }
  } catch { /* silent */ }
  return null;
}

/* ── Typing dots animation ───────────────────────────────────── */
function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'var(--text-muted)',
          display: 'inline-block',
          animation: `dotBounce 1.2s ${i * 0.2}s ease-in-out infinite`,
        }} />
      ))}
      <style>{`
        @keyframes dotBounce {
          0%,80%,100% { transform: translateY(0); opacity: 0.4; }
          40%          { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   ChatWidget
   Props:
     contextType : "citizen" | "agent"
     reportData  : report object (optional, agent context)
     onSuggest   : callback(fields) — GPS pre-fill
   ───────────────────────────────────────────────────────────── */
export default function ChatWidget({ contextType = 'citizen', reportData = null, onSuggest = null }) {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef    = useRef(null);
  const geoSuggested = useRef(false);
  const inputRef     = useRef(null);

  const isCitizen = contextType === 'citizen';
  const panelTitle = isCitizen ? 'Assistant MedinaLink' : 'Assistant IA — Agent';
  const welcome    = isCitizen
    ? 'Bonjour ! Décrivez-moi le problème dans votre quartier, je vous aiderai à créer votre signalement.'
    : 'Bonjour ! Posez-moi des questions sur ce signalement ou demandez une analyse détaillée.';

  /* Initialize messages when opened */
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: welcome }]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* Geocoding for citizen context */
  const tryGeocode = async (text) => {
    if (!onSuggest || geoSuggested.current) return;
    if (!LOCATION_KW.test(text) && !CITY_KW.test(text)) return;
    const coords = await geocode(text);
    if (!coords) return;
    geoSuggested.current = true;
    onSuggest(coords);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `📍 Coordonnées GPS détectées et remplies automatiquement :\n**Lat** ${coords.latitude.toFixed(5)}, **Lon** ${coords.longitude.toFixed(5)}\n*${coords.address}*`,
    }]);
  };

  /* Send message */
  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    if (isCitizen) tryGeocode(input.trim());
    try {
      const res = await api.post('/ai/chat', {
        messages: updated,
        context_type: contextType,
        report_data: reportData || undefined,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply || 'Désolé, je ne peux pas répondre pour le moment.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Service IA temporairement indisponible. Réessayez dans un instant.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>

      {/* ── Chat Panel ── */}
      {open && (
        <div className="chat-panel">

          {/* Header */}
          <div className="chat-panel-head">
            <div>
              <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-warm)', letterSpacing: '-0.01em' }}>
                {panelTitle}
              </h4>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', boxShadow: '0 0 6px var(--green)' }} />
                IA active
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="btn-icon-only"
              style={{ width: 28, height: 28, fontSize: '0.9rem' }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
              >
                <div className={`chat-msg ${msg.role === 'user' ? 'user' : 'bot'}`}>
                  {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div className="chat-msg bot">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="chat-input-row">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Écrivez votre message…"
              rows={2}
              className="chat-input"
              style={{ resize: 'none', borderRadius: 'var(--r-md)', lineHeight: 1.5 }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="chat-send"
              style={{ opacity: loading || !input.trim() ? 0.4 : 1 }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* ── Toggle Button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="chat-toggle"
        style={{
          borderRadius: open ? '50%' : 'var(--r-full)',
          width: open ? 44 : 'auto',
          height: open ? 44 : 'auto',
          padding: open ? 0 : '0.65rem 1.25rem',
          fontSize: open ? '1rem' : '0.85rem',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          letterSpacing: open ? 0 : '0.04em',
          textTransform: open ? 'none' : 'uppercase',
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          transition: 'all 0.25s var(--ease-out)',
        }}
      >
        {open ? '✕' : (isCitizen ? '💬 Assistant' : '🤖 IA Agent')}
      </button>

    </div>
  );
}
