import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { renderMarkdown } from '../utils/renderMarkdown';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

/* ── Constants ──────────────────────────────────────────────── */
const STATUS = {
  PENDING:     { cls: 'badge-pending',  label: 'En attente'  },
  IN_PROGRESS: { cls: 'badge-progress', label: 'En cours'    },
  RESOLVED:    { cls: 'badge-resolved', label: 'Résolu'      },
  REJECTED:    { cls: 'badge-rejected', label: 'Rejeté'      },
};

const CAT_ICONS  = { ROAD:'🚧', LIGHTING:'💡', WATER:'💧', WASTE:'🗑️', GREENSPACE:'🌳', OTHER:'📌' };
const CAT_LABELS = { ROAD:'Routes', LIGHTING:'Éclairage', WATER:'Eau', WASTE:'Déchets', GREENSPACE:'Espaces verts', OTHER:'Autre' };
const CAT_COLORS = { ROAD:'#60a5fa', LIGHTING:'#fbbf24', WATER:'#22d3ee', WASTE:'#6b7280', GREENSPACE:'#10b981', OTHER:'#a78bfa' };

function getSLA(createdAt) {
  if (!createdAt) return { label: '—', cls: 'green' };
  const utc  = createdAt.endsWith('Z') ? createdAt : createdAt + 'Z';
  const days = Math.floor((Date.now() - new Date(utc)) / 86400000);
  if (days > 7) return { label: `${days}j`, cls: 'red' };
  if (days > 2) return { label: `${days}j`, cls: 'orange' };
  if (days === 0) {
    const h = Math.floor((Date.now() - new Date(utc)) / 3600000);
    return { label: h < 1 ? '< 1h' : `${h}h`, cls: 'green' };
  }
  return { label: `${days}j`, cls: 'green' };
}

function downloadCSV(reports) {
  const headers = ['Titre', 'Catégorie', 'Statut', 'Adresse', 'Citoyen', 'Votes', 'Date création', 'Notes agent'];
  const rows = reports.map(r => [
    `"${(r.title||'').replace(/"/g,'""')}"`,
    CAT_LABELS[r.category] || r.category,
    r.status,
    `"${(r.address||'').replace(/"/g,'""')}"`,
    `"${(r.userFullName||'').replace(/"/g,'""')}"`,
    r.upvotes || 0,
    r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '',
    `"${(r.agentNotes||'').replace(/"/g,'""')}"`,
  ]);
  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'signalements.csv'; a.click();
  URL.revokeObjectURL(url);
}

const statusLabel = (s) =>
  ({ PENDING:'En attente', IN_PROGRESS:'En cours', RESOLVED:'Résolu', REJECTED:'Rejeté', CREATED:'Créé' }[s] || s);

/* ════════════════════════════════════════════════════════════
   DASHBOARD
   ════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Filters
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');
  const [sortBy,         setSortBy]         = useState('date');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [filterUrgent,   setFilterUrgent]   = useState(false);
  const [zoneOnly,       setZoneOnly]       = useState(true);

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatus,  setBulkStatus]  = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // AI modal
  const [analysisModal, setAnalysisModal] = useState(null);
  const [analyzingId,   setAnalyzingId]   = useState(null);
  const [agentMessages, setAgentMessages] = useState([]);
  const [agentInput,    setAgentInput]    = useState('');
  const [agentLoading,  setAgentLoading]  = useState(false);
  const agentBottomRef = useRef(null);

  // Details modal
  const [resolutionPhoto,    setResolutionPhoto]    = useState('');
  const [savingResPhoto,     setSavingResPhoto]     = useState(false);

  const [detailsModal,       setDetailsModal]       = useState(null);
  const [detailsTab,         setDetailsTab]         = useState('notes');
  const [notesValue,         setNotesValue]         = useState('');
  const [savingNotes,        setSavingNotes]        = useState(false);
  const [statusHistory,      setStatusHistory]      = useState([]);
  const [historyLoading,     setHistoryLoading]     = useState(false);
  const [priorities,         setPriorities]         = useState([]);
  const [prioritiesLoading,  setPrioritiesLoading]  = useState(false);
  const [selectedPriorityId, setSelectedPriorityId] = useState('');
  const [linkingPriority,    setLinkingPriority]    = useState(false);

  // Reassign tab
  const [agents,          setAgents]          = useState([]);
  const [agentsLoading,   setAgentsLoading]   = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [reassigning,     setReassigning]     = useState(false);

  // Comments tab
  const [reportComments,    setReportComments]    = useState([]);
  const [commentsLoading,   setCommentsLoading]   = useState(false);
  const [commentText,       setCommentText]       = useState('');
  const [sendingComment,    setSendingComment]    = useState(false);

  // Reject with reason modal
  const [rejectModal,  setRejectModal]  = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting,    setRejecting]    = useState(false);

  // Personal stats (AGENT)
  const [myStats, setMyStats] = useState(null);

  const { user }          = useAuth();
  const navigate          = useNavigate();
  const { toasts, toast } = useToast();

  useEffect(() => {
    if (user?.role === 'CITIZEN') { navigate('/citizen/reports'); return; }
    fetchReports(zoneOnly);
  }, [zoneOnly]);

  // Load personal stats for agents
  useEffect(() => {
    if (user?.role === 'AGENT' && user?.userId) {
      api.get(`/reports/stats?agentId=${user.userId}`)
        .then(res => setMyStats(res.data))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    agentBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages, agentLoading]);

  const fetchReports = async (myZone = false) => {
    setLoading(true);
    try {
      const agentParam = (myZone && user?.role === 'AGENT') ? `&agentId=${user.userId}` : '';
      const res = await api.get(`/reports?page=0&size=200${agentParam}`);
      setReports(res.data);
    } catch { toast('Impossible de charger les signalements', 'error'); }
    finally { setLoading(false); }
  };

  /* ── Computed ── */
  const stats = useMemo(() => {
    const resolved = reports.filter(r => r.status === 'RESOLVED').length;
    return {
      total:          reports.length,
      pending:        reports.filter(r => r.status === 'PENDING').length,
      inProgress:     reports.filter(r => r.status === 'IN_PROGRESS').length,
      resolved,
      resolutionRate: reports.length ? Math.round(resolved / reports.length * 100) : 0,
    };
  }, [reports]);

  const urgentCount = useMemo(() =>
    reports.filter(r => {
      const age = (Date.now() - new Date((r.createdAt||'') + 'Z')) / 86400000;
      return age > 3 && (r.status === 'PENDING' || r.status === 'IN_PROGRESS');
    }).length
  , [reports]);

  const filteredReports = useMemo(() => {
    let r = reports.filter(rep => {
      if (filterStatus   && rep.status   !== filterStatus)   return false;
      if (filterCategory && rep.category !== filterCategory) return false;
      if (filterDateFrom && rep.createdAt && rep.createdAt.slice(0,10) < filterDateFrom) return false;
      if (filterDateTo   && rep.createdAt && rep.createdAt.slice(0,10) > filterDateTo)   return false;
      if (filterUrgent) {
        const age = (Date.now() - new Date((rep.createdAt||'') + 'Z')) / 86400000;
        if (age <= 3 || rep.status === 'RESOLVED' || rep.status === 'REJECTED') return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !rep.title?.toLowerCase().includes(q) &&
          !rep.description?.toLowerCase().includes(q) &&
          !rep.address?.toLowerCase().includes(q) &&
          !rep.userFullName?.toLowerCase().includes(q) &&
          !rep.secteur?.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
    if (sortBy === 'votes') return [...r].sort((a,b) => (b.upvotes||0)-(a.upvotes||0));
    if (sortBy === 'age')   return [...r].sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt));
    if (sortBy === 'urgent') return [...r].sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt));
    return [...r].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  }, [reports, filterStatus, filterCategory, filterDateFrom, filterDateTo, filterUrgent, searchQuery, sortBy]);

  const catData = useMemo(() => {
    const counts = {};
    reports.forEach(r => { counts[r.category] = (counts[r.category]||0)+1; });
    return Object.entries(counts).sort((a,b) => b[1]-a[1]);
  }, [reports]);

  const weeklyData = useMemo(() => Array.from({ length: 7 }, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    const key = d.toISOString().slice(0,10);
    return {
      label: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      count: reports.filter(r => r.createdAt?.slice(0,10) === key).length,
    };
  }), [reports]);

  const maxWeekly = Math.max(...weeklyData.map(d => d.count), 1);
  const maxCat    = Math.max(...catData.map(([,v]) => v), 1);

  /* ── Actions ── */
  const updateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await api.put(`/reports/${id}/status`, { status: newStatus });
      toast('Statut mis à jour', 'success');
      fetchReports(zoneOnly);
    } catch { toast('Erreur lors de la mise à jour', 'error'); }
    finally { setUpdatingId(null); }
  };

  const openRejectModal = (report) => {
    setRejectModal(report);
    setRejectReason(report.agentNotes || '');
  };

  const confirmReject = async () => {
    if (!rejectModal) return;
    setRejecting(true);
    try {
      if (rejectReason.trim()) {
        await api.put(`/reports/${rejectModal.id}/notes`, { notes: rejectReason });
      }
      await api.put(`/reports/${rejectModal.id}/status`, { status: 'REJECTED' });
      toast('Signalement rejeté', 'warning');
      fetchReports(zoneOnly);
      setRejectModal(null);
      setRejectReason('');
    } catch { toast('Erreur lors du rejet', 'error'); }
    finally { setRejecting(false); }
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      await Promise.all([...selectedIds].map(id => api.put(`/reports/${id}/status`, { status: bulkStatus })));
      toast(`${selectedIds.size} signalement(s) mis à jour`, 'success');
      setSelectedIds(new Set()); setBulkStatus(''); fetchReports(zoneOnly);
    } catch { toast('Erreur lors de la mise à jour en lot', 'error'); }
    finally { setBulkLoading(false); }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? new Set(filteredReports.map(r => r.id)) : new Set());
  };

  const analyzeReport = async (report) => {
    setAnalyzingId(report.id);
    try {
      const res = await api.post(`/ai/analyze/${report.id}`);
      setAnalysisModal({ report, text: res.data.analysis });
    } catch {
      setAnalysisModal({ report, text: 'Analyse indisponible. Vérifiez que le service IA est démarré.' });
    } finally { setAnalyzingId(null); }
    setAgentMessages([{ role:'assistant', content:'Bonjour ! Je suis votre assistant IA municipal. Posez-moi des questions sur ce signalement : résumé, urgence, réponse au citoyen…' }]);
    setAgentInput('');
  };

  const sendAgentMessage = async () => {
    if (!agentInput.trim() || agentLoading || !analysisModal) return;
    const userMsg = { role:'user', content: agentInput.trim() };
    const updated = [...agentMessages, userMsg];
    setAgentMessages(updated); setAgentInput(''); setAgentLoading(true);
    try {
      const res = await api.post('/ai/chat', { messages: updated, context_type:'agent', report_data: analysisModal.report });
      setAgentMessages(prev => [...prev, { role:'assistant', content: res.data.reply || 'Désolé, je ne peux pas répondre pour le moment.' }]);
    } catch {
      setAgentMessages(prev => [...prev, { role:'assistant', content:'Service IA temporairement indisponible.' }]);
    } finally { setAgentLoading(false); }
  };

  const handleAgentKey = (e) => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendAgentMessage(); } };

  const saveResolutionPhoto = async () => {
    if (!resolutionPhoto.trim() || !detailsModal) return;
    setSavingResPhoto(true);
    try {
      const res = await api.put(`/reports/${detailsModal.id}/resolution-photo`, { photoBase64: resolutionPhoto });
      setReports(prev => prev.map(r => r.id === detailsModal.id ? { ...r, resolutionPhotoUrl: res.data.resolutionPhotoUrl } : r));
      setDetailsModal(prev => ({ ...prev, resolutionPhotoUrl: res.data.resolutionPhotoUrl }));
      toast('Photo de résolution ajoutée', 'success');
    } catch { toast('Erreur lors de l\'ajout de la photo', 'error'); }
    finally { setSavingResPhoto(false); }
  };

  const handleResPhotoFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setResolutionPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const openDetails = (report) => {
    setDetailsModal(report); setDetailsTab('notes'); setNotesValue(report.agentNotes||'');
    setStatusHistory([]); setPriorities([]); setSelectedPriorityId(report.priorityId||'');
    setAgents([]); setSelectedAgentId(''); setResolutionPhoto('');
    setReportComments([]); setCommentText('');
  };

  const sendReportComment = async () => {
    if (!commentText.trim() || !detailsModal) return;
    setSendingComment(true);
    try {
      const res = await api.post(`/reports/${detailsModal.id}/comments`, { content: commentText.trim() });
      setReportComments(prev => [...prev, res.data]);
      setCommentText('');
      // Met à jour le compteur de commentaires dans la liste
      setReports(prev => prev.map(r => r.id === detailsModal.id ? { ...r, commentCount: (r.commentCount || 0) + 1 } : r));
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de l\'envoi', 'error');
    } finally { setSendingComment(false); }
  };

  const handleTabChange = async (tab) => {
    setDetailsTab(tab);
    if (tab === 'history' && statusHistory.length === 0) {
      setHistoryLoading(true);
      try { const r = await api.get(`/reports/${detailsModal.id}/history`); setStatusHistory(r.data); }
      catch { setStatusHistory([]); }
      finally { setHistoryLoading(false); }
    }
    if (tab === 'priority' && priorities.length === 0) {
      setPrioritiesLoading(true);
      try { const r = await api.get('/priorities?page=0&size=100'); setPriorities(r.data); }
      catch { setPriorities([]); }
      finally { setPrioritiesLoading(false); }
    }
    if (tab === 'reassign' && agents.length === 0) {
      setAgentsLoading(true);
      try { const r = await api.get('/users/agents'); setAgents(r.data); }
      catch { setAgents([]); }
      finally { setAgentsLoading(false); }
    }
    if (tab === 'comments') {
      setCommentsLoading(true);
      try { const r = await api.get(`/reports/${detailsModal.id}/comments`); setReportComments(r.data); }
      catch { setReportComments([]); }
      finally { setCommentsLoading(false); }
    }
  };

  const saveNotes = async () => {
    if (!detailsModal) return;
    setSavingNotes(true);
    try {
      await api.put(`/reports/${detailsModal.id}/notes`, { notes: notesValue });
      setReports(prev => prev.map(r => r.id===detailsModal.id ? {...r, agentNotes:notesValue} : r));
      setDetailsModal(prev => ({...prev, agentNotes:notesValue}));
      toast('Notes sauvegardées', 'success');
    } catch { toast('Erreur lors de la sauvegarde des notes', 'error'); }
    finally { setSavingNotes(false); }
  };

  const savePriorityLink = async () => {
    if (!detailsModal) return;
    setLinkingPriority(true);
    try {
      const res = await api.put(`/reports/${detailsModal.id}/priority`, { priorityId: selectedPriorityId||null });
      const upd = res.data;
      setReports(prev => prev.map(r => r.id===detailsModal.id ? {...r, priorityId:upd.priorityId, priorityTitle:upd.priorityTitle} : r));
      setDetailsModal(prev => ({...prev, priorityId:upd.priorityId, priorityTitle:upd.priorityTitle}));
      toast('Priorité liée avec succès', 'success');
    } catch { toast('Erreur lors de la liaison avec la priorité', 'error'); }
    finally { setLinkingPriority(false); }
  };

  const saveReassignment = async () => {
    if (!detailsModal || !selectedAgentId) return;
    setReassigning(true);
    try {
      const res = await api.put(`/reports/${detailsModal.id}/assign`, { agentId: selectedAgentId });
      const upd = res.data;
      setReports(prev => prev.map(r => r.id===detailsModal.id
        ? {...r, assignedAgentId:upd.assignedAgentId, assignedAgentName:upd.assignedAgentName, secteur:upd.secteur}
        : r));
      setDetailsModal(prev => ({...prev, assignedAgentId:upd.assignedAgentId, assignedAgentName:upd.assignedAgentName, secteur:upd.secteur}));
      toast('Signalement réassigné avec succès', 'success');
      setSelectedAgentId('');
    } catch { toast('Erreur lors de la réassignation', 'error'); }
    finally { setReassigning(false); }
  };

  const navigateToLocation = (report) => {
    if (!report.latitude || !report.longitude) return;
    window.open(`https://maps.google.com/?q=${report.latitude},${report.longitude}`, '_blank');
  };

  /* ── SVG gauge ── */
  const circumference = 2 * Math.PI * 40;
  const dashOffset    = circumference - (circumference * stats.resolutionRate) / 100;
  const gaugeColor    = stats.resolutionRate >= 70 ? 'var(--green)' : stats.resolutionRate >= 40 ? 'var(--amber)' : 'var(--red)';

  if (loading) return (
    <div className="loading-screen"><div className="spinner" /><span>Chargement du tableau de bord…</span></div>
  );

  return (
    <>
      <div className="app-page">
        <Navbar />

        <div className="app-container-wide">

          {/* Header */}
          <div className="page-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <h1 className="page-head-title">Tableau de bord</h1>
              <p className="page-head-sub">
                {user?.role === 'AGENT' && zoneOnly
                  ? `Ma zone — ${reports[0]?.secteur || 'Secteur non défini'}`
                  : 'Gestion et suivi des signalements citoyens'}
              </p>
            </div>
            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
              {user?.role === 'AGENT' && (
                <div style={{ display:'flex', background:'var(--glass)', borderRadius:'var(--r-md)', padding:3, gap:3 }}>
                  <button onClick={() => setZoneOnly(true)}  className={`btn btn-sm ${zoneOnly  ? 'btn-primary' : 'btn-ghost'}`} style={{ borderRadius:'var(--r-sm)' }}>📍 Ma zone</button>
                  <button onClick={() => setZoneOnly(false)} className={`btn btn-sm ${!zoneOnly ? 'btn-primary' : 'btn-ghost'}`} style={{ borderRadius:'var(--r-sm)' }}>🌍 Tous</button>
                </div>
              )}
              <button onClick={() => downloadCSV(filteredReports)} className="btn btn-ghost">
                ↓ Exporter CSV ({filteredReports.length})
              </button>
            </div>
          </div>

          {/* Personal stats widget — AGENT only */}
          {user?.role === 'AGENT' && myStats && (
            <div style={{
              background:'var(--terra-dim)', border:'1px solid var(--terra-border)',
              borderRadius:'var(--r-lg)', padding:'1rem 1.5rem', marginBottom:'1rem',
              display:'flex', alignItems:'center', gap:'1.5rem', flexWrap:'wrap',
            }}>
              <p style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--terra)', marginRight:'0.5rem' }}>🛠 Mes signalements</p>
              {[
                { label:'En attente',   value: myStats.PENDING     || 0, color:'var(--amber)' },
                { label:'En cours',     value: myStats.IN_PROGRESS || 0, color:'var(--blue)'  },
                { label:'Résolus',      value: myStats.RESOLVED    || 0, color:'var(--green)' },
                { label:'Rejetés',      value: myStats.REJECTED    || 0, color:'var(--red)'   },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                  <strong style={{ fontSize:'1.1rem', fontWeight:800, color }}>{value}</strong>
                  <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{label}</span>
                </div>
              ))}
              {urgentCount > 0 && (
                <div style={{ marginLeft:'auto', background:'var(--red-dim)', border:'1px solid var(--red)', borderRadius:'var(--r-full)', padding:'0.3rem 0.9rem', fontSize:'0.78rem', fontWeight:700, color:'var(--red)' }}>
                  ⚠ {urgentCount} urgent{urgentCount > 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          {/* Stats bar */}
          <div className="stats-bar">
            <div className="stat-cell"><div className="stat-cell-value">{stats.total}</div><div className="stat-cell-label">Total</div></div>
            <div className="stat-cell"><div className="stat-cell-value" style={{ color:'var(--amber)' }}>{stats.pending}</div><div className="stat-cell-label">En attente</div></div>
            <div className="stat-cell"><div className="stat-cell-value" style={{ color:'var(--blue)' }}>{stats.inProgress}</div><div className="stat-cell-label">En cours</div></div>
            <div className="stat-cell"><div className="stat-cell-value" style={{ color:'var(--green)' }}>{stats.resolved}</div><div className="stat-cell-label">Résolus</div></div>
          </div>

          {/* Charts row */}
          <div className="charts-row">
            <div className="chart-cell">
              <p className="chart-title">Signalements par catégorie</p>
              {catData.length === 0 ? (
                <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>Aucune donnée</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
                  {catData.map(([cat, count]) => (
                    <div key={cat}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.775rem', marginBottom:'0.2rem', color:'var(--text-body)' }}>
                        <span>{CAT_ICONS[cat]} {CAT_LABELS[cat]||cat}</span>
                        <span style={{ fontWeight:700, color:'var(--text-warm)' }}>{count}</span>
                      </div>
                      <div style={{ background:'var(--glass)', borderRadius:3, height:6 }}>
                        <div style={{ width:`${(count/maxCat)*100}%`, height:'100%', background:CAT_COLORS[cat]||'#6b7280', borderRadius:3, transition:'width 0.7s var(--ease-out)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="chart-cell">
              <p className="chart-title">Tendance — 7 derniers jours</p>
              <div style={{ display:'flex', alignItems:'flex-end', gap:'0.35rem', height:80 }}>
                {weeklyData.map((d,i) => (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                    <span style={{ fontSize:'0.62rem', fontWeight:700, color: d.count>0?'var(--gold)':'transparent' }}>{d.count||''}</span>
                    <div style={{
                      width:'100%', borderRadius:'3px 3px 0 0', minHeight:4,
                      background: d.count>0 ? 'linear-gradient(180deg, var(--terra), rgba(196,98,45,0.25))' : 'var(--glass)',
                      height:`${(d.count/maxWeekly)*68+(d.count>0?4:0)}px`,
                      transition:'height 0.5s var(--ease-out)',
                    }} />
                    <span style={{ fontSize:'0.6rem', color:'var(--text-muted)', textTransform:'capitalize' }}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-cell" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <p className="chart-title" style={{ textAlign:'center' }}>Taux de résolution</p>
              <svg width="96" height="96" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--glass-border)" strokeWidth="9" />
                <circle cx="50" cy="50" r="40" fill="none"
                  stroke={gaugeColor} strokeWidth="9"
                  strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
                  style={{ transform:'rotate(-90deg)', transformOrigin:'50% 50%', transition:'stroke-dashoffset 0.8s var(--ease-out)', filter:`drop-shadow(0 0 6px ${gaugeColor})` }}
                />
                <text x="50" y="46" textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--text-bright)">{stats.resolutionRate}%</text>
                <text x="50" y="60" textAnchor="middle" fontSize="7.5" fill="var(--text-muted)">résolu</text>
              </svg>
              <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:4 }}>
                {stats.resolved} / {stats.total} signalement(s)
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-bar" style={{ marginBottom:'1rem' }}>
            <div className="search-wrap">
              <span className="search-icon-inner">🔍</span>
              <input
                type="text" value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Titre, adresse, citoyen, secteur…"
                className="search-input"
              />
            </div>
            <select className="filter-select" value={filterStatus}   onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="RESOLVED">Résolu</option>
              <option value="REJECTED">Rejeté</option>
            </select>
            <select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">Toutes catégories</option>
              {Object.entries(CAT_LABELS).map(([k,v]) => <option key={k} value={k}>{CAT_ICONS[k]} {v}</option>)}
            </select>
            <input type="date" className="filter-select date-input" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} title="Date de début" />
            <input type="date" className="filter-select date-input" value={filterDateTo}   onChange={e => setFilterDateTo(e.target.value)}   title="Date de fin" />
            <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="date">Plus récent</option>
              <option value="age">Plus ancien</option>
              <option value="votes">Plus de votes</option>
            </select>
            <button
              className={`btn btn-sm ${filterUrgent ? 'btn-danger' : 'btn-ghost'}`}
              onClick={() => setFilterUrgent(v => !v)}
              title="Signalements en attente depuis plus de 3 jours"
            >
              {filterUrgent ? '🔴' : '⚠'} Urgents {urgentCount > 0 && `(${urgentCount})`}
            </button>
            {(searchQuery||filterStatus||filterCategory||filterDateFrom||filterDateTo||filterUrgent) && (
              <button className="btn btn-ghost btn-sm"
                onClick={() => { setSearchQuery(''); setFilterStatus(''); setFilterCategory(''); setFilterDateFrom(''); setFilterDateTo(''); setFilterUrgent(false); }}>
                ✕ Réinitialiser
              </button>
            )}
          </div>

          {/* Bulk bar */}
          {selectedIds.size > 0 && (
            <div className="bulk-bar">
              <span className="bulk-count">{selectedIds.size} sélectionné(s)</span>
              <select className="filter-select" style={{ margin:0 }} value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
                <option value="">Changer le statut vers…</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="RESOLVED">Résolu</option>
                <option value="REJECTED">Rejeté</option>
                <option value="PENDING">En attente</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={handleBulkUpdate} disabled={!bulkStatus||bulkLoading}>
                {bulkLoading ? 'En cours…' : '✔ Appliquer'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>
                Désélectionner
              </button>
            </div>
          )}

          {/* Table */}
          <div className="data-table-wrap">
            <div className="data-table-head">
              <h3>Signalements à traiter</h3>
              <span>{filteredReports.length} affiché(s) · {stats.pending} en attente</span>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width:40 }}>
                      <input type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectedIds.size===filteredReports.length && filteredReports.length>0}
                      />
                    </th>
                    {['Cat.','Titre','Adresse','Citoyen','Secteur','Statut','SLA','Priorité','Actions'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign:'center', padding:'2.5rem', color:'var(--text-muted)', fontSize:'0.875rem' }}>
                      Aucun signalement correspondant aux filtres
                    </td></tr>
                  ) : filteredReports.map(report => {
                    const st       = STATUS[report.status] || STATUS.PENDING;
                    const sla      = getSLA(report.createdAt);
                    const isUpd    = updatingId === report.id;
                    const selected = selectedIds.has(report.id);
                    const isUrgent = sla.cls === 'red' || sla.cls === 'orange';
                    return (
                      <tr key={report.id} style={ selected ? { background:'var(--gold-dim)' } : isUrgent && (report.status==='PENDING'||report.status==='IN_PROGRESS') ? { borderLeft:'3px solid var(--red)' } : {} }>
                        <td><input type="checkbox" checked={selected} onChange={() => toggleSelect(report.id)} /></td>
                        <td style={{ position:'relative' }}>
                          <span style={{ fontSize:'1.2rem' }}>{CAT_ICONS[report.category]||'📌'}</span>
                          {report.photoUrl && (
                            <span title="Photo disponible" style={{ position:'absolute', bottom:4, right:4, width:8, height:8, background:'var(--green)', borderRadius:'50%', display:'block' }} />
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight:600, color:'var(--text-warm)', fontSize:'0.875rem' }}>{report.title}</span>
                          {report.description && (
                            <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', margin:'2px 0 0', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {report.description}
                            </p>
                          )}
                          {report.agentNotes && (
                            <p style={{ fontSize:'0.7rem', color:'var(--gold)', margin:'2px 0 0', fontStyle:'italic' }}>📝 Note agent</p>
                          )}
                        </td>
                        <td style={{ color:'var(--text-muted)', fontSize:'0.82rem', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {report.address || `${report.latitude?.toFixed(3)}, ${report.longitude?.toFixed(3)}`}
                          {report.latitude && report.longitude && (
                            <button
                              onClick={() => navigateToLocation(report)}
                              title="Naviguer vers ce lieu"
                              style={{ marginLeft:4, background:'none', border:'none', cursor:'pointer', fontSize:'0.85rem', padding:0, verticalAlign:'middle' }}
                            >🗺</button>
                          )}
                        </td>
                        <td style={{ color:'var(--text-body)' }}>{report.userFullName}</td>
                        <td style={{ fontSize:'0.78rem' }}>
                          {report.secteur
                            ? <span style={{ background:'var(--teal-dim,rgba(20,184,166,0.15))', color:'var(--teal)', borderRadius:4, padding:'2px 7px', fontWeight:600 }}>📍 {report.secteur}</span>
                            : <span style={{ color:'var(--text-faint)' }}>—</span>}
                          {report.assignedAgentName && !zoneOnly && (
                            <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:2 }}>{report.assignedAgentName}</div>
                          )}
                        </td>
                        <td><span className={`badge ${st.cls}`}><span className="badge-dot"/>{st.label}</span></td>
                        <td><span className={`sla sla-${sla.cls}`}>{sla.label}</span></td>
                        <td style={{ fontSize:'0.75rem', color:'var(--text-muted)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {report.priorityTitle
                            ? <span style={{ color:'var(--teal)' }}>⚑ {report.priorityTitle}</span>
                            : <span style={{ color:'var(--text-faint)' }}>—</span>}
                        </td>
                        <td>
                          <div className="action-row">
                            {report.status === 'PENDING' && (
                              <button onClick={() => updateStatus(report.id,'IN_PROGRESS')} disabled={isUpd} className="btn btn-info btn-sm">Prendre</button>
                            )}
                            {report.status === 'IN_PROGRESS' && (
                              <button onClick={() => updateStatus(report.id,'RESOLVED')} disabled={isUpd} className="btn btn-success btn-sm">Résoudre</button>
                            )}
                            {(report.status==='PENDING'||report.status==='IN_PROGRESS') && (
                              <button onClick={() => openRejectModal(report)} disabled={isUpd} className="btn btn-danger btn-sm" title="Rejeter avec raison">✕</button>
                            )}
                            <button onClick={() => analyzeReport(report)} disabled={analyzingId===report.id} className="btn btn-ghost btn-sm">
                              {analyzingId===report.id ? '…' : '🤖 IA'}
                            </button>
                            <button onClick={() => openDetails(report)} className="btn btn-ghost btn-sm">Détails</button>
                          </div>
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

      {/* ── Modal Analyse IA ── */}
      {analysisModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setAnalysisModal(null)}>
          <div className="modal" style={{ maxWidth:860, padding:0, overflow:'hidden', display:'flex', flexDirection:'column', maxHeight:'90vh' }}>
            <div className="modal-header" style={{ padding:'1.25rem 1.75rem', borderBottom:'1px solid var(--border-subtle)', marginBottom:0 }}>
              <h3>🤖 Analyse IA — {analysisModal.report.title}</h3>
              <button onClick={() => setAnalysisModal(null)} className="modal-close">✕</button>
            </div>
            <div style={{ display:'flex', flex:1, minHeight:0, overflow:'hidden' }}>
              <div style={{ flex:1, padding:'1.5rem', overflowY:'auto', borderRight:'1px solid var(--border-subtle)' }}>
                <p style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-muted)', marginBottom:'0.75rem' }}>Analyse automatique</p>
                <div className="modal-body">{renderMarkdown(analysisModal.text)}</div>
              </div>
              <div style={{ width:340, display:'flex', flexDirection:'column', minHeight:0 }}>
                <div style={{ padding:'0.875rem 1rem', background:'var(--gold-dim)', borderBottom:'1px solid var(--gold-border)' }}>
                  <p style={{ margin:0, fontWeight:700, fontSize:'0.875rem', color:'var(--gold)' }}>Assistant Agent Municipal</p>
                  <p style={{ margin:0, fontSize:'0.72rem', color:'var(--text-muted)' }}>Posez vos questions sur ce signalement</p>
                </div>
                <div style={{ flex:1, overflowY:'auto', padding:'0.875rem', display:'flex', flexDirection:'column', gap:'0.625rem', background:'var(--depth)' }}>
                  {agentMessages.map((msg, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:msg.role==='user'?'flex-end':'flex-start' }}>
                      <div className={`chat-msg ${msg.role==='user'?'user':'bot'}`}>
                        {msg.role==='assistant' ? renderMarkdown(msg.content) : msg.content}
                      </div>
                    </div>
                  ))}
                  {agentLoading && (
                    <div style={{ display:'flex', justifyContent:'flex-start' }}>
                      <div className="chat-msg bot" style={{ color:'var(--text-muted)' }}>En train de répondre…</div>
                    </div>
                  )}
                  <div ref={agentBottomRef} />
                </div>
                <div style={{ padding:'0.625rem', borderTop:'1px solid var(--border-subtle)', display:'flex', gap:'0.4rem', background:'var(--surface)' }}>
                  <textarea
                    value={agentInput} onChange={e => setAgentInput(e.target.value)}
                    onKeyDown={handleAgentKey} placeholder="Résume ce signalement…" rows={2}
                    className="chat-input" style={{ resize:'none', borderRadius:'var(--r-md)' }}
                  />
                  <button onClick={sendAgentMessage} disabled={agentLoading||!agentInput.trim()} className="chat-send">➤</button>
                </div>
              </div>
            </div>
            <div style={{ padding:'0.875rem 1.75rem', borderTop:'1px solid var(--border-subtle)', display:'flex', justifyContent:'flex-end' }}>
              <button onClick={() => setAnalysisModal(null)} className="btn btn-primary">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Rejet avec raison ── */}
      {rejectModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setRejectModal(null)}>
          <div className="modal" style={{ maxWidth:480 }}>
            <div className="modal-header">
              <h3>⚠ Rejeter ce signalement</h3>
              <button onClick={() => setRejectModal(null)} className="modal-close">✕</button>
            </div>
            <p style={{ fontSize:'0.875rem', color:'var(--text-muted)', marginBottom:'1rem' }}>
              Vous allez rejeter : <strong style={{ color:'var(--text-warm)' }}>{rejectModal.title}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Raison du rejet <span style={{ color:'var(--text-faint)' }}>(sauvegardée comme note interne)</span></label>
              <textarea
                value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Ex: Doublon avec signalement #123, hors de notre juridiction, informations insuffisantes…"
                rows={4} className="form-textarea" autoFocus
              />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.5rem', marginTop:'1rem' }}>
              <button onClick={() => setRejectModal(null)} className="btn btn-ghost">Annuler</button>
              <button onClick={confirmReject} disabled={rejecting} className="btn btn-danger">
                {rejecting ? 'Rejet en cours…' : '✕ Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Détails ── */}
      {detailsModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setDetailsModal(null)}>
          <div className="modal" style={{ maxWidth:640 }}>
            <div className="modal-header">
              <div>
                <h3>{detailsModal.title}</h3>
                <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:'0.2rem' }}>
                  {CAT_ICONS[detailsModal.category]} {CAT_LABELS[detailsModal.category]} · {detailsModal.userFullName}
                  {detailsModal.address && ` · ${detailsModal.address}`}
                </p>
              </div>
              <button onClick={() => setDetailsModal(null)} className="modal-close">✕</button>
            </div>

            {/* Navigate + info row */}
            <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.875rem', flexWrap:'wrap' }}>
              {detailsModal.latitude && detailsModal.longitude && (
                <button onClick={() => navigateToLocation(detailsModal)} className="btn btn-ghost btn-sm">
                  🗺 Naviguer ({detailsModal.latitude?.toFixed(4)}, {detailsModal.longitude?.toFixed(4)})
                </button>
              )}
              {detailsModal.secteur && (
                <span style={{ background:'var(--amber-dim)', color:'var(--amber)', borderRadius:'var(--r-full)', padding:'0.28rem 0.85rem', fontSize:'0.75rem', fontWeight:600 }}>
                  📍 {detailsModal.secteur}
                </span>
              )}
              {detailsModal.assignedAgentName && (
                <span style={{ background:'var(--glass)', color:'var(--text-muted)', borderRadius:'var(--r-full)', padding:'0.28rem 0.85rem', fontSize:'0.75rem' }}>
                  🛠 {detailsModal.assignedAgentName}
                </span>
              )}
            </div>

            <div className="tabs">
              {[
                ['notes',      'Notes'],
                ['comments',   detailsModal.commentCount > 0 ? `💬 ${detailsModal.commentCount}` : '💬 Commentaires'],
                ['photo',      detailsModal.photoUrl ? '📷 Photo' : 'Photo'],
                ['history',    'Historique'],
                ['priority',   'Priorité'],
                ['reassign',   'Réassigner'],
                ['resolution', detailsModal.resolutionPhotoUrl ? '✅ Résolution' : '📸 Résolution'],
              ].map(([tab, label]) => (
                <button key={tab} className={`tab-btn${detailsTab===tab?' active':''}`} onClick={() => handleTabChange(tab)}>
                  {label}
                </button>
              ))}
            </div>

            {/* Tab: Notes */}
            {detailsTab === 'notes' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
                <p style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>Notes internes visibles uniquement par les agents et admins.</p>
                <textarea value={notesValue} onChange={e => setNotesValue(e.target.value)}
                  placeholder="Ajouter des notes internes sur ce signalement…" rows={6} className="form-textarea" />
                <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.5rem' }}>
                  <button onClick={() => setDetailsModal(null)} className="btn btn-ghost">Fermer</button>
                  <button onClick={saveNotes} className="btn btn-primary" disabled={savingNotes}>
                    {savingNotes ? 'Sauvegarde…' : '💾 Sauvegarder'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Commentaires */}
            {detailsTab === 'comments' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                <div style={{ maxHeight:280, overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.5rem', minHeight:60 }}>
                  {commentsLoading ? (
                    <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', textAlign:'center', padding:'1.5rem' }}>Chargement…</p>
                  ) : reportComments.length === 0 ? (
                    <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', textAlign:'center', padding:'1.5rem' }}>Aucun commentaire sur ce signalement.</p>
                  ) : reportComments.map(c => (
                    <div key={c.id} style={{
                      background: c.authorRole === 'CITIZEN' ? 'var(--glass)' : 'var(--terra-dim)',
                      borderRadius:'var(--r-md)', padding:'0.6rem 0.85rem',
                      borderLeft:`3px solid ${c.authorRole === 'CITIZEN' ? 'var(--blue)' : 'var(--terra)'}`,
                    }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.2rem' }}>
                        <span style={{ fontSize:'0.75rem', fontWeight:700, color: c.authorRole === 'CITIZEN' ? 'var(--blue)' : 'var(--terra)' }}>
                          {c.authorRole === 'CITIZEN' ? '👤' : '🛠'} {c.authorName}
                        </span>
                        <span style={{ fontSize:'0.68rem', color:'var(--text-faint)' }}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}
                        </span>
                      </div>
                      <p style={{ fontSize:'0.83rem', color:'var(--text-body)', margin:0 }}>{c.content}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:'0.5rem', borderTop:'1px solid var(--border-subtle)', paddingTop:'0.75rem' }}>
                  <input
                    type="text" value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendReportComment()}
                    placeholder="Répondre au citoyen…"
                    className="form-input" style={{ flex:1 }}
                  />
                  <button onClick={sendReportComment} disabled={sendingComment || !commentText.trim()} className="btn btn-primary">
                    {sendingComment ? '…' : 'Envoyer'}
                  </button>
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button onClick={() => setDetailsModal(null)} className="btn btn-ghost">Fermer</button>
                </div>
              </div>
            )}

            {/* Tab: Photo */}
            {detailsTab === 'photo' && (
              <div>
                {detailsModal.photoUrl ? (
                  <div>
                    <img
                      src={detailsModal.photoUrl}
                      alt="Photo du signalement"
                      style={{ width:'100%', maxHeight:380, objectFit:'cover', borderRadius:'var(--r-md)', border:'1px solid var(--border-vis)' }}
                    />
                    <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:'0.5rem', textAlign:'center' }}>
                      Photo soumise par le citoyen — {detailsModal.userFullName}
                    </p>
                  </div>
                ) : (
                  <div style={{ textAlign:'center', padding:'2.5rem', color:'var(--text-muted)' }}>
                    <p style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>📷</p>
                    <p style={{ fontSize:'0.875rem' }}>Aucune photo attachée à ce signalement</p>
                  </div>
                )}
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'1rem' }}>
                  <button onClick={() => setDetailsModal(null)} className="btn btn-ghost">Fermer</button>
                </div>
              </div>
            )}

            {/* Tab: Historique */}
            {detailsTab === 'history' && (
              <div>
                {historyLoading ? (
                  <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
                ) : statusHistory.length === 0 ? (
                  <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem', fontSize:'0.875rem' }}>Aucun changement de statut enregistré</p>
                ) : (
                  <div className="timeline">
                    {statusHistory.map((h, i) => (
                      <div key={h.id||i} className="timeline-item">
                        <div className="timeline-dot" />
                        <div>
                          <div style={{ display:'flex', gap:'0.4rem', alignItems:'center', flexWrap:'wrap' }}>
                            {h.fromStatus && <span className={`badge ${STATUS[h.fromStatus]?.cls||'badge-pending'}`}>{statusLabel(h.fromStatus)}</span>}
                            {h.fromStatus && <span style={{ color:'var(--text-muted)' }}>→</span>}
                            <span className={`badge ${STATUS[h.toStatus]?.cls||'badge-pending'}`}>{statusLabel(h.toStatus)}</span>
                          </div>
                          <p style={{ fontSize:'0.775rem', color:'var(--text-muted)', margin:'0.2rem 0 0' }}>
                            par <strong style={{ color:'var(--text-body)' }}>{h.changedByName}</strong>
                            {' · '}{h.changedAt ? new Date(h.changedAt).toLocaleString('fr-FR') : '—'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'1rem' }}>
                  <button onClick={() => setDetailsModal(null)} className="btn btn-ghost">Fermer</button>
                </div>
              </div>
            )}

            {/* Tab: Priorité */}
            {detailsTab === 'priority' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
                {detailsModal.priorityTitle && (
                  <div className="alert alert-info">⚑ Actuellement lié à : <strong>{detailsModal.priorityTitle}</strong></div>
                )}
                <div className="form-group">
                  <label className="form-label">Associer à une priorité publique</label>
                  {prioritiesLoading ? (
                    <p style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>Chargement…</p>
                  ) : (
                    <select className="form-select" value={selectedPriorityId} onChange={e => setSelectedPriorityId(e.target.value)}>
                      <option value="">— Aucune priorité associée —</option>
                      {priorities.map(p => <option key={p.id} value={p.id}>{p.title} ({p.status})</option>)}
                    </select>
                  )}
                </div>
                <p style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>Lier ce signalement à un chantier ou projet municipal.</p>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.5rem' }}>
                  <button onClick={() => setDetailsModal(null)} className="btn btn-ghost">Fermer</button>
                  <button onClick={savePriorityLink} className="btn btn-primary" disabled={linkingPriority}>
                    {linkingPriority ? 'Liaison…' : '⚑ Appliquer'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Réassigner */}
            {detailsTab === 'reassign' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
                {detailsModal.assignedAgentName && (
                  <div className="alert alert-info">
                    🛠 Actuellement assigné à : <strong>{detailsModal.assignedAgentName}</strong>
                    {detailsModal.secteur && ` (${detailsModal.secteur})`}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Choisir un nouvel agent</label>
                  {agentsLoading ? (
                    <p style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>Chargement des agents…</p>
                  ) : agents.length === 0 ? (
                    <p style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>Aucun agent disponible</p>
                  ) : (
                    <select className="form-select" value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)}>
                      <option value="">— Sélectionner un agent —</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.fullName}{a.secteur ? ` — ${a.secteur}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <p style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>
                  Réassigner ce signalement à un autre agent municipal. Le secteur sera mis à jour automatiquement.
                </p>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.5rem' }}>
                  <button onClick={() => setDetailsModal(null)} className="btn btn-ghost">Fermer</button>
                  <button onClick={saveReassignment} className="btn btn-primary" disabled={reassigning || !selectedAgentId}>
                    {reassigning ? 'Réassignation…' : '🔄 Réassigner'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Photo de résolution */}
            {detailsTab === 'resolution' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
                <p style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>
                  Ajoutez une photo de preuve après résolution — visible par le citoyen et les superviseurs.
                </p>

                {/* Existing resolution photo */}
                {detailsModal.resolutionPhotoUrl && (
                  <div>
                    <p style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--green)', marginBottom:'0.5rem' }}>✅ Photo de résolution existante</p>
                    <img
                      src={detailsModal.resolutionPhotoUrl}
                      alt="Photo de résolution"
                      style={{ width:'100%', maxHeight:300, objectFit:'cover', borderRadius:'var(--r-md)', border:'1px solid var(--green)' }}
                    />
                  </div>
                )}

                {/* Upload new photo */}
                <div className="form-group">
                  <label className="form-label">{detailsModal.resolutionPhotoUrl ? 'Remplacer la photo' : 'Ajouter une photo'}</label>
                  <input
                    type="file" accept="image/*"
                    onChange={handleResPhotoFile}
                    className="form-input"
                    style={{ padding:'0.4rem 0.6rem', cursor:'pointer' }}
                  />
                </div>

                {/* Preview */}
                {resolutionPhoto && (
                  <div>
                    <p style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:'0.4rem' }}>Aperçu</p>
                    <img
                      src={resolutionPhoto}
                      alt="Aperçu"
                      style={{ width:'100%', maxHeight:260, objectFit:'cover', borderRadius:'var(--r-md)', border:'1px solid var(--border-vis)' }}
                    />
                  </div>
                )}

                <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.5rem' }}>
                  <button onClick={() => setDetailsModal(null)} className="btn btn-ghost">Fermer</button>
                  <button
                    onClick={saveResolutionPhoto}
                    className="btn btn-success"
                    disabled={savingResPhoto || !resolutionPhoto}
                  >
                    {savingResPhoto ? 'Enregistrement…' : '📸 Enregistrer la photo'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Toast toasts={toasts} />
    </>
  );
}
