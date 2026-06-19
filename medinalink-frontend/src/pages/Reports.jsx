import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
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
  if (!dateStr) return '—';
  const utc = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
  const diff = (Date.now() - new Date(utc)) / 1000;
  if (diff < 60)     return 'À l\'instant';
  if (diff < 3600)   return `${Math.floor(diff/60)} min`;
  if (diff < 86400)  return `${Math.floor(diff/3600)} h`;
  if (diff < 604800) return `${Math.floor(diff/86400)} j`;
  return new Date(utc).toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
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
  const [deletingId,     setDeletingId]     = useState(null);
  const [votedIds,       setVotedIds]       = useState(new Set());
  const [commentModal,   setCommentModal]   = useState(null); // { report }
  const [comments,       setComments]       = useState([]);
  const [commentsLoading,setCommentsLoading]= useState(false);
  const [commentText,    setCommentText]    = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const gridRef = useRef();

  const { user } = useAuth();
  const { toasts, toast } = useToast();

  const fetchReports = () => {
    api.get('/reports?page=0&size=100')
      .then(res => setReports(res.data))
      .catch(() => setError('Impossible de charger les signalements'))
      .finally(() => setLoading(false));
  };

  const fetchMyVotes = () => {
    api.get('/reports/my-votes')
      .then(res => setVotedIds(new Set(res.data)))
      .catch(() => {});
  };

  useEffect(() => { fetchReports(); fetchMyVotes(); }, []);

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
    if (votedIds.has(id)) return;
    setUpvotingId(id);
    try {
      await api.post(`/reports/${id}/upvote`);
      setVotedIds(prev => new Set([...prev, id]));
      setReports(prev => prev.map(r => r.id === id ? { ...r, upvotes: (r.upvotes || 0) + 1 } : r));
    } catch (err) {
      if (err.response?.status === 409) setVotedIds(prev => new Set([...prev, id]));
    } finally {
      setUpvotingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce signalement définitivement ?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/reports/${id}`);
      setReports(prev => prev.filter(r => r.id !== id));
      toast('Signalement supprimé', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const openComments = async (report) => {
    setCommentModal(report);
    setComments([]);
    setCommentText('');
    setCommentsLoading(true);
    try {
      const res = await api.get(`/reports/${report.id}/comments`);
      setComments(res.data);
    } catch {} finally { setCommentsLoading(false); }
  };

  const sendComment = async () => {
    if (!commentText.trim() || !commentModal) return;
    setSendingComment(true);
    try {
      const res = await api.post(`/reports/${commentModal.id}/comments`, { content: commentText.trim() });
      setComments(prev => [...prev, res.data]);
      setCommentText('');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de l\'envoi du commentaire', 'error');
    } finally { setSendingComment(false); }
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
    <>
    <div className="app-page">
      <Navbar />

      {notification && <div className="toast">🔔 {notification}</div>}

      <div className="app-container">
        {/* Header */}
        <div className="page-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h1 className="page-head-title">Signalements citoyens</h1>
            <p className="page-head-sub">
              {user?.city ? `📍 ${user.city} — ` : ''}{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
            </p>
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
                      disabled={upvotingId === report.id || votedIds.has(report.id)}
                      className="btn-upvote"
                      style={ votedIds.has(report.id) ? { opacity: 0.5, cursor: 'default' } : {} }
                      title={ votedIds.has(report.id) ? 'Vous avez déjà voté' : 'Voter pour ce signalement' }
                    >
                      {votedIds.has(report.id) ? '✓' : '↑'} {report.upvotes || 0} {(report.upvotes || 0) !== 1 ? 'votes' : 'vote'}
                    </button>
                    <button
                      onClick={() => openComments(report)}
                      className="btn-upvote"
                      style={{ marginLeft: '0.4rem' }}
                    >
                      💬 {report.commentCount > 0 ? report.commentCount : ''}
                    </button>
                    {report.status === 'PENDING' && report.userId === user?.userId && (
                      <button
                        onClick={() => handleDelete(report.id)}
                        disabled={deletingId === report.id}
                        className="btn-upvote"
                        style={{ marginLeft: '0.4rem', color: 'var(--red, #e53e3e)' }}
                        title="Supprimer ce signalement"
                      >
                        {deletingId === report.id ? '…' : '🗑️'}
                      </button>
                    )}
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

      {/* Modal commentaires */}
      {commentModal && (
        <div className="modal-overlay" onClick={() => setCommentModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 className="modal-title" style={{ margin: 0 }}>💬 {commentModal.title}</h3>
              <button onClick={() => setCommentModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem', minHeight: 80 }}>
              {commentsLoading ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>Chargement…</p>
              ) : comments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>Aucun commentaire. Soyez le premier !</p>
              ) : comments.map(c => (
                <div key={c.id} style={{
                  background: c.authorRole === 'CITIZEN' ? 'var(--glass)' : 'var(--terra-dim)',
                  borderRadius: 'var(--r-md)', padding: '0.6rem 0.85rem',
                  borderLeft: `3px solid ${c.authorRole === 'CITIZEN' ? 'var(--blue)' : 'var(--terra)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: c.authorRole === 'CITIZEN' ? 'var(--blue)' : 'var(--terra)' }}>
                      {c.authorRole === 'CITIZEN' ? '👤' : '🛠'} {c.authorName}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-body)', margin: 0 }}>{c.content}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendComment()}
                placeholder="Écrire un commentaire…"
                className="form-input"
                style={{ flex: 1 }}
              />
              <button onClick={sendComment} disabled={sendingComment || !commentText.trim()} className="btn btn-primary">
                {sendingComment ? '…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
      <Toast toasts={toasts} />
    </>
  );
}
