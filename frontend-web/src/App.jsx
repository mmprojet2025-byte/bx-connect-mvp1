import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Pages publiques
import Accueil          from './pages/Accueil'
import APropos          from './pages/APropos'
import Login            from './pages/auth/Login'
import Register         from './pages/auth/Register'
import Activites        from './pages/activites/Activites'
import ActiviteDetail   from './pages/activites/ActiviteDetail'
import Projets          from './pages/projets/Projets'
import NotFound         from './pages/NotFound'
import Notifications    from './pages/Notifications'
import Annonces         from './pages/annonces/Annonces'

// Pages membres connectés
import Dashboard        from './pages/dashboard/Dashboard'
import Profil           from './pages/profil/Profil'
import Groupes          from './pages/groupes/Groupes'
import Messagerie       from './pages/messagerie/Messagerie'
import Prestations      from './pages/prestations/Prestations'

// Pages Paiement Stripe
import PaiementStripe      from './pages/paiement/PaiementStripe'
import PaiementSuccess     from './pages/paiement/PaiementSuccess'
import PaiementCancel      from './pages/paiement/PaiementCancel'
import HistoriquePaiements from './pages/paiement/HistoriquePaiements'

// Pages Partenaire
import PartenaireSpace from './pages/partenaire/PartenaireSpace'

// Pages Référent
import ReferentDashboard  from './pages/referent/ReferentDashboard'
import ReferentGroupes    from './pages/referent/ReferentGroupes'
import ReferentMembres    from './pages/referent/ReferentMembres'
import ReferentDemandes   from './pages/referent/ReferentDemandes'
import ReferentActivites  from './pages/referent/ReferentActivites'
import ReferentMessagerie from './pages/referent/ReferentMessagerie'
import GestionPrestations from './pages/prestations/GestionPrestations'

// Pages Admin
import AdminDashboard    from './pages/admin/AdminDashboard'
import AdminUtilisateurs from './pages/admin/AdminUtilisateurs'
import AdminActivites    from './pages/admin/AdminActivites'
import AdminProjets      from './pages/admin/AdminProjets'
import AdminGroupes      from './pages/admin/AdminGroupes'
import AdminReferents    from './pages/admin/AdminReferents'
import SuperAdminRoute      from './routes/SuperAdminRoute'
import SuperAdminDashboard  from './pages/super-admin/SuperAdminDashboard'
import SuperAdminAdmins     from './pages/super-admin/SuperAdminAdmins'
import SuperAdminLogs       from './pages/super-admin/SuperAdminLogs'

// ─── Guards ───────────────────────────────────────────────────────────────────
function PrivateRoute({ children }) {
  const { isAuthenticated, isSuperAdmin } = useAuth()
  if (isAuthenticated && isSuperAdmin) return <Navigate to="/super-admin/dashboard" replace />
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function PartenaireRoute({ children }) {
  const { isAuthenticated, isPartenaire, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isPartenaire && !isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function ReferentRoute({ children }) {
  const { isAuthenticated, isReferent } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isReferent) return <Navigate to="/dashboard" replace />
  return children
}

function MembreRoute({ children }) {
  const { isAuthenticated, isMembre } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isMembre) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* ── Pages publiques ── */}
      <Route path="/"              element={<Accueil />} />
      <Route path="/a-propos"      element={<APropos />} />
      <Route path="/login"         element={<Login />} />
      <Route path="/register"      element={<Register />} />
      <Route path="/activites"     element={<Activites />} />
      <Route path="/activites/:id" element={<ActiviteDetail />} />
      <Route path="/projets"       element={<Projets />} />
      <Route path="/annonces"      element={<Annonces />} />

      {/* ── Pages membres connectés ── */}
      <Route path="/groupes"       element={<PrivateRoute><Groupes /></PrivateRoute>} />
      <Route path="/messagerie"    element={<MembreRoute><Messagerie /></MembreRoute>} />
      <Route path="/dashboard"     element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/profil"        element={<PrivateRoute><Profil /></PrivateRoute>} />
      <Route path="/prestations"   element={<PrivateRoute><Prestations /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />

      {/* ── Pages Paiement Stripe ── */}
      <Route path="/paiement/stripe"     element={<PrivateRoute><PaiementStripe /></PrivateRoute>} />
      <Route path="/paiement/succes"     element={<PrivateRoute><PaiementSuccess /></PrivateRoute>} />
      <Route path="/paiement/annule"     element={<PaiementCancel />} />
      <Route path="/paiement/historique" element={<PrivateRoute><HistoriquePaiements /></PrivateRoute>} />

      {/* ── Pages Partenaire ── */}
      <Route path="/partenaire" element={<PartenaireRoute><PartenaireSpace /></PartenaireRoute>} />

      {/* ── Pages Référent ── */}
      <Route path="/referent"             element={<Navigate to="/referent/dashboard" replace />} />
      <Route path="/referent/dashboard"   element={<ReferentRoute><ReferentDashboard /></ReferentRoute>} />
      <Route path="/referent/groupes"     element={<ReferentRoute><ReferentGroupes /></ReferentRoute>} />
      <Route path="/referent/membres"     element={<ReferentRoute><ReferentMembres /></ReferentRoute>} />
      <Route path="/referent/demandes"    element={<ReferentRoute><ReferentDemandes /></ReferentRoute>} />
      <Route path="/referent/activites"   element={<ReferentRoute><ReferentActivites /></ReferentRoute>} />
      <Route path="/referent/messagerie"  element={<ReferentRoute><ReferentMessagerie /></ReferentRoute>} />
      <Route path="/referent/prestations" element={<ReferentRoute><GestionPrestations /></ReferentRoute>} />

      {/* ── Pages Admin ── */}
      <Route path="/admin"               element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/utilisateurs"  element={<AdminRoute><AdminUtilisateurs /></AdminRoute>} />
      <Route path="/admin/referents"     element={<AdminRoute><AdminReferents /></AdminRoute>} />
      <Route path="/admin/activites"     element={<AdminRoute><AdminActivites /></AdminRoute>} />
      <Route path="/admin/projets"       element={<AdminRoute><AdminProjets /></AdminRoute>} />
      <Route path="/admin/groupes"       element={<AdminRoute><AdminGroupes /></AdminRoute>} />
      <Route path="/admin/prestations"   element={<AdminRoute><GestionPrestations /></AdminRoute>} />

      {/* ── Pages SUPER_ADMIN ── */}
      <Route path="/super-admin"           element={<Navigate to="/super-admin/dashboard" replace />} />
      <Route path="/super-admin/dashboard" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
      <Route path="/super-admin/admins"    element={<SuperAdminRoute><SuperAdminAdmins /></SuperAdminRoute>} />
      <Route path="/super-admin/logs"      element={<SuperAdminRoute><SuperAdminLogs /></SuperAdminRoute>} />

      {/* ── Page 404 ── */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
