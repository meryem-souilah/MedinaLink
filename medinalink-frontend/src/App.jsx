import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing    from './pages/Landing';
import Login      from './pages/Login';
import Register   from './pages/Register';
import Reports    from './pages/Reports';
import CreateReport from './pages/CreateReport';
import Map        from './pages/Map';
import Admin      from './pages/Admin';
import Dashboard  from './pages/Dashboard';
import Priorities from './pages/Priorities';
import Profile    from './pages/Profile';

// ── Guards ────────────────────────────────────────────────

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

/** Réservé aux CITOYENS uniquement */
function CitizenRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated)            return <Navigate to="/login"           replace />;
  if (user?.role === 'AGENT')      return <Navigate to="/agent/dashboard" replace />;
  if (user?.role === 'ADMIN')      return <Navigate to="/admin/dashboard" replace />;
  return children;
}

/** Réservé aux AGENTS uniquement */
function AgentRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated)            return <Navigate to="/login"            replace />;
  if (user?.role === 'CITIZEN')    return <Navigate to="/citizen/reports"  replace />;
  if (user?.role === 'ADMIN')      return <Navigate to="/admin/dashboard"  replace />;
  return children;
}

/** Réservé aux ADMINS uniquement */
function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated)            return <Navigate to="/login"            replace />;
  if (user?.role === 'CITIZEN')    return <Navigate to="/citizen/reports"  replace />;
  if (user?.role === 'AGENT')      return <Navigate to="/agent/dashboard"  replace />;
  return children;
}

/** "/" → landing for guests, dashboard for logged-in users */
function RoleRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated)            return <Landing />;
  if (user?.role === 'ADMIN')      return <Navigate to="/admin/dashboard"  replace />;
  if (user?.role === 'AGENT')      return <Navigate to="/agent/dashboard"  replace />;
  return                                  <Navigate to="/citizen/reports"  replace />;
}

// ── App ───────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ── Espace Citoyen ── */}
          <Route path="/citizen/reports"        element={<CitizenRoute><Reports /></CitizenRoute>} />
          <Route path="/citizen/reports/create" element={<CitizenRoute><CreateReport /></CitizenRoute>} />
          <Route path="/citizen/map"            element={<CitizenRoute><Map /></CitizenRoute>} />
          <Route path="/citizen/priorities"     element={<CitizenRoute><Priorities /></CitizenRoute>} />

          {/* ── Espace Agent Municipal ── */}
          <Route path="/agent/dashboard"  element={<AgentRoute><Dashboard /></AgentRoute>} />
          <Route path="/agent/map"        element={<AgentRoute><Map /></AgentRoute>} />
          <Route path="/agent/priorities" element={<AgentRoute><Priorities /></AgentRoute>} />

          {/* ── Espace Administrateur ── */}
          <Route path="/admin/dashboard"  element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/admin/reports"    element={<AdminRoute><Dashboard /></AdminRoute>} />
          <Route path="/admin/map"        element={<AdminRoute><Map /></AdminRoute>} />

          {/* Profil — accessible à tous les utilisateurs connectés */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Racine */}
          <Route path="/"  element={<RoleRedirect />} />
          <Route path="*"  element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
