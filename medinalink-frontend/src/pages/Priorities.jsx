import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const STATUS_BADGE = {
  PLANNED:     { cls: 'badge-pending',  label: 'Planifiée' },
  IN_PROGRESS: { cls: 'badge-progress', label: 'En cours'  },
  COMPLETED:   { cls: 'badge-resolved', label: 'Terminée'  },
  CANCELLED:   { cls: 'badge-rejected', label: 'Annulée'   },
};

const CATEGORIES = [
  { value:'ROAD',       label:'Route'        },
  { value:'LIGHTING',   label:'Éclairage'    },
  { value:'WATER',      label:'Eau'          },
  { value:'WASTE',      label:'Déchets'      },
  { value:'GREENSPACE', label:'Espaces verts'},
  { value:'GENERAL',    label:'Générale'     },
];

const EMPTY_FORM = {
  title:'', description:'', category:'GENERAL',
  budget:'', zone:'', startDate:'', endDate:'', status:'PLANNED',
};

export default function Priorities() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [priorities,    setPriorities]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [message,       setMessage]       = useState('');
  const [statusFilter,  setStatusFilter]  = useState('ALL');
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [showForm,      setShowForm]      = useState(false);

  const canEdit = user?.role === 'AGENT' || user?.role === 'ADMIN';

  const fetchPriorities = () => {
    setLoading(true);
    const query = statusFilter === 'ALL' ? '' : `?status=${statusFilter}`;
    api.get(`/priorities${query}`)
      .then(res => setPriorities(res.data))
      .catch(() => setError('Impossible de charger les priorités publiques'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPriorities(); }, [statusFilter]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault(); setError('');
    api.post('/priorities', { ...form, budget: form.budget ? Number(form.budget) : null })
      .then(() => {
        setMessage('Priorité publique créée avec succès');
        setForm(EMPTY_FORM); setShowForm(false); fetchPriorities();
        setTimeout(() => setMessage(''), 4000);
      })
      .catch(err => setError(err.response?.data?.message || 'Échec de création'));
  };

  const handleProgressUpdate = (id, progress) => {
    api.put(`/priorities/${id}/progress`, { progress })
      .then(() => { setMessage('Progression mise à jour'); fetchPriorities(); setTimeout(()=>setMessage(''),3000); })
      .catch(err => setError(err.response?.data?.message || 'Impossible de mettre à jour'));
  };

  if (loading) return (
    <div className="loading-screen"><div className="spinner" /><span>Chargement des priorités…</span></div>
  );

  return (
    <div className="app-page">
      <Navbar />
      <div className="app-container">

        <div className="page-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h1 className="page-head-title">Priorités publiques</h1>
            <p className="page-head-sub">{priorities.length} priorité(s) affichée(s)</p>
          </div>
          {canEdit && (
            <button onClick={() => setShowForm(v => !v)} className="btn btn-primary">
              {showForm ? '✕ Annuler' : '+ Nouvelle priorité'}
            </button>
          )}
        </div>

        {error   && <div className="alert alert-error"   style={{ marginBottom:'1rem' }}>⚠ {error}</div>}
        {message && <div className="alert alert-success" style={{ marginBottom:'1rem' }}>✔ {message}</div>}

        {/* Filters */}
        <div className="filters-bar">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
            <option value="ALL">Tous statuts</option>
            <option value="PLANNED">Planifiée</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="COMPLETED">Terminée</option>
            <option value="CANCELLED">Annulée</option>
          </select>
        </div>

        {/* Create form */}
        {showForm && canEdit && (
          <form onSubmit={handleSubmit} style={{
            background:'var(--surface)', border:'1px solid var(--border-vis)',
            borderRadius:'var(--r-lg)', padding:'1.5rem', marginBottom:'2rem',
          }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:'0.9rem', fontWeight:700, color:'var(--gold)', marginBottom:'1rem', letterSpacing:'-0.01em', textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Créer une priorité publique
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
              <div className="form-group">
                <label className="form-label">Titre</label>
                <input name="title" value={form.title} onChange={handleInput} placeholder="Titre" required className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Catégorie</label>
                <select name="category" value={form.category} onChange={handleInput} className="form-select">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom:'1rem' }}>
              <label className="form-label">Description</label>
              <textarea name="description" value={form.description} onChange={handleInput} placeholder="Description" rows={3} className="form-textarea" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
              <div className="form-group">
                <label className="form-label">Budget (MAD)</label>
                <input name="budget" value={form.budget} onChange={handleInput} placeholder="0" type="number" min="0" className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Zone / quartier</label>
                <input name="zone" value={form.zone} onChange={handleInput} placeholder="Zone" className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Statut initial</label>
                <select name="status" value={form.status} onChange={handleInput} className="form-select">
                  <option value="PLANNED">Planifiée</option>
                  <option value="IN_PROGRESS">En cours</option>
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Date début</label>
                <input name="startDate" value={form.startDate} onChange={handleInput} type="date" className="form-input" style={{ colorScheme:'dark' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Date fin</label>
                <input name="endDate" value={form.endDate} onChange={handleInput} type="date" className="form-input" style={{ colorScheme:'dark' }} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Créer la priorité</button>
          </form>
        )}

        {/* Priority cards */}
        <div style={{ display:'grid', gap:'1px', background:'var(--border-subtle)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
          {priorities.length === 0 ? (
            <div className="empty-state" style={{ background:'var(--surface)', borderRadius:0 }}>
              <span className="empty-state-icon">📋</span>
              <p>Aucune priorité publique pour le moment.</p>
            </div>
          ) : priorities.map(p => {
            const sb = STATUS_BADGE[p.status] || STATUS_BADGE.PLANNED;
            return (
              <div key={p.id} className="priority-card" style={{ background:'var(--surface)', padding:'1.5rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:'1rem', flexWrap:'wrap', marginBottom:'0.6rem' }}>
                  <div>
                    <h3 className="priority-card" style={{ fontFamily:'var(--font-display)', fontSize:'1rem', fontWeight:700, color:'var(--text-warm)', marginBottom:'0.2rem', letterSpacing:'-0.01em' }}>
                      {p.title}
                    </h3>
                    <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{p.category}</span>
                  </div>
                  <span className={`badge ${sb.cls}`}><span className="badge-dot" />{sb.label}</span>
                </div>

                {p.description && (
                  <p style={{ fontSize:'0.875rem', color:'var(--text-muted)', lineHeight:1.6, marginBottom:'1rem' }}>{p.description}</p>
                )}

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'0.5rem', marginBottom:'1.25rem' }}>
                  {[
                    ['Zone', p.zone || '—'],
                    ['Budget', p.budget ? `${p.budget} MAD` : 'Non défini'],
                    ['Commune', p.communeName || '—'],
                    ['Responsable', p.responsibleFullName || '—'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ fontSize:'0.8rem' }}>
                      <span style={{ color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em', fontSize:'0.68rem', fontWeight:600 }}>{k}</span>
                      <br />
                      <span style={{ color:'var(--text-body)' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: canEdit ? '1rem' : 0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.35rem' }}>
                    <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
                      {p.startDate || 'Début N/A'} → {p.endDate || 'Fin N/A'}
                    </span>
                    <span style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--gold)' }}>{p.progress || 0}%</span>
                  </div>
                  <div className="priority-progress-bar">
                    <div className="priority-progress-fill" style={{ width:`${p.progress || 0}%` }} />
                  </div>
                </div>

                {canEdit && (
                  <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                    <button onClick={() => handleProgressUpdate(p.id, Math.min(100, (p.progress||0)+10))}
                      className="btn btn-info btn-sm">+10% progrès</button>
                    <button onClick={() => handleProgressUpdate(p.id, 100)}
                      className="btn btn-success btn-sm">Terminer</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
