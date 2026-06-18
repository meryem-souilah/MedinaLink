import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const { pathname }     = useLocation();
  const navRef           = useRef();

  const isCitizen = user?.role === 'CITIZEN';
  const isAgent   = user?.role === 'AGENT';
  const isAdmin   = user?.role === 'ADMIN';

  const active = (path) => pathname === path ? ' active' : '';

  // ── Theme ───────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('ml-theme');
    return saved ? saved === 'dark' : false;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('ml-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // ── Mobile menu ─────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);

  // Fermer le menu au changement de route
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Fermer le menu en cliquant à l'extérieur
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (!e.target.closest('.app-nav') && !e.target.closest('.mobile-nav-panel')) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  /* Entrance animation */
  useEffect(() => {
    gsap.fromTo(navRef.current,
      { y: -8, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.1 }
    );
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  // ── Shared elements ─────────────────────────────────────────
  const themeBtn = (
    <button onClick={() => setIsDark(p => !p)} className="btn-nav-theme" title={isDark ? 'Mode jour' : 'Mode nuit'}>
      {isDark ? '☀️' : '🌙'}
    </button>
  );

  const hamburger = (
    <button
      className={`hamburger${menuOpen ? ' open' : ''}`}
      onClick={() => setMenuOpen(p => !p)}
      aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
    >
      <span /><span /><span />
    </button>
  );

  // ── CITOYEN ─────────────────────────────────────────────────
  if (isCitizen) {
    return (
      <>
        <nav className="app-nav" ref={navRef}>
          <Link to="/citizen/reports" className="app-nav-brand"><em>Medina</em>Link</Link>
          <div className="app-nav-links">
            <Link to="/citizen/reports"        className={`app-nav-link${active('/citizen/reports')}`}>Signalements</Link>
            <Link to="/citizen/priorities"     className={`app-nav-link${active('/citizen/priorities')}`}>Priorités</Link>
            <Link to="/citizen/map"            className={`app-nav-link${active('/citizen/map')}`}>Carte</Link>
            <Link to="/citizen/reports/create" className="app-nav-cta">+ Signaler</Link>
          </div>
          <div className="app-nav-right">
            <Link to="/profile" className={`app-nav-link${active('/profile')}`} style={{ fontSize:'0.8rem' }}>Mon profil</Link>
            {themeBtn}
            <button onClick={handleLogout} className="btn-nav-logout">Déconnexion</button>
            {hamburger}
          </div>
        </nav>
        {menuOpen && (
          <div className="mobile-nav-panel">
            <Link to="/citizen/reports"        className={`mobile-nav-link${active('/citizen/reports')}`}    onClick={() => setMenuOpen(false)}>📋 Signalements</Link>
            <Link to="/citizen/priorities"     className={`mobile-nav-link${active('/citizen/priorities')}`} onClick={() => setMenuOpen(false)}>⚑ Priorités</Link>
            <Link to="/citizen/map"            className={`mobile-nav-link${active('/citizen/map')}`}        onClick={() => setMenuOpen(false)}>🗺 Carte</Link>
            <Link to="/citizen/reports/create" className="mobile-nav-link cta"                               onClick={() => setMenuOpen(false)}>+ Signaler un problème</Link>
            <Link to="/profile"                className={`mobile-nav-link${active('/profile')}`}            onClick={() => setMenuOpen(false)}>👤 Mon profil</Link>
            <div className="mobile-nav-divider" />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.4rem 1rem' }}>
              <span style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>{isDark ? 'Mode nuit' : 'Mode jour'}</span>
              <button onClick={() => setIsDark(p => !p)} className="btn-nav-theme">{isDark ? '☀️' : '🌙'}</button>
            </div>
            <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="mobile-nav-link danger" style={{ background:'none', border:'none', textAlign:'left', width:'100%', fontFamily:'inherit', fontWeight:500 }}>
              🚪 Déconnexion
            </button>
          </div>
        )}
      </>
    );
  }

  // ── AGENT ───────────────────────────────────────────────────
  if (isAgent) {
    return (
      <>
        <nav className="app-nav" ref={navRef}>
          <Link to="/agent/dashboard" className="app-nav-brand"><em>Medina</em>Link</Link>
          <div className="app-nav-links">
            <Link to="/agent/dashboard"  className={`app-nav-link${active('/agent/dashboard')}`}>Dashboard</Link>
            <Link to="/agent/priorities" className={`app-nav-link${active('/agent/priorities')}`}>Priorités</Link>
            <Link to="/agent/map"        className={`app-nav-link${active('/agent/map')}`}>Carte</Link>
          </div>
          <div className="app-nav-right">
            <span className="app-nav-user">
              <span className="app-nav-user-dot" />
              {user?.fullName}
            </span>
            <Link to="/profile" className={`app-nav-link${active('/profile')}`} style={{ fontSize:'0.8rem' }}>Mon profil</Link>
            {themeBtn}
            <button onClick={handleLogout} className="btn-nav-logout">Déconnexion</button>
            {hamburger}
          </div>
        </nav>
        {menuOpen && (
          <div className="mobile-nav-panel">
            <div style={{ padding:'0.5rem 1rem 0.6rem', fontSize:'0.8rem', color:'var(--text-muted)' }}>
              🛠 {user?.fullName}
            </div>
            <Link to="/agent/dashboard"  className={`mobile-nav-link${active('/agent/dashboard')}`}  onClick={() => setMenuOpen(false)}>📊 Dashboard</Link>
            <Link to="/agent/priorities" className={`mobile-nav-link${active('/agent/priorities')}`} onClick={() => setMenuOpen(false)}>⚑ Priorités</Link>
            <Link to="/agent/map"        className={`mobile-nav-link${active('/agent/map')}`}        onClick={() => setMenuOpen(false)}>🗺 Carte</Link>
            <Link to="/profile"          className={`mobile-nav-link${active('/profile')}`}          onClick={() => setMenuOpen(false)}>👤 Mon profil</Link>
            <div className="mobile-nav-divider" />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.4rem 1rem' }}>
              <span style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>{isDark ? 'Mode nuit' : 'Mode jour'}</span>
              <button onClick={() => setIsDark(p => !p)} className="btn-nav-theme">{isDark ? '☀️' : '🌙'}</button>
            </div>
            <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="mobile-nav-link danger" style={{ background:'none', border:'none', textAlign:'left', width:'100%', fontFamily:'inherit', fontWeight:500 }}>
              🚪 Déconnexion
            </button>
          </div>
        )}
      </>
    );
  }

  // ── ADMIN ───────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <>
        <nav className="app-nav admin" ref={navRef}>
          <Link to="/admin/dashboard" className="app-nav-brand">
            <em>Medina</em>Link <span style={{ fontSize: '0.75em', opacity: 0.7 }}>Admin</span>
          </Link>
          <div className="app-nav-links">
            <Link to="/admin/dashboard" className={`app-nav-link${active('/admin/dashboard')}`}>Utilisateurs</Link>
            <Link to="/admin/reports"   className={`app-nav-link${active('/admin/reports')}`}>Signalements</Link>
            <Link to="/admin/map"       className={`app-nav-link${active('/admin/map')}`}>Carte</Link>
          </div>
          <div className="app-nav-right">
            <span className="app-nav-user">
              <span className="app-nav-user-dot" style={{ background: 'var(--red)', boxShadow: '0 0 6px var(--red)' }} />
              {user?.fullName}
            </span>
            <Link to="/profile" className={`app-nav-link${active('/profile')}`} style={{ fontSize:'0.8rem' }}>Mon profil</Link>
            {themeBtn}
            <button onClick={handleLogout} className="btn-nav-logout">Déconnexion</button>
            {hamburger}
          </div>
        </nav>
        {menuOpen && (
          <div className="mobile-nav-panel">
            <div style={{ padding:'0.5rem 1rem 0.6rem', fontSize:'0.8rem', color:'var(--red)' }}>
              ⚙ {user?.fullName} — Admin
            </div>
            <Link to="/admin/dashboard" className={`mobile-nav-link${active('/admin/dashboard')}`} onClick={() => setMenuOpen(false)}>👥 Utilisateurs</Link>
            <Link to="/admin/reports"   className={`mobile-nav-link${active('/admin/reports')}`}   onClick={() => setMenuOpen(false)}>📋 Signalements</Link>
            <Link to="/admin/map"       className={`mobile-nav-link${active('/admin/map')}`}       onClick={() => setMenuOpen(false)}>🗺 Carte</Link>
            <Link to="/profile"         className={`mobile-nav-link${active('/profile')}`}         onClick={() => setMenuOpen(false)}>👤 Mon profil</Link>
            <div className="mobile-nav-divider" />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.4rem 1rem' }}>
              <span style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>{isDark ? 'Mode nuit' : 'Mode jour'}</span>
              <button onClick={() => setIsDark(p => !p)} className="btn-nav-theme">{isDark ? '☀️' : '🌙'}</button>
            </div>
            <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="mobile-nav-link danger" style={{ background:'none', border:'none', textAlign:'left', width:'100%', fontFamily:'inherit', fontWeight:500 }}>
              🚪 Déconnexion
            </button>
          </div>
        )}
      </>
    );
  }

  return null;
}
