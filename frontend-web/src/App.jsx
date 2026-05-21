import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Pages publiques
import Accueil        from './pages/Accueil'
import APropos        from './pages/APropos'
import Login          from './pages/auth/Login'
import Register       from './pages/auth/Register'
import Activites      from './pages/activites/Activites'
import ActiviteDetail from './pages/activites/ActiviteDetail'
import Projets        from './pages/projets/Projets'
import NotFound       from './pages/NotFound'

// Pages membres connectés
import Dashboard      from './pages/dashboard/Dashboard'
import Profil         from './pages/profil/Profil'
import Groupes        from './pages/groupes/Groupes'
import Messagerie     from './pages/messagerie/Messagerie'

// Pages Admin
import AdminDashboard    from './pages/admin/AdminDashboard'
import AdminUtilisateurs from './pages/admin/AdminUtilisateurs'
import AdminActivites    from './pages/admin/AdminActivites'
import AdminProjets      from './pages/admin/AdminProjets'

// Pages Partenaire
import PartenaireSpace from './pages/partenaire/PartenaireSpace'

// Pages Paiement Stripe
import PaiementStripe      from './pages/paiement/PaiementStripe'
import PaiementSuccess     from './pages/paiement/PaiementSuccess'
import PaiementCancel      from './pages/paiement/PaiementCancel'
import HistoriquePaiements from './pages/paiement/HistoriquePaiements'

// Pages Référent
import ReferentDashboard from './pages/referent/ReferentDashboard'

// ─── Route protégée : redirige vers /login si non connecté ───────────────────
function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

// ─── Route Admin : redirige si pas admin ─────────────────────────────────────
function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

// ─── Route Partenaire : redirige si pas partenaire ───────────────────────────
function PartenaireRoute({ children }) {
  const { isAuthenticated, isPartenaire, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isPartenaire && !isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

// ─── Route Référent : redirige si pas référent ───────────────────────────────
function ReferentRoute({ children }) {
  const { isAuthenticated, isReferent, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isReferent && !isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* ── Pages publiques ── */}
      <Route path="/"           element={<Accueil />} />
      <Route path="/a-propos"   element={<APropos />} />
      <Route path="/login"      element={<Login />} />
      <Route path="/register"   element={<Register />} />
      <Route path="/activites"  element={<Activites />} />
      <Route path="/activites/:id" element={<ActiviteDetail />} />
      <Route path="/projets"    element={<Projets />} />

      {/* ── Pages membres connectés ── */}
      <Route path="/groupes"    element={<PrivateRoute><Groupes /></PrivateRoute>} />
      <Route path="/messagerie" element={<PrivateRoute><Messagerie /></PrivateRoute>} />
      <Route path="/dashboard"  element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/profil"     element={<PrivateRoute><Profil /></PrivateRoute>} />

      {/* ── Pages Paiement Stripe ── */}
      <Route path="/paiement/stripe"    element={<PrivateRoute><PaiementStripe /></PrivateRoute>} />
      <Route path="/paiement/succes"    element={<PrivateRoute><PaiementSuccess /></PrivateRoute>} />
      <Route path="/paiement/annule"    element={<PaiementCancel />} />
      <Route path="/paiement/historique" element={<PrivateRoute><HistoriquePaiements /></PrivateRoute>} />

      {/* ── Pages Partenaire ── */}
      <Route path="/partenaire" element={<PartenaireRoute><PartenaireSpace /></PartenaireRoute>} />

      {/* ── Pages Référent ── */}
      <Route path="/referent"   element={<ReferentRoute><ReferentDashboard /></ReferentRoute>} />

      {/* ── Pages Admin ── */}
      <Route path="/admin"               element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/utilisateurs"  element={<AdminRoute><AdminUtilisateurs /></AdminRoute>} />
      <Route path="/admin/activites"     element={<AdminRoute><AdminActivites /></AdminRoute>} />
      <Route path="/admin/projets"       element={<AdminRoute><AdminProjets /></AdminRoute>} />

      {/* ── Page 404 ── */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}