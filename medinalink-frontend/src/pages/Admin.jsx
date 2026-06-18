import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const ROLE_BADGE = {
  CITIZEN: { cls: 'badge-resolved', label: 'Citoyen' },
  AGENT:   { cls: 'badge-progress', label: 'Agent'   },
  ADMIN:   { cls: 'badge-rejected', label: 'Admin'   },
};

export default function Admin() {
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [message,   setMessage]   = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentEmail,setAgentEmail]= useState('');
  const [agentPass, setAgentPass] = useState('');
  const [agentRole, setAgentRole] = useState('AGENT');
  const [creating,  setCreating]  = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role !== 'ADMIN') { navigate('/login'); return; }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try { const res = await api.get('/users'); setUsers(res.data); }
    catch (err) { console.error('Erreur:', err); }
    finally { setLoading(false); }
  };

  const createAgent = async (e) => {
    e.preventDefault();
    if (agentPass.length < 6) { setMessage('error:Mot de passe trop court (min 6 caractères)'); return; }
    setCreating(true);
    try {
      await api.post('/users/create-user', { fullName:agentName, email:agentEmail, password:agentPass, role:agentRole });
      const label = agentRole === 'ADMIN' ? 'administrateur' : 'agent municipal';
      setMessage(`ok:Compte ${label} créé avec succès !`);
      setAgentName(''); setAgentEmail(''); setAgentPass(''); setAgentRole('AGENT'); setShowForm(false);
      fetchUsers();
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setMessage('error:' + (err.response?.data?.message || 'Erreur lors de la création'));
    } finally { setCreating(false); }
  };

  const changeRole = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      setMessage('ok:Rôle mis à jour avec succès !');
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch { setMessage('error:Erreur lors de la mise à jour'); }
  };

  if (loading) return (
    <div className="loading-screen"><div className="spinner" /><span>Chargement…</span></div>
  );

  const isOk = message.startsWith('ok:');
  const msgText = message.replace(/^(ok|error):/, '');

  return (
    <div className="app-page">
      <Navbar />
      <div className="app-container">

        <div className="page-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h1 className="page-head-title">Gestion des utilisateurs</h1>
            <p className="page-head-sub">Créer des comptes agents ou modifier les rôles</p>
          </div>
          <button onClick={() => { setShowForm(v => !v); setMessage(''); }} className="btn btn-primary">
            {showForm ? '✕ Annuler' : '+ Créer un compte agent'}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={createAgent} style={{
            background:'var(--surface)', border:'1px solid var(--red-dim)',
            borderRadius:'var(--r-lg)', padding:'1.5rem', marginBottom:'1.5rem',
          }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:'0.9rem', fontWeight:700, color:'var(--text-warm)', marginBottom:'1rem', letterSpacing:'-0.01em' }}>
              Nouveau compte utilisateur
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
              {[
                { label:'Nom complet', value:agentName, setter:setAgentName, type:'text',     ph:'Fatima Ouali'     },
                { label:'Email',       value:agentEmail,setter:setAgentEmail,type:'email',    ph:'agent@commune.ma' },
                { label:'Mot de passe',value:agentPass, setter:setAgentPass, type:'password', ph:'Min. 6 caractères' },
              ].map(({ label, value, setter, type, ph }) => (
                <div className="form-group" key={label}>
                  <label className="form-label">{label}</label>
                  <input type={type} value={value} onChange={e => setter(e.target.value)}
                    placeholder={ph} required className="form-input" />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Rôle</label>
                <select value={agentRole} onChange={e => setAgentRole(e.target.value)} className="form-select">
                  <option value="AGENT">Agent Municipal</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button type="submit" disabled={creating} className="btn btn-primary">
                {creating ? 'Création…' : '✔ Créer le compte'}
              </button>
            </div>
          </form>
        )}

        {message && (
          <div className={`alert ${isOk ? 'alert-success' : 'alert-error'}`} style={{ marginBottom:'1rem' }}>
            {isOk ? '✔' : '⚠'} {msgText}
          </div>
        )}

        {/* Users table */}
        <div className="data-table-wrap">
          <div className="data-table-head">
            <h3>Utilisateurs ({users.length})</h3>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['Nom', 'Email', 'Rôle', 'Actions'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
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
  );
}
