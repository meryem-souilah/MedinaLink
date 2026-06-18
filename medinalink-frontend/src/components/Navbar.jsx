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

  // ── Theme toggle ────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('ml-theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('ml-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  /* Subtle entrance */
  useEffect(() => {
    gsap.fromTo(navRef.current,
      { y: -8, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.1 }
    );
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isCitizen) {
    return (
      <nav className="app-nav" ref={navRef}>
        <Link to="/citizen/reports" className="app-nav-brand">
          <em>Medina</em>Link
        </Link>
        <div className="app-nav-links">
          <Link to="/citizen/reports"        className={`app-nav-link${active('/citizen/reports')}`}>Signalements</Link>
          <Link to="/citizen/priorities"     className={`app-nav-link${active('/citizen/priorities')}`}>Priorités</Link>
          <Link to="/citizen/map"            className={`app-nav-link${active('/citizen/map')}`}>Carte</Link>
          <Link to="/citizen/reports/create" className="app-nav-cta">+ Signaler</Link>
        </div>
        <div className="app-nav-right">
          <span className="app-nav-user">
            <span className="app-nav-user-dot" />
            {user?.fullName}
          </span>
          <button onClick={() => setIsDark(p => !p)} className="btn-nav-theme" title={isDark ? 'Mode jour' : 'Mode nuit'}>
            {isDark ? '☀️' : '🌙'}
          </button>
          <button onClick={handleLogout} className="btn-nav-logout">Déconnexion</button>
        </div>
      </nav>
    );
  }

  if (isAgent) {
    return (
      <nav className="app-nav" ref={navRef}>
        <Link to="/agent/dashboard" className="app-nav-brand">
          <em>Medina</em>Link
        </Link>
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
          <button onClick={() => setIsDark(p => !p)} className="btn-nav-theme" title={isDark ? 'Mode jour' : 'Mode nuit'}>
            {isDark ? '☀️' : '🌙'}
          </button>
          <button onClick={handleLogout} className="btn-nav-logout">Déconnexion</button>
        </div>
      </nav>
    );
  }

  if (isAdmin) {
    return (
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
          <button onClick={() => setIsDark(p => !p)} className="btn-nav-theme" title={isDark ? 'Mode jour' : 'Mode nuit'}>
            {isDark ? '☀️' : '🌙'}
          </button>
          <button onClick={handleLogout} className="btn-nav-logout">Déconnexion</button>
        </div>
      </nav>
    );
  }

  return null;
}
