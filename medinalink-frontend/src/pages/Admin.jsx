import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const ROLE_BADGE = {
  CITIZEN: { cls: 'badge-resolved', label: 'Citoyen'          },
  AGENT:   { cls: 'badge-progress', label: 'Agent'            },
  ADMIN:   { cls: 'badge-rejected', label: 'Admin'            },
};

export default function Admin() {
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [searchUsers,  setSearchUsers]  = useState('');
  const [creating,     setCreating]     = useState(false);

  // Form fields
  const [agentName,    setAgentName]    = useState('');
  const [agentEmail,   setAgentEmail]   = useState('');
  const [agentPass,    setAgentPass]    = useState('');
  const [agentRole,    setAgentRole]    = useState('AGENT');
  const [agentSecteur, setAgentSecteur] = useState('');
  const [agentLat,     setAgentLat]     = useState('');
  const [agentLng,     setAgentLng]     = useState('');

  const { user }          = useAuth();
  const navigate          = useNavigate();
  const { toasts, toast } = useToast();

  useEffect(() => {
    if (user?.role !== 'ADMIN') { navigate('/login'); return; }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try { const res = await api.get('/users'); setUsers(res.data); }
    catch { toast('Impossible de charger les utilisateurs', 'error'); }
    finally { setLoading(false); }
  };

  const createAgent = async (e) => {
    e.preventDefault();
    if (agentPass.length < 6) { toast('Mot de passe trop court (min 6 caractères)', 'error'); return; }
    setCreating(true);
    try {
      const payload = {
        fullName: agentName, email: agentEmail, password: agentPass, role: agentRole,
        ...(agentRole === 'AGENT' && {
          secteur:        agentSecteur || undefined,
          agentLatitude:  agentLat ? parseFloat(agentLat) : undefined,
          agentLongitude: agentLng ? parseFloat(agentLng) : undefined,
        }),
      };
      await api.post('/users/create-user', payload);
      const label = agentRole === 'ADMIN' ? 'administrateur' : 'agent municipal';
      toast(`Compte ${label} créé avec succès !`, 'success');
      setAgentName(''); setAgentEmail(''); setAgentPass('');
      setAgentRole('AGENT'); setAgentSecteur(''); setAgentLat(''); setAgentLng('');
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la création', 'error');
    } finally { setCreating(false); }
  };

  const changeRole = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      toast('Rôle mis à jour avec succès', 'success');
      fetchUsers();
    } catch { toast('Erreur lors de la mise à jour du rôle', 'error'); }
  };

  const filteredUsers = useMemo(() => {
    if (!searchUsers.trim()) return users;
    const q = searchUsers.toLowerCase();
    return users.filter(u =>
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }, [users, searchUsers]);

  const stats = useMemo(() => ({
    total:    users.length,
    citizens: users.filter(u => u.role === 'CITIZEN').length,
    agents:   users.filter(u => u.role === 'AGENT').length,
    admins:   users.filter(u => u.role === 'ADMIN').length,
  }), [users]);

  if (loading) return (
    <div className="loading-screen"><div className="spinner" /><span>Chargement…</span></div>
  );

  return (
    <>
      <div className="app-page">
        <Navbar />
        <div className="app-container">

          <div className="page-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <h1 className="page-head-title">Gestion des utilisateurs</h1>
              <p className="page-head-sub">Créer des comptes agents ou modifier les rôles</p>
            </div>
            <button onClick={() => setShowForm(v => !v)} className="btn btn-primary">
              {showForm ? '✕ Annuler' : '+ Créer un compte'}
            </button>
          </div>

          {/* Stats */}
          <div className="stats-bar" style={{ marginBottom:'1.5rem' }}>
            <div className="stat-cell">
              <div className="stat-cell-value">{stats.total}</div>
              <div className="stat-cell-label">Total</div>
            </div>
            <div className="stat-cell">
              <div className="stat-cell-value" style={{ color:'var(--green)' }}>{stats.citizens}</div>
              <div className="stat-cell-label">Citoyens</div>
            </div>
            <div className="stat-cell">
              <div className="stat-cell-value" style={{ color:'var(--blue)' }}>{stats.agents}</div>
              <div className="stat-cell-label">Agents</div>
            </div>
            <div className="stat-cell">
              <div className="stat-cell-value" style={{ color:'var(--red)' }}>{stats.admins}</div>
              <div className="stat-cell-label">Admins</div>
            </div>
          </div>

          {/* Create form */}
          {showForm && (
            <form onSubmit={createAgent} style={{
              background:'var(--surface)', border:'1px solid var(--red-dim)',
              borderRadius:'var(--r-lg)', padding:'1.5rem', marginBottom:'1.5rem',
            }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:'0.95rem', fontWeight:700, color:'var(--text-warm)', marginBottom:'1rem', letterSpacing:'-0.01em' }}>
                Nouveau compte utilisateur
              </h3>

              {/* Base fields */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:'1rem', marginBottom:'1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nom complet *</label>
                  <input type="text" value={agentName} onChange={e => setAgentName(e.target.value)}
                    placeholder="Fatima Ouali" required className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" value={agentEmail} onChange={e => setAgentEmail(e.target.value)}
                    placeholder="agent@commune.ma" required className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mot de passe *</label>
                  <input type="password" value={agentPass} onChange={e => setAgentPass(e.target.value)}
                    placeholder="Min. 6 caractères" required className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Rôle *</label>
                  <select value={agentRole} onChange={e => setAgentRole(e.target.value)} className="form-select">
                    <option value="AGENT">Agent Municipal</option>
                    <option value="ADMIN">Administrateur</option>
                  </select>
                </div>
              </div>

              {/* Agent-specific fields */}
              {agentRole === 'AGENT' && (
                <>
                  <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'0.75rem', borderTop:'1px solid var(--border-subtle)', paddingTop:'0.75rem' }}>
                    📍 Informations de zone (optionnel — utilisées pour l'auto-assignation des signalements)
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:'1rem', marginBottom:'1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Secteur</label>
                      <input type="text" value={agentSecteur} onChange={e => setAgentSecteur(e.target.value)}
                        placeholder="Ex: Centre-Ville" className="form-input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Latitude GPS</label>
                      <input type="number" step="any" value={agentLat} onChange={e => setAgentLat(e.target.value)}
                        placeholder="Ex: 33.5731" className="form-input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Longitude GPS</label>
                      <input type="number" step="any" value={agentLng} onChange={e => setAgentLng(e.target.value)}
                        placeholder="Ex: -7.5898" className="form-input" />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.5rem' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Annuler</button>
                <button type="submit" disabled={creating} className="btn btn-primary">
                  {creating ? 'Création…' : '✔ Créer le compte'}
                </button>
              </div>
            </form>
          )}

          {/* Users table */}
          <div className="data-table-wrap">
            <div className="data-table-head">
              <h3>Utilisateurs ({filteredUsers.length}{searchUsers ? ` / ${users.length}` : ''})</h3>
              <div className="search-wrap" style={{ width:240 }}>
                <span className="search-icon-inner">🔍</span>
                <input
                  type="text" value={searchUsers}
                  onChange={e => setSearchUsers(e.target.value)}
                  placeholder="Rechercher un utilisateur…"
                  className="search-input"
                />
              </div>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {['Nom', 'Email', 'Rôle', 'Actions'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:'0.875rem' }}>
                      Aucun utilisateur trouvé
                    </td></tr>
                  ) : filteredUsers.map(u => {
                    const rb = ROLE_BADGE[u.role] || ROLE_BADGE.CITIZEN;
                    return (
                      <tr key={u.id}>
                        <td style={{ fontWeight:600, color:'var(--text-warm)' }}>{u.fullName}</td>
                        <td style={{ color:'var(--text-muted)' }}>{u.email}</td>
                        <td>
                          <span className={`badge ${rb.cls}`}>
                            <span className="badge-dot" />{rb.label}
                          </span>
                        </td>
                        <td>
                          {u.id !== user?.userId ? (
                            <div className="action-row">
                              {u.role !== 'CITIZEN' && (
                                <button onClick={() => changeRole(u.id,'CITIZEN')} className="btn btn-success btn-sm">→ Citoyen</button>
                              )}
                              {u.role !== 'AGENT' && (
                                <button onClick={() => changeRole(u.id,'AGENT')} className="btn btn-info btn-sm">→ Agent</button>
                              )}
                              {u.role !== 'ADMIN' && (
                                <button onClick={() => changeRole(u.id,'ADMIN')} className="btn btn-danger btn-sm">→ Admin</button>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize:'0.75rem', color:'var(--text-faint)' }}>C'est vous</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
      <Toast toasts={toasts} />
    </>
  );
}
