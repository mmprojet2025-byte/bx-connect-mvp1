import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AppSidebar from './components/navigation/AppSidebar'

// Pages publiques
import Accueil          from './pages/Accueil'
import APropos          from './pages/APropos'
import Login            from './pages/auth/Login'
import Register         from './pages/auth/Register'
import ForgotPassword   from './pages/auth/ForgotPassword'
import Activites        from './pages/activites/Activites'
import ActiviteDetail   from './pages/activites/ActiviteDetail'
import PresenceSheet    from './pages/activites/PresenceSheet'
import Projets          from './pages/projets/Projets'
import NotFound         from './pages/NotFound'
import Notifications    from './pages/Notifications'
import Annonces         from './pages/annonces/Annonces'
import LegalPage        from './pages/legal/LegalPage'

// Pages membres connectés
import Dashboard        from './pages/dashboard/Dashboard'
import Profil           from './pages/profil/Profil'
import Groupes          from './pages/groupes/Groupes'
import GroupeEspace     from './pages/groupes/GroupeEspace'
import Messagerie       from './pages/messagerie/Messagerie'
import BusinessConversations from './pages/messagerie/BusinessConversations'

// Pages Partenaire
import PartenaireSpace from './pages/partenaire/PartenaireSpace'

// Pages Référent
import ReferentDashboard  from './pages/referent/ReferentDashboard'
import ReferentGroupes    from './pages/referent/ReferentGroupes'
import ReferentMembres    from './pages/referent/ReferentMembres'
import ReferentDemandes   from './pages/referent/ReferentDemandes'
import ReferentActivites  from './pages/referent/ReferentActivites'
import ReferentProjets    from './pages/referent/ReferentProjets'
import ReferentMessagerie from './pages/referent/ReferentMessagerie'

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
import { getDefaultRouteForRole } from './routes/roleRoutes'
import { trackDashboardView } from './monitoring/analytics'

// ─── Guards ───────────────────────────────────────────────────────────────────
function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to={getDefaultRouteForRole(user?.role)} replace />
  return children
}

function AdminOrSuperAdminRoute({ children }) {
  const { isAuthenticated, isAdmin, isSuperAdmin, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin && !isSuperAdmin) return <Navigate to={getDefaultRouteForRole(user?.role)} replace />
  return children
}

function PartenaireRoute({ children }) {
  const { isAuthenticated, isPartenaire, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isPartenaire) return <Navigate to={getDefaultRouteForRole(user?.role)} replace />
  return children
}

function ReferentRoute({ children }) {
  const { isAuthenticated, isReferent, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isReferent) return <Navigate to={getDefaultRouteForRole(user?.role)} replace />
  return children
}

function MembreRoute({ children }) {
  const { isAuthenticated, isMembre, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isMembre) return <Navigate to={getDefaultRouteForRole(user?.role)} replace />
  return children
}

function PublicOrMembreRoute({ children }) {
  const { isAuthenticated, isMembre, user } = useAuth()
  if (isAuthenticated && !isMembre) return <Navigate to={getDefaultRouteForRole(user?.role)} replace />
  return children
}

function ActivityCatalogRoute({ children }) {
  const { isAuthenticated, isMembre, isAdmin, isReferent, isSuperAdmin, user } = useAuth()
  if (isAuthenticated && !isMembre && !isAdmin && !isReferent && !isSuperAdmin) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />
  }
  return children
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuth()
  if (isAuthenticated) return <Navigate to={getDefaultRouteForRole(user?.role)} replace />
  return children
}

function MvpHiddenRoute() {
  const { isAuthenticated, user } = useAuth()
  // MVP1.5 / masqué volontairement : les modules avancés restent dans le code,
  // mais ne sont pas exposés dans la navigation ni accessibles directement en MVP1.
  if (isAuthenticated) return <Navigate to={getDefaultRouteForRole(user?.role)} replace />
  return <NotFound />
}

const PUBLIC_ONLY_PATHS = new Set([
  '/login',
  '/register',
  '/mot-de-passe-oublie',
  '/forgot-password',
])

export default function App() {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const showAppShell = isAuthenticated && !PUBLIC_ONLY_PATHS.has(location.pathname)
  const [contextSidebarCollapsed, setContextSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = window.localStorage.getItem('bx-app-sidebar-collapsed')
      ?? window.localStorage.getItem('bx-context-sidebar-collapsed')
    return stored === 'true'
  })

  useEffect(() => {
    window.localStorage.setItem('bx-app-sidebar-collapsed', String(contextSidebarCollapsed))
  }, [contextSidebarCollapsed])

  useEffect(() => {
    if (!isAuthenticated) return

    const dashboardRoutes = new Set([
      '/dashboard',
      '/referent/dashboard',
      '/admin/dashboard',
      '/super-admin/dashboard',
      '/partenaire',
    ])

    if (dashboardRoutes.has(location.pathname)) {
      trackDashboardView(user?.role, location.pathname)
    }
  }, [isAuthenticated, location.pathname, user?.role])

  return (
    <>
      {showAppShell && (
        <AppSidebar
          contextCollapsed={contextSidebarCollapsed}
          onToggleContext={() => setContextSidebarCollapsed(value => !value)}
        />
      )}
      <div className={showAppShell
        ? `min-h-screen bg-[#f5f7fb] transition-[padding] duration-200 ${contextSidebarCollapsed ? 'lg:pl-[88px]' : 'lg:pl-[260px]'}`
        : ''}>
        <Routes>
          {/* ── Pages publiques ── */}
          <Route path="/"              element={<Accueil />} />
          <Route path="/a-propos"      element={<APropos />} />
          <Route path="/login"         element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register"      element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          <Route path="/mot-de-passe-oublie" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
          <Route path="/forgot-password" element={<Navigate to="/mot-de-passe-oublie" replace />} />
          <Route path="/activites"     element={<ActivityCatalogRoute><Activites /></ActivityCatalogRoute>} />
          <Route path="/activites/:id" element={<ActivityCatalogRoute><ActiviteDetail /></ActivityCatalogRoute>} />
          <Route path="/groupes"       element={<PublicOrMembreRoute><Groupes /></PublicOrMembreRoute>} />
          <Route path="/groupes/:id"   element={<GroupeEspace />} />
          <Route path="/projets/:id"   element={<Projets />} />
          <Route path="/projets"       element={<Projets />} />
          <Route path="/annonces"      element={<Annonces />} />
          <Route path="/conditions-utilisation" element={<LegalPage document="terms" />} />
          <Route path="/politique-confidentialite" element={<LegalPage document="privacy" />} />
          <Route path="/mentions-legales" element={<LegalPage document="notices" />} />

          {/* ── Pages membres connectés ── */}
          <Route path="/messagerie"    element={<MembreRoute><Messagerie /></MembreRoute>} />
          <Route path="/dashboard"     element={<MembreRoute><Dashboard /></MembreRoute>} />
          <Route path="/profil"        element={<PrivateRoute><Profil /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />

          {/* MVP1.5 / masqué volontairement */}
          <Route path="/prestations" element={<MvpHiddenRoute />} />
          <Route path="/paiement/*" element={<MvpHiddenRoute />} />

          {/* ── Pages Partenaire ── */}
          <Route path="/partenaire" element={<PartenaireRoute><PartenaireSpace /></PartenaireRoute>} />

          {/* ── Pages Référent ── */}
          <Route path="/referent"             element={<Navigate to="/referent/dashboard" replace />} />
          <Route path="/referent/dashboard"   element={<ReferentRoute><ReferentDashboard /></ReferentRoute>} />
          <Route path="/referent/groupes"     element={<ReferentRoute><ReferentGroupes /></ReferentRoute>} />
          <Route path="/referent/membres"     element={<ReferentRoute><ReferentMembres /></ReferentRoute>} />
          <Route path="/referent/demandes"    element={<ReferentRoute><ReferentDemandes /></ReferentRoute>} />
          <Route path="/referent/activites"   element={<ReferentRoute><ReferentActivites /></ReferentRoute>} />
          <Route path="/referent/activites/:id/presences" element={<ReferentRoute><PresenceSheet backTo="/referent/activites" tone="teal" /></ReferentRoute>} />
          <Route path="/referent/projets"     element={<ReferentRoute><ReferentProjets /></ReferentRoute>} />
          <Route path="/referent/messagerie"  element={<ReferentRoute><ReferentMessagerie /></ReferentRoute>} />
          <Route path="/referent/conversations" element={<ReferentRoute><BusinessConversations mode="referent" /></ReferentRoute>} />
          <Route path="/referent/annonces"    element={<ReferentRoute><Annonces /></ReferentRoute>} />

          {/* MVP1.5 / masqué volontairement */}
          <Route path="/referent/partenaires" element={<MvpHiddenRoute />} />
          <Route path="/referent/rapports" element={<MvpHiddenRoute />} />
          <Route path="/referent/impact" element={<MvpHiddenRoute />} />
          <Route path="/referent/prestations" element={<MvpHiddenRoute />} />

          {/* ── Pages Admin ── */}
          <Route path="/admin"               element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard"     element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/utilisateurs"  element={<AdminRoute><AdminUtilisateurs /></AdminRoute>} />
          <Route path="/admin/referents"     element={<AdminRoute><AdminReferents /></AdminRoute>} />
          <Route path="/admin/activites"     element={<AdminRoute><AdminActivites /></AdminRoute>} />
          <Route path="/admin/activites/:id/presences" element={<AdminRoute><PresenceSheet backTo="/admin/activites" /></AdminRoute>} />
          <Route path="/admin/projets"       element={<AdminRoute><AdminProjets /></AdminRoute>} />
          <Route path="/admin/groupes"       element={<AdminRoute><AdminGroupes /></AdminRoute>} />
          <Route path="/admin/annonces"      element={<AdminRoute><Annonces /></AdminRoute>} />
          <Route path="/admin/conversations" element={<AdminOrSuperAdminRoute><BusinessConversations mode="admin" /></AdminOrSuperAdminRoute>} />

          {/* MVP1.5 / masqué volontairement */}
          <Route path="/admin/soutiens" element={<MvpHiddenRoute />} />
          <Route path="/admin/partenaires/affectations" element={<MvpHiddenRoute />} />
          <Route path="/admin/prestations" element={<MvpHiddenRoute />} />
          <Route path="/impact" element={<MvpHiddenRoute />} />

          {/* ── Pages SUPER_ADMIN ── */}
          <Route path="/super-admin"           element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="/super-admin/dashboard" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
          <Route path="/super-admin/admins"    element={<SuperAdminRoute><SuperAdminAdmins /></SuperAdminRoute>} />
          <Route path="/super-admin/utilisateurs" element={<SuperAdminRoute><AdminUtilisateurs endpoint="/super-admin/utilisateurs" readOnly pageTitle="Utilisateurs métier" pageDescription="Consultation des membres, référents et partenaires." /></SuperAdminRoute>} />
          <Route path="/super-admin/logs"      element={<SuperAdminRoute><SuperAdminLogs /></SuperAdminRoute>} />

          {/* ── Page 404 ── */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  )
}
