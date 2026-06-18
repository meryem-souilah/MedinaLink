import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import ChatWidget from '../components/ChatWidget';
import Navbar from '../components/Navbar';

export default function CreateReport() {
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]     = useState('OTHER');
  const [address, setAddress]       = useState('');
  const [latitude, setLatitude]     = useState('');
  const [longitude, setLongitude]   = useState('');
  const [photo, setPhoto]           = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [locating, setLocating]     = useState(false);
  const [geocoding, setGeocoding]   = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState('');
  const geocodeTimer                = useRef(null);
  const navigate = useNavigate();

  // Géocodage automatique : quand l'adresse change, cherche les coordonnées GPS
  useEffect(() => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    if (!address || address.trim().length < 5) {
      setGeocodeMsg('');
      return;
    }

    // Nettoie et normalise l'adresse avant d'interroger Nominatim
    const cleanQuery = (raw) => {
      // Supprime les codes postaux, tirets isolés, espaces multiples
      let q = raw.replace(/\b\d{5}\b/g, '').replace(/\s*-\s*/g, ' ').replace(/\s+/g, ' ').trim();
      // Dédoublonne les mots (ex: "CASABLANCA CASABLANCA" → "CASABLANCA")
      const words = q.split(/\s+/);
      const seen = new Set();
      q = words.filter(w => { const key = w.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; }).join(' ');
      // Ajoute "Maroc" si absent
      if (!/maroc/i.test(q)) q += ', Maroc';
      return q;
    };

    // Fallback : garde seulement les 2-3 derniers segments (quartier + ville)
    const simplifyQuery = (raw) => {
      const parts = raw.split(/[,\-]+/).map(p => p.trim()).filter(p => p.length > 2);
      return (parts.slice(-2).join(', ') || raw.trim()) + ', Maroc';
    };

    const nominatim = async (q) => {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
      const data = await res.json();
      return data && data.length > 0 ? data[0] : null;
    };

    geocodeTimer.current = setTimeout(async () => {
      setGeocoding(true);
      setGeocodeMsg('');
      try {
        // Tentative 1 : adresse nettoyée
        let result = await nominatim(cleanQuery(address));

        // Tentative 2 : version simplifiée (quartier + ville)
        if (!result) result = await nominatim(simplifyQuery(address));

        if (result) {
          const lat = parseFloat(result.lat).toFixed(6);
          const lon = parseFloat(result.lon).toFixed(6);
          setLatitude(lat);
          setLongitude(lon);
          const shortName = result.display_name.split(',').slice(0, 3).join(', ');
          setGeocodeMsg(`✅ Trouvé : ${shortName}`);
        } else {
          setGeocodeMsg('⚠️ Adresse introuvable — entrez les coordonnées manuellement ou utilisez "Ma position"');
        }
      } catch {
        setGeocodeMsg('');
      } finally {
        setGeocoding(false);
      }
    }, 900);
    return () => clearTimeout(geocodeTimer.current);
  }, [address]);

  const getMyLocation = () => {
    if (!navigator.geolocation) { setError('Géolocalisation non supportée'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toString());
        setLongitude(pos.coords.longitude.toString());
        setLocating(false);
      },
      () => {
        setError('Position indisponible, entrez les coordonnées manuellement');
        setLocating(false);
      }
    );
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Photo trop lourde (max 5MB)'); return; }
    if (!file.type.startsWith('image/')) { setError('Fichier invalide, veuillez choisir une image'); return; }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
  };

  const removePhoto = () => { setPhoto(null); setPhotoPreview(null); };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!latitude || !longitude) { setError('Les coordonnées GPS sont obligatoires'); return; }
    setLoading(true);
    try {
      let photoBase64 = null;
      if (photo) photoBase64 = await toBase64(photo);
      await api.post('/reports', {
        title, description, category, address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        photoBase64,
      });
      navigate('/citizen/reports');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="app-page">
        <Navbar />

        <div className="app-container" style={{ maxWidth:'680px' }}>
          <div className="page-head">
            <Link to="/citizen/reports" style={{ fontSize:'0.8rem', color:'var(--text-muted)', display:'inline-flex', alignItems:'center', gap:'0.3rem', marginBottom:'1rem' }}>← Retour aux signalements</Link>
            <h1 className="page-head-title">Nouveau signalement</h1>
            <p className="page-head-sub">Signalez un problème dans votre quartier</p>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>⚠️ {error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <div className="form-group">
              <label className="form-label">Titre *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nid de poule dangereux" required className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Catégorie *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-select">
                <option value="ROAD">🚧 Route / Nid de poule</option>
                <option value="LIGHTING">💡 Éclairage public</option>
                <option value="WATER">💧 Fuite d'eau</option>
                <option value="WASTE">🗑️ Déchets</option>
                <option value="GREENSPACE">🌳 Espaces verts</option>
                <option value="OTHER">📌 Autre</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez le problème..." rows={4} className="form-textarea" />
            </div>

            <div className="form-group">
              <label className="form-label">Adresse</label>
              <div style={{ position: 'relative' }}>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Boulevard Mohammed V, Casablanca" className="form-input"
                  style={{ paddingRight: geocoding ? '2.5rem' : undefined }} />
                {geocoding && (
                  <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem' }}>
                    📡
                  </span>
                )}
              </div>
              {geocodeMsg && (
                <p style={{
                  marginTop: '0.35rem', fontSize: '0.82rem', fontWeight: '500',
                  color: geocodeMsg.startsWith('✅') ? '#166534' : '#92400e',
                  backgroundColor: geocodeMsg.startsWith('✅') ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${geocodeMsg.startsWith('✅') ? '#bbf7d0' : '#fde68a'}`,
                  borderRadius: '6px', padding: '0.35rem 0.75rem',
                }}>
                  {geocodeMsg}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Coordonnées GPS *
                {latitude && longitude && (
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', color: '#166534', fontWeight: '400' }}>
                    ({parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)})
                  </span>
                )}
              </label>
              <button type="button" onClick={getMyLocation} disabled={locating} className="btn-gps">
                {locating ? '📡 Localisation en cours...' : '📍 Utiliser ma position actuelle'}
              </button>
              <div className="form-row" style={{ marginTop: '0.5rem' }}>
                <div className="form-group">
                  <input type="number" value={latitude} onChange={(e) => setLatitude(e.target.value)}
                    placeholder="Latitude (ex: 33.5731)" step="any" className="form-input" />
                </div>
                <div className="form-group">
                  <input type="number" value={longitude} onChange={(e) => setLongitude(e.target.value)}
                    placeholder="Longitude (ex: -7.5898)" step="any" className="form-input" />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Photo (optionnel — max 5MB)</label>
              {!photoPreview ? (
                <label className="photo-dropzone">
                  📷 Cliquer pour ajouter une photo
                  <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                </label>
              ) : (
                <div style={{ position: 'relative' }}>
                  <img src={photoPreview} alt="Aperçu"
                    style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border)' }} />
                  <button type="button" onClick={removePhoto}
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ✕
                  </button>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    {photo?.name} — {(photo?.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              )}
            </div>

            <div className="form-tip">
              💡 <strong>Astuce :</strong> Utilisez l'assistant IA (bouton en bas à droite) pour décrire votre problème et obtenir de l'aide pour remplir ce formulaire.
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Link to="/citizen/reports" className="btn btn-secondary">Annuler</Link>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Envoi en cours...' : '📤 Envoyer'}
              </button>
            </div>

          </form>
        </div>
      </div>

      <ChatWidget
        contextType="citizen"
        onSuggest={(fields) => {
          if (fields.latitude  !== undefined) setLatitude(fields.latitude.toString());
          if (fields.longitude !== undefined) setLongitude(fields.longitude.toString());
          if (fields.address)                 setAddress(fields.address);
        }}
      />
    </>
  );
}
