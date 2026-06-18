import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import gsap from 'gsap';

const STATUS_MAP = {
  PENDING:     { cls: 'badge-pending',  dot: true, label: 'En attente'  },
  IN_PROGRESS: { cls: 'badge-progress', dot: true, label: 'En cours'    },
  RESOLVED:    { cls: 'badge-resolved', dot: true, label: 'Résolu'      },
  REJECTED:    { cls: 'badge-rejected', dot: true, label: 'Rejeté'      },
};

const CAT_ICONS = {
  ROAD: '🚧', LIGHTING: '💡', WATER: '💧',
  WASTE: '🗑️', GREENSPACE: '🌳', OTHER: '📌',
};

const CAT_LABELS = {
  ROAD: 'Route', LIGHTING: 'Éclairage', WATER: 'Eau',
  WASTE: 'Déchets', GREENSPACE: 'Espaces verts', OTHER: 'Autre',
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)     return 'À l\'instant';
  if (diff < 3600)   return `${Math.floor(diff/60)}min`;
  if (diff < 86400)  return `${Math.floor(diff/3600)}h`;
  return `${Math.floor(diff/86400)}j`;
}

export default function Reports() {
  const [reports,        setReports]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [search,         setSearch]         = useState('');
  const [catFilter,      setCatFilter]      = useState('ALL');
  const [statusFilter,   setStatusFilter]   = useState('ALL');
  const [notification,   setNotification]   = useState('');
  const [upvotingId,     setUpvotingId]     = useState(null);
  const gridRef = useRef();

  const { user } = useAuth();

  const fetchReports = () => {
    api.get('/reports?page=0&size=50')
      .then(res => setReports(res.data))
      .catch(() => setError('Impossible de charger les signalements'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReports(); }, []);

  /* WebSocket real-time notifications */
  useEffect(() => {
    if (!user?.userId) return;
    const wsBase = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/medinalink';
    const ws = new WebSocket(`${wsBase}/ws/notifications/${user.userId}`);
    ws.onmessage = (e) => {
      setNotification(e.data);
      fetchReports();
      setTimeout(() => setNotification(''), 5000);
    };
    return () => ws.close();
  }, [user]);

  /* Animate cards on load */
  useEffect(() => {
    if (!loading && gridRef.current) {
      gsap.fromTo(
        gridRef.current.querySelectorAll('.report-card'),
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, stagger: 0.055, duration: 0.5, ease: 'power3.out', delay: 0.1 }
      );
    }
  }, [loading]);

  const handleUpvote = async (id) => {
    setUpvotingId(id);
    try {
      await api.post(`/reports/${id}/upvote`);
      setReports(prev => prev.map(r => r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r));
    } finally {
      setUpvotingId(null);
    }
  };

  const filtered = reports.filter(r => {
    const q = search.toLowerCase();
    return (
      (r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)) &&
      (catFilter    === 'ALL' || r.category === catFilter) &&
      (statusFilter === 'ALL' || r.status   === statusFilter)
    );
  });

  /* Stats */
  const total    = reports.length;
  const pending  = reports.filter(r => r.status === 'PENDING').length;
  const inProg   = reports.filter(r => r.status === 'IN_PROGRESS').length;
  const resolved = reports.filter(r => r.status === 'RESOLVED').length;

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>Chargement des signalements…</span>
    </div>
  );

  return (
    <div className="app-page">
      <Navbar />

      {notification && <div className="toast">🔔 {notification}</div>}

      <div className="app-container">
        {/* Header */}
        <div className="page-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h1 className="page-head-title">Signalements citoyens</h1>
            <p className="page-head-sub">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <Link to="/citizen/reports/create" className="btn btn-primary">
            + Nouveau signalement
          </Link>
        </div>

        {/* Stats bar */}
        <div className="stats-bar">
          <div className="stat-cell">
            <div className="stat-cell-value">{total}</div>
            <div className="stat-cell-label">Total</div>
          </div>
          <div className="stat-cell">
            <div className="stat-cell-value" style={{ color: 'var(--amber)' }}>{pending}</div>
            <div className="stat-cell-label">En attente</div>
          </div>
          <div className="stat-cell">
            <div className="stat-cell-value" style={{ color: 'var(--blue)' }}>{inProg}</div>
            <div className="stat-cell-label">En cours</div>
          </div>
          <div className="stat-cell">
            <div className="stat-cell-value" style={{ color: 'var(--green)' }}>{resolved}</div>
            <div className="stat-cell-label">Résolus</div>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom:'1.25rem' }}>⚠ {error}</div>}

        {/* Filters */}
        <div className="filters-bar">
          <div className="search-wrap">
            <span className="search-icon-inner">🔍</span>
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un signalement…"
              className="search-input"
            />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="filter-select">
            <option value="ALL">Toutes catégories</option>
            <option value="ROAD">Route</option>
            <option value="LIGHTING">Éclairage</option>
            <option value="WATER">Eau</option>
            <option value="WASTE">Déchets</option>
            <option value="GREENSPACE">Espaces verts</option>
            <option value="OTHER">Autre</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
            <option value="ALL">Tous statuts</option>
            <option value="PENDING">En attente</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="RESOLVED">Résolu</option>
            <option value="REJECTED">Rejeté</option>
          </select>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📭</span>
            <p>Aucun signalement trouvé.</p>
            <Link to="/citizen/reports/create" className="btn btn-primary">
              Créer le premier signalement →
            </Link>
          </div>
        ) : (
          <div className="reports-grid" ref={gridRef}>
            {filtered.map(report => {
              const st = STATUS_MAP[report.status] || STATUS_MAP.PENDING;
              return (
                <div key={report.id} className="report-card">
                  <div className="report-card-top">
                    <div className="report-cat-icon">
                      {CAT_ICONS[report.category] || '📌'}
                    </div>
                    <span className={`badge ${st.cls}`}>
                      <span className="badge-dot" />
                      {st.label}
                    </span>
                  </div>

                  <h3 className="report-card-title">{report.title}</h3>

                  {report.description && (
                    <p className="report-card-desc">{report.description}</p>
                  )}

                  <div className="report-card-meta">
                    {(report.address || report.latitude) && (
                      <span className="report-meta-row">
                        📍 {report.address || `${report.latitude?.toFixed(4)}, ${report.longitude?.toFixed(4)}`}
                      </span>
                    )}
                    <span className="report-meta-row">
                      {CAT_LABELS[report.category] || 'Autre'} · {report.userFullName}
                    </span>
                  </div>

                  <div className="report-card-footer">
                    <button
                      onClick={() => handleUpvote(report.id)}
                      disabled={upvotingId === report.id}
                      className="btn-upvote"
                    >
                      ↑ {report.upvotes} {report.upvotes !== 1 ? 'votes' : 'vote'}
                    </button>
                    <span style={{ fontSize:'0.72rem', color:'var(--text-faint)' }}>
                      {report.createdAt ? timeAgo(report.createdAt) : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
