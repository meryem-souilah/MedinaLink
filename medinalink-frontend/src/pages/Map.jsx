import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ReportMap from '../components/ReportMap';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const FILTERS = [
  { value:'ALL',         label:'Tous'        },
  { value:'PENDING',     label:'En attente'  },
  { value:'IN_PROGRESS', label:'En cours'    },
  { value:'RESOLVED',    label:'Résolus'     },
];

export default function Map() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('ALL');
  const { user } = useAuth();

  useEffect(() => {
    api.get('/reports?page=0&size=100')
      .then(res => setReports(res.data))
      .catch(() => console.error('Erreur chargement'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? reports : reports.filter(r => r.status === filter);

  return (
    <div className="app-page" style={{ display:'flex', flexDirection:'column', height:'100vh' }}>
      <Navbar />

      {/* Filter bar */}
      <div style={{
        background:'var(--depth)',
        borderBottom:'1px solid var(--border-subtle)',
        padding:'0.6rem clamp(1rem, 2.5vw, 2rem)',
        display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap',
        flexShrink:0,
      }}>
        <span style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginRight:'0.25rem' }}>
          Filtrer
        </span>
        {FILTERS.map(({ value, label }) => (
          <button key={value} onClick={() => setFilter(value)}
            style={{
              padding:'0.35rem 0.875rem', borderRadius:'var(--r-full)',
              border:'1px solid', cursor:'pointer',
              fontSize:'0.8rem', fontWeight: filter===value ? 700 : 400,
              fontFamily:'var(--font-body)',
              background: filter===value ? 'var(--gold)' : 'var(--glass)',
              color:       filter===value ? 'var(--void)' : 'var(--text-muted)',
              borderColor: filter===value ? 'var(--gold)' : 'var(--border-vis)',
              transition:'all var(--dur-fast)',
            }}>
            {label}
          </button>
        ))}
        <span style={{ marginLeft:'auto', fontSize:'0.78rem', color:'var(--text-muted)' }}>
          {filtered.length} signalement(s)
        </span>
      </div>

      {/* Map */}
      <div style={{ flex:1, position:'relative' }}>
        {loading ? (
          <div className="loading-screen">
            <div className="spinner" />
            <span>Chargement de la carte…</span>
          </div>
        ) : (
          <ReportMap reports={filtered} />
        )}
      </div>
    </div>
  );
}
