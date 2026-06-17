import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getDefaultRouteForRole } from '../../routes/roleRoutes'
import AppIcon from '../ui/AppIcons'
import logoBxConnect from '../../assets/images/logo-bx-connect.png'

const ROLE_ROUTES = {
  MEMBRE: {
    home: '/dashboard',
    messages: '/messagerie',
    groups: '/groupes',
    activities: '/activites',
    projects: '/projets',
  },
  REFERENT: {
    home: '/referent/dashboard',
    messages: '/referent/messagerie',
    groups: '/referent/groupes',
    activities: '/referent/activites',
    projects: '/referent/projets',
  },
  ADMIN: {
    home: '/admin/dashboard',
    groups: '/admin/groupes',
    activities: '/admin/activites',
    projects: '/admin/projets',
  },
  PARTENAIRE: {
    home: '/partenaire?tab=dashboard',
    activities: '/partenaire?tab=activites',
    projects: '/partenaire?tab=projets',
  },
  SUPER_ADMIN: {
    home: '/super-admin/dashboard',
  },
}

const MODULE_MATCHERS = {
  home: ['/dashboard', '/referent/dashboard', '/admin/dashboard', '/partenaire', '/super-admin/dashboard'],
  messages: ['/messagerie', '/referent/messagerie'],
  groups: ['/groupes', '/referent/groupes', '/referent/demandes', '/referent/membres', '/admin/groupes'],
  activities: ['/activites', '/referent/activites', '/admin/activites'],
  projects: ['/projets', '/referent/projets', '/admin/projets'],
  notifications: ['/notifications'],
  profile: ['/profil'],
}

const MODULE_LABELS = {
  home: { label: 'Accueil', icon: 'Home' },
  messages: { label: 'Messages', icon: 'MessageCircle' },
  groups: { label: 'Groupes', icon: 'Users' },
  activities: { label: 'Activités', icon: 'Calendar' },
  projects: { label: 'Projets', icon: 'Rocket' },
  notifications: { label: 'Notifications', icon: 'Bell' },
  profile: { label: 'Profil', icon: 'User' },
}

export default function AppSidebar() {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) return null

  const role = user?.role || 'MEMBRE'
  const routes = ROLE_ROUTES[role] || ROLE_ROUTES.MEMBRE
  const activeModule = getActiveModule(location, routes)
  const primaryItems = getPrimaryItems(routes)
  const contextItems = getContextItems(role, activeModule)
  const activeMeta = MODULE_LABELS[activeModule] || MODULE_LABELS.home

  return (
    <>
      <aside className="app-sidebar fixed inset-y-0 left-0 z-50 hidden border-r border-slate-200 bg-slate-950 text-white shadow-2xl shadow-slate-950/20 lg:flex">
        <div className="flex w-20 flex-col items-center gap-3 border-r border-white/10 px-2 py-4">
          <Link to={routes.home || getDefaultRouteForRole(role)} className="mb-2 grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm" title="BX-Connect">
            <img src={logoBxConnect} alt="BX-Connect" className="h-9 w-11 object-contain" />
          </Link>

          <nav className="flex flex-1 flex-col items-center gap-1.5" aria-label="Modules BX-Connect">
            {primaryItems.map(item => (
              <ModuleLink
                key={item.key}
                item={item}
                active={activeModule === item.key}
              />
            ))}
          </nav>
        </div>

        <div className="flex w-60 flex-col bg-white text-slate-900">
          <div className="border-b border-slate-100 px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-wide text-blue-700">Espace collaboratif</p>
            <h2 className="mt-1 flex items-center gap-2 text-lg font-black text-slate-950">
              <AppIcon name={activeMeta.icon} className="h-5 w-5 text-blue-700" />
              {activeMeta.label}
            </h2>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label={`Navigation ${activeMeta.label}`}>
            <div className="grid gap-1">
              {contextItems.map(item => (
                <ContextLink key={`${item.label}-${item.to || item.disabledLabel}`} item={item} location={location} />
              ))}
            </div>
          </nav>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 shadow-2xl shadow-slate-950/15 backdrop-blur lg:hidden">
        <div className="flex gap-1 overflow-x-auto px-2 py-1.5" aria-label="Modules BX-Connect mobile">
          {primaryItems.map(item => (
            <Link
              key={item.key}
              to={item.to}
              className={`flex min-w-[74px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-black transition ${
                activeModule === item.key ? 'bg-blue-700 text-white shadow-lg shadow-blue-700/25' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-800'
              }`}
            >
              <AppIcon name={item.icon} className="h-5 w-5" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          ))}
        </div>
        <div className="flex gap-1 overflow-x-auto border-t border-slate-100 px-2 py-1.5" aria-label={`Sous-menu ${activeMeta.label}`}>
          {contextItems.filter(item => item.to).map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                isActive(item.to, location) ? 'bg-blue-50 text-blue-800' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <AppIcon name={item.icon} className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

function getPrimaryItems(routes) {
  return [
    { key: 'home', to: routes.home, ...MODULE_LABELS.home },
    routes.messages && { key: 'messages', to: routes.messages, ...MODULE_LABELS.messages },
    routes.groups && { key: 'groups', to: routes.groups, ...MODULE_LABELS.groups },
    routes.activities && { key: 'activities', to: routes.activities, ...MODULE_LABELS.activities },
    routes.projects && { key: 'projects', to: routes.projects, ...MODULE_LABELS.projects },
    { key: 'notifications', to: '/notifications', ...MODULE_LABELS.notifications },
    { key: 'profile', to: '/profil', ...MODULE_LABELS.profile },
  ].filter(Boolean)
}

function getActiveModule(location, routes) {
  if (location.pathname === '/partenaire') {
    const tab = new URLSearchParams(location.search).get('tab')
    if (tab === 'projets') return 'projects'
    if (tab === 'activites') return 'activities'
    if (tab === 'soutiens') return 'home'
  }

  return Object.entries(MODULE_MATCHERS).find(([, paths]) => (
    paths.some(path => location.pathname === path || location.pathname.startsWith(`${path}/`))
  ))?.[0] || (routes.home ? 'home' : 'profile')
}

function getContextItems(role, module) {
  if (module === 'messages') {
    return [
      link('Conversations', role === 'REFERENT' ? '/referent/messagerie' : '/messagerie', 'MessageCircle'),
      disabled('Canaux', 'Hash'),
      disabled('Favoris', 'Star'),
      disabled('Archives', 'Archive'),
    ]
  }

  if (module === 'groups') {
    if (role === 'REFERENT') {
      return [
        link('Mes groupes', '/referent/groupes', 'Users'),
        link('Demandes', '/referent/demandes', 'ClipboardList'),
        link('Membres', '/referent/membres', 'User'),
        link('Activités', '/referent/activites', 'Calendar'),
        link('Projets', '/referent/projets', 'Rocket'),
        disabled('Réunions', 'Calendar'),
        disabled('Documents', 'FileText'),
      ]
    }
    if (role === 'ADMIN') {
      return [
        link('Tous les groupes', '/admin/groupes', 'Users'),
        link('Référents', '/admin/referents', 'User'),
        link('Utilisateurs', '/admin/utilisateurs', 'User'),
        link('Activités', '/admin/activites', 'Calendar'),
        link('Projets', '/admin/projets', 'Rocket'),
      ]
    }
    return [
      link('Mes groupes', '/groupes', 'Users'),
      link('Demandes', '/groupes', 'ClipboardList'),
      link('Activités', '/activites', 'Calendar'),
      link('Projets', '/projets', 'Rocket'),
      disabled('Réunions', 'Calendar'),
      disabled('Documents', 'FileText'),
    ]
  }

  if (module === 'activities') {
    return [
      link('Toutes les activités', routeForRole(role, 'activities'), 'Calendar'),
      role === 'ADMIN' && link('Créer / publier', '/admin/activites', 'PlusCircle'),
      role === 'REFERENT' && link('Activités de mes groupes', '/referent/activites', 'Users'),
      disabled('Inscriptions', 'CheckCircle'),
    ].filter(Boolean)
  }

  if (module === 'projects') {
    return [
      link(role === 'PARTENAIRE' ? 'Projets ouverts' : 'Tous les projets', routeForRole(role, 'projects'), 'Rocket'),
      role === 'PARTENAIRE' && link('Mes soutiens', '/partenaire?tab=soutiens', 'Handshake'),
      role === 'ADMIN' && link('Soutiens partenaires', '/admin/soutiens', 'Handshake'),
      disabled('Documents', 'FileText'),
    ].filter(Boolean)
  }

  if (module === 'notifications') {
    return [
      link('Notifications', '/notifications', 'Bell'),
      disabled('Non lues', 'TriangleAlert'),
      disabled('Archivées', 'Archive'),
    ]
  }

  if (module === 'profile') {
    return [
      link('Informations', '/profil', 'User'),
      link('Paramètres', '/profil', 'Settings'),
      link('Sécurité', '/profil', 'Shield'),
    ]
  }

  return homeContext(role)
}

function homeContext(role) {
  if (role === 'SUPER_ADMIN') {
    return [
      link('Supervision', '/super-admin/dashboard', 'Shield'),
      link('Administrateurs', '/super-admin/admins', 'Lock'),
      link('Logs', '/super-admin/logs', 'ClipboardList'),
    ]
  }
  if (role === 'ADMIN') {
    return [
      link('Tableau de bord', '/admin/dashboard', 'Home'),
      link('Utilisateurs', '/admin/utilisateurs', 'Users'),
      link('Référents', '/admin/referents', 'User'),
      link('Soutiens partenaires', '/admin/soutiens', 'Handshake'),
      link('Annonces', '/admin/annonces', 'Megaphone'),
    ]
  }
  if (role === 'REFERENT') {
    return [
      link('Tableau de bord', '/referent/dashboard', 'Home'),
      link('Demandes à traiter', '/referent/demandes', 'ClipboardList'),
      link('Mes groupes', '/referent/groupes', 'Users'),
      link('Messagerie', '/referent/messagerie', 'MessageCircle'),
      link('Annonces', '/referent/annonces', 'Megaphone'),
    ]
  }
  if (role === 'PARTENAIRE') {
    return [
      link('Tableau de bord', '/partenaire?tab=dashboard', 'Home'),
      link('Projets ouverts', '/partenaire?tab=projets', 'Rocket'),
      link('Activités ouvertes', '/partenaire?tab=activites', 'Calendar'),
      link('Mes soutiens', '/partenaire?tab=soutiens', 'Handshake'),
    ]
  }
  return [
    link('Mon espace', '/dashboard', 'Home'),
    link('Mes groupes', '/groupes', 'Users'),
    link('Activités', '/activites', 'Calendar'),
    link('Messages', '/messagerie', 'MessageCircle'),
    link('Annonces', '/annonces', 'Megaphone'),
  ]
}

function routeForRole(role, key) {
  const routes = ROLE_ROUTES[role] || ROLE_ROUTES.MEMBRE
  return routes[key] || routes.home || getDefaultRouteForRole(role)
}

function link(label, to, icon) {
  return { label, to, icon }
}

function disabled(label, icon) {
  return { label, icon, disabledLabel: 'Bientôt disponible' }
}

function ModuleLink({ item, active }) {
  return (
    <Link
      to={item.to}
      title={item.label}
      aria-current={active ? 'page' : undefined}
      className={`group flex h-[62px] w-16 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black transition ${
        active
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
          : 'text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      <AppIcon name={item.icon} className="h-5 w-5" />
      <span className="max-w-[56px] truncate">{item.label}</span>
    </Link>
  )
}

function ContextLink({ item, location }) {
  if (!item.to) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-400">
        <span className="inline-flex min-w-0 items-center gap-2">
          <AppIcon name={item.icon} className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.label}</span>
        </span>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-400">
          bientôt
        </span>
      </div>
    )
  }

  const active = isActive(item.to, location)
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={`flex min-w-0 items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${
        active ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-800'
      }`}
    >
      <AppIcon name={item.icon} className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

function isActive(to, location) {
  const [path, query] = to.split('?')
  if (query) return location.pathname === path && location.search === `?${query}`
  return location.pathname === path || location.pathname.startsWith(`${path}/`)
}
