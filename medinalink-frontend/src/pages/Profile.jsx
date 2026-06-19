import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const ROLE_META = {
  CITIZEN: { label: 'Citoyen',        cls: 'badge-resolved', icon: '👤', tip: 'Signalez des problèmes dans votre quartier et suivez leur résolution en temps réel.' },
  AGENT:   { label: 'Agent Municipal', cls: 'badge-progress', icon: '🛠', tip: 'Vous gérez les signalements assignés à votre zone. Contactez votre administrateur pour modifier votre secteur.' },
  ADMIN:   { label: 'Administrateur',  cls: 'badge-rejected', icon: '⚙️', tip: 'Vous avez accès complet à la gestion des utilisateurs et des signalements.' },
};

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { toasts, toast }    = useToast();
  const role              = ROLE_META[user?.role] || ROLE_META.CITIZEN;
  const initial           = (user?.fullName || 'U').charAt(0).toUpperCase();

  const [oldPwd,    setOldPwd]    = useState('');
  const [newPwd,    setNewPwd]    = useState('');
  const [newPwd2,   setNewPwd2]   = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);

  const [myCity,    setMyCity]    = useState(user?.city || '');
  const [savingCity, setSavingCity] = useState(false);

  const handleSaveCity = async () => {
    setSavingCity(true);
    try {
      await api.put('/users/my/city', { city: myCity });
      updateUser({ city: myCity || null });
      toast('Ville mise à jour avec succès', 'success');
    } catch { toast('Erreur lors de la mise à jour de la ville', 'error'); }
    finally { setSavingCity(false); }
  };

  const handleChangePw = async (e) => {
    e.preventDefault();
    if (newPwd !== newPwd2)   { toast('Les mots de passe ne correspondent pas', 'error'); return; }
    if (newPwd.length < 6)    { toast('Minimum 6 caractères requis', 'error'); return; }
    setChangingPw(true);
    try {
      await api.post('/auth/change-password', { oldPassword: oldPwd, newPassword: newPwd });
      toast('Mot de passe modifié avec succès', 'success');
      setOldPwd(''); setNewPwd(''); setNewPwd2(''); setShowPwForm(false);
    } catch (err) {
      toast(err.response?.data?.message || 'Mot de passe actuel incorrect', 'error');
    } finally { setChangingPw(false); }
  };

  return (
    <>
      <div className="app-page">
        <Navbar />
        <div className="app-container" style={{ maxWidth: 600 }}>

          <div className="page-head">
            <h1 className="page-head-title">Mon profil</h1>
            <p className="page-head-sub">Informations de votre compte MedinaLink</p>
          </div>

          {/* Avatar card */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1.5rem',
            background: 'var(--surface)', border: '1px solid var(--border-vis)',
            borderRadius: 'var(--r-lg)', padding: '1.5rem 2rem', marginBottom: '1.25rem',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
              background: 'var(--terra-dim)', border: '2px solid var(--terra-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontFamily: 'var(--font-display)',
              color: 'var(--terra)', fontWeight: 700,
            }}>
              {initial}
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontFamily: 'var(--font-display)', color: 'var(--text-warm)', fontWeight: 700, marginBottom: '0.35rem' }}>
                {user?.fullName}
              </h2>
              <span className={`badge ${role.cls}`}>
                <span className="badge-dot" />{role.label}
              </span>
            </div>
          </div>

          {/* Info fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {[
              { icon: '✉', label: 'Adresse email',   value: user?.email },
              { icon: role.icon, label: 'Rôle',       value: role.label },
              { icon: '#', label: 'Identifiant',      value: user?.userId?.toString().slice(0,8) + '…' },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                background: 'var(--surface)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--r-md)', padding: '0.875rem 1.25rem',
              }}>
                <span style={{ fontSize: '1.1rem', width: 28, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.1rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
                  <p style={{ fontSize: '0.925rem', color: 'var(--text-warm)', fontWeight: 500 }}>{value || '—'}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Role tip */}
          <div style={{ background: 'var(--terra-dim)', border: '1px solid var(--terra-border)', borderRadius: 'var(--r-md)', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--terra)', fontWeight: 500, lineHeight: 1.6 }}>
              💡 {role.tip}
            </p>
          </div>

          {/* Ville — citoyens uniquement */}
          {user?.role === 'CITIZEN' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-vis)', borderRadius: 'var(--r-lg)', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-warm)', marginBottom: '0.75rem' }}>
                🏙 Ma ville — filtre des signalements
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Définissez votre ville pour ne voir que les signalements qui vous concernent.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={myCity}
                  onChange={e => setMyCity(e.target.value)}
                  placeholder="Ex: Casablanca, Rabat…"
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button onClick={handleSaveCity} disabled={savingCity} className="btn btn-primary">
                  {savingCity ? 'Enregistrement…' : '✔ Sauvegarder'}
                </button>
              </div>
            </div>
          )}

          {/* Password change */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-vis)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <button
              onClick={() => setShowPwForm(v => !v)}
              style={{
                width: '100%', padding: '1rem 1.25rem', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                color: 'var(--text-warm)', fontSize: '0.9rem', fontWeight: 600,
              }}
            >
              <span>🔒 Changer le mot de passe</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{showPwForm ? '▲' : '▼'}</span>
            </button>

            {showPwForm && (
              <form onSubmit={handleChangePw} style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ height: '0.75rem' }} />
                {[
                  { label: 'Mot de passe actuel', value: oldPwd,  setter: setOldPwd,  autoComplete: 'current-password' },
                  { label: 'Nouveau mot de passe', value: newPwd,  setter: setNewPwd,  autoComplete: 'new-password' },
                  { label: 'Confirmer',            value: newPwd2, setter: setNewPwd2, autoComplete: 'new-password' },
                ].map(({ label, value, setter, autoComplete }) => (
                  <div className="form-group" key={label}>
                    <label className="form-label">{label}</label>
                    <input
                      type="password" value={value}
                      onChange={e => setter(e.target.value)}
                      placeholder="••••••••" required minLength={6}
                      autoComplete={autoComplete}
                      className="form-input"
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setShowPwForm(false)} className="btn btn-ghost">Annuler</button>
                  <button type="submit" disabled={changingPw} className="btn btn-primary">
                    {changingPw ? 'Modification…' : '✔ Confirmer'}
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>
      </div>
      <Toast toasts={toasts} />
    </>
  );
}
