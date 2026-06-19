import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getDefaultRouteForRole } from '../../routes/roleRoutes'
import api from '../../api/axios'
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

export default function AppSidebar({ contextCollapsed = false, onToggleContext }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const role = user?.role || 'MEMBRE'
  const routes = ROLE_ROUTES[role] || ROLE_ROUTES.MEMBRE
  const recentItems = useRecentWorkspaceItems(location, user)
  const workQueue = useSidebarWorkQueue(role)
  const mainSections = getMainSections(role)
  const spaceSections = getSpaceSections(role)
  const workSections = getWorkSections(role, workQueue)
  const sidebarSections = [...mainSections, ...spaceSections, ...workSections]
  const homeRoute = routes.home || getDefaultRouteForRole(role)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.search, location.hash])

  useEffect(() => {
    if (!mobileOpen) return undefined
    const closeOnEscape = event => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  if (!isAuthenticated) return null

  return (
    <>
      <aside className={`app-sidebar fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-950/5 transition-[width] duration-200 lg:flex ${
        contextCollapsed ? 'w-[88px]' : 'w-[260px]'
      }`}>
        <div className={`flex items-center gap-3 border-b border-slate-100 px-3 py-4 ${contextCollapsed ? 'justify-center' : 'justify-between'}`}>
          <Link
            to={homeRoute}
            className={`flex min-w-0 items-center gap-3 rounded-2xl transition hover:bg-slate-50 ${contextCollapsed ? 'p-2' : 'px-2 py-2'}`}
            title="BX-Connect"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              <img src={logoBxConnect} alt="BX-Connect" className="h-8 w-10 object-contain" />
            </span>
            {!contextCollapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-slate-950">BX-Connect</span>
                <span className="block truncate text-[10px] font-black uppercase tracking-wide text-slate-400">{roleLabel(role)}</span>
              </span>
            )}
          </Link>
          {!contextCollapsed && (
            <button
              type="button"
              onClick={onToggleContext}
              title="Réduire la sidebar"
              aria-label="Réduire la sidebar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-blue-700"
            >
              <AppIcon name="PanelLeftClose" className="h-4 w-4" />
            </button>
          )}
        </div>

        {contextCollapsed ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-between px-2 py-3">
            <nav className="flex min-h-0 flex-col items-center gap-1.5 overflow-y-auto" aria-label="Navigation BX-Connect compacte">
              {sidebarSections.flatMap(section => section.items).map(item => (
                <CollapsedSidebarLink key={`${item.label}-${item.to}`} item={item} location={location} />
              ))}
            </nav>
            <button
              type="button"
              onClick={onToggleContext}
              title="Ouvrir la sidebar"
              aria-label="Ouvrir la sidebar"
              className="grid h-10 w-10 place-items-center rounded-2xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
            >
              <AppIcon name="PanelLeftOpen" className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation BX-Connect">
              <div className="space-y-5">
                {mainSections.map(section => (
                  <ContextSection
                    key={section.title}
                    section={section}
                    location={location}
                  />
                ))}

                <RecentSection items={recentItems} location={location} />

                {spaceSections.map(section => (
                  <ContextSection
                    key={section.title}
                    section={section}
                    location={location}
                  />
                ))}

                {workSections.map(section => (
                  <ContextSection
                    key={section.title}
                    section={section}
                    location={location}
                  />
                ))}
              </div>
            </nav>

            <div className="border-t border-slate-100 p-3">
              <Link
                to="/profil#infos"
                className="flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-slate-50"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                  <AppIcon name="User" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-slate-950">
                    {fullName(user) || roleLabel(role)}
                  </span>
                  <span className="block truncate text-xs font-semibold text-slate-500">
                    {user?.email || 'Profil utilisateur'}
                  </span>
                </span>
                <AppIcon name="Settings" className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </div>
        )}
      </aside>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        title="Ouvrir le menu"
        aria-label="Ouvrir le menu"
        aria-expanded={mobileOpen}
        className="fixed left-3 top-3 z-40 grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-lg shadow-slate-950/10 transition hover:bg-blue-50 hover:text-blue-700 lg:hidden"
      >
        <AppIcon name="Menu" className="h-5 w-5" />
      </button>

      <div className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}>
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 bg-slate-950/35 transition-opacity duration-200 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[260px] max-w-[86vw] flex-col border-r border-slate-200 bg-white text-slate-900 shadow-2xl shadow-slate-950/20 transition-transform duration-200 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Menu BX-Connect"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-4">
            <Link
              to={homeRoute}
              onClick={() => setMobileOpen(false)}
              className="flex min-w-0 items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-slate-50"
              title="BX-Connect"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                <img src={logoBxConnect} alt="BX-Connect" className="h-8 w-10 object-contain" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-slate-950">BX-Connect</span>
                <span className="block truncate text-[10px] font-black uppercase tracking-wide text-slate-400">{roleLabel(role)}</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              title="Fermer le menu"
              aria-label="Fermer le menu"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-blue-700"
            >
              <AppIcon name="X" className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation BX-Connect mobile">
            <div className="space-y-5">
              {mainSections.map(section => (
                <ContextSection
                  key={`mobile-${section.title}`}
                  section={section}
                  location={location}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}

              <RecentSection items={recentItems} location={location} onNavigate={() => setMobileOpen(false)} />

              {spaceSections.map(section => (
                <ContextSection
                  key={`mobile-${section.title}`}
                  section={section}
                  location={location}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}

              {workSections.map(section => (
                <ContextSection
                  key={`mobile-${section.title}`}
                  section={section}
                  location={location}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </div>
          </nav>

          <div className="border-t border-slate-100 p-3">
            <Link
              to="/profil#infos"
              onClick={() => setMobileOpen(false)}
              className="flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-slate-50"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                <AppIcon name="User" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-slate-950">
                  {fullName(user) || roleLabel(role)}
                </span>
                <span className="block truncate text-xs font-semibold text-slate-500">
                  {user?.email || 'Profil utilisateur'}
                </span>
              </span>
              <AppIcon name="Settings" className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </aside>
      </div>
    </>
  )
}

function useRecentWorkspaceItems(location, user) {
  const userKey = user?.id || user?.email || user?.role || 'default'
  const storageKey = `bx-sidebar-recents-${userKey}`
  const currentItem = useMemo(() => recentItemFromLocation(location), [location])
  const [items, setItems] = useState(() => readRecentItems(storageKey))

  useEffect(() => {
    setItems(readRecentItems(storageKey))
  }, [storageKey])

  useEffect(() => {
    if (!currentItem) return
    setItems((current) => {
      const next = [
        { ...currentItem, visitedAt: new Date().toISOString() },
        ...current.filter(item => item.to !== currentItem.to),
      ].slice(0, 8)
      window.localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }, [currentItem, storageKey])

  return items
}

function useSidebarWorkQueue(role) {
  const [queue, setQueue] = useState({
    groupesEnAttente: 0,
    projetsSoumis: 0,
    soutiensEnAttente: 0,
    demandes: 0,
    activites: 0,
    membres: 0,
  })

  useEffect(() => {
    let cancelled = false

    async function fetchQueue() {
      if (role === 'ADMIN') {
        const [groupesRes, projetsRes, soutiensRes] = await Promise.all([
          api.get('/admin/groupes/en-attente').catch(() => ({ data: [] })),
          api.get('/projets/admin/tous').catch(() => ({ data: [] })),
          api.get('/partenaire/admin/tous').catch(() => ({ data: [] })),
        ])
        if (cancelled) return
        const projets = Array.isArray(projetsRes.data) ? projetsRes.data : []
        const soutiens = Array.isArray(soutiensRes.data) ? soutiensRes.data : []
        setQueue({
          groupesEnAttente: Array.isArray(groupesRes.data) ? groupesRes.data.length : 0,
          projetsSoumis: projets.filter(projet => projet.statut === 'SOUMIS').length,
          soutiensEnAttente: soutiens.filter(soutien => soutien.statutPaiement === 'EN_ATTENTE').length,
          demandes: 0,
          activites: 0,
          membres: 0,
        })
        return
      }

      if (role === 'REFERENT') {
        const [groupesRes, activitesRes] = await Promise.all([
          api.get('/referent/groupes').catch(() => ({ data: [] })),
          api.get('/referent/mes-activites').catch(() => ({ data: [] })),
        ])
        const groupes = Array.isArray(groupesRes.data) ? groupesRes.data : []
        const details = await Promise.all(groupes.map(async (groupe) => {
          const [membresRes, demandesRes] = await Promise.all([
            api.get(`/referent/groupes/${groupe.id}/membres`).catch(() => ({ data: [] })),
            api.get(`/referent/groupes/${groupe.id}/demandes`).catch(() => ({ data: [] })),
          ])
          return {
            membres: Array.isArray(membresRes.data) ? membresRes.data : [],
            demandes: Array.isArray(demandesRes.data) ? demandesRes.data : [],
          }
        }))
        if (cancelled) return
        const activites = Array.isArray(activitesRes.data) ? activitesRes.data : []
        setQueue({
          groupesEnAttente: 0,
          projetsSoumis: 0,
          soutiensEnAttente: 0,
          demandes: details.reduce((total, item) => total + item.demandes.length, 0),
          activites: activites.filter(activite => activite.statut === 'BROUILLON').length,
          membres: 0,
        })
        return
      }

      setQueue({
        groupesEnAttente: 0,
        projetsSoumis: 0,
        soutiensEnAttente: 0,
        demandes: 0,
        activites: 0,
        membres: 0,
      })
    }

    fetchQueue()
    return () => { cancelled = true }
  }, [role])

  return queue
}

function getMainSections(role) {
  if (role === 'ADMIN') {
    return sections([
      group('Vue d’ensemble', [
        link('Tableau de bord', '/admin/dashboard', 'Home'),
      ]),
      group('Administration', [
        link('Utilisateurs', '/admin/utilisateurs', 'Users'),
        link('Référents', '/admin/referents', 'User'),
      ]),
      group('Communication', [
        link('Notifications', '/notifications', 'Bell'),
      ]),
    ])
  }

  if (role === 'PARTENAIRE') {
    return sections([
      group('Vue d’ensemble', [
        link('Tableau de bord', '/partenaire?tab=dashboard', 'Home'),
      ]),
      group('Communication', [
        link('Notifications', '/notifications', 'Bell'),
      ]),
    ])
  }

  if (role === 'REFERENT') {
    return sections([
      group('Vue d’ensemble', [
        link('Tableau de bord', '/referent/dashboard', 'Home'),
        link('Messages', '/referent/messagerie', 'MessageCircle'),
      ]),
      group('Communication', [
        link('Notifications', '/notifications', 'Bell'),
        link('Annonces', '/referent/annonces', 'Megaphone'),
      ]),
    ])
  }

  if (role === 'SUPER_ADMIN') {
    return sections([
      group('Supervision', [
        link('Tableau de bord', '/super-admin/dashboard', 'Home'),
      ]),
      group('Sécurité', [
        link('Administrateurs', '/super-admin/admins', 'Lock'),
        link('Logs', '/super-admin/logs', 'ClipboardList'),
      ]),
      group('Communication', [
        link('Notifications', '/notifications', 'Bell'),
      ]),
    ])
  }

  return sections([
    group('Vue d’ensemble', [
      link('Tableau de bord', '/dashboard', 'Home'),
      link('Messages', '/messagerie', 'MessageCircle'),
      link('Notifications', '/notifications', 'Bell'),
      link('Annonces', '/annonces', 'Megaphone'),
    ]),
  ])
}

function getSpaceSections(role) {
  if (role === 'ADMIN') {
    return sections([
      group('Gestion opérationnelle', [
        link('Activités', '/admin/activites', 'Calendar'),
        link('Prestations', '/admin/prestations', 'CheckCircle'),
        link('Annonces', '/admin/annonces', 'Megaphone'),
      ]),
    ])
  }

  if (role === 'PARTENAIRE') {
    return sections([
      group('Opportunités', [
        link('Projets ouverts', '/partenaire?tab=projets', 'Rocket'),
        link('Activités ouvertes', '/partenaire?tab=activites', 'Calendar'),
      ]),
    ])
  }

  if (role === 'REFERENT') {
    return sections([
      group('Vie du groupe', [
        link('Mes groupes', '/referent/groupes', 'Users'),
        link('Membres', '/referent/membres', 'User'),
        link('Projets', '/referent/projets', 'Rocket'),
        link('Prestations', '/referent/prestations', 'CheckCircle'),
      ]),
    ])
  }

  if (role === 'SUPER_ADMIN') return []

  return sections([
    group('Participation', [
      link('Mes groupes', '/groupes', 'Users'),
      link('Mes activités', '/activites', 'Calendar'),
      link('Mes projets', '/projets', 'Rocket'),
      link('Prestations', '/prestations', 'CheckCircle'),
    ]),
  ])
}

function getWorkSections(role, queue) {
  if (role === 'ADMIN') {
    return sections([
      group('Actions prioritaires', [
        link('Groupes en attente', '/admin/groupes', 'ClipboardList', queue.groupesEnAttente),
        link('Projets soumis', '/admin/projets', 'Rocket', queue.projetsSoumis),
        link('Soutiens partenaires', '/admin/soutiens', 'Handshake', queue.soutiensEnAttente),
      ]),
    ])
  }

  if (role === 'REFERENT') {
    return sections([
      group('Actions prioritaires', [
        link('Demandes d’adhésion', '/referent/demandes', 'ClipboardList', queue.demandes),
        link('Activités à préparer', '/referent/activites', 'Calendar', queue.activites),
      ]),
    ])
  }

  if (role === 'PARTENAIRE') {
    return sections([
      group('Actions prioritaires', [
        link('Mes soutiens', '/partenaire?tab=soutiens', 'Handshake'),
      ]),
    ])
  }

  return []
}

function link(label, to, icon, badge = null) {
  return { label, to, icon, badge: Number(badge) > 0 ? Number(badge) : null }
}

function group(title, items) {
  return { title, items: items.filter(Boolean) }
}

function sections(groups) {
  return groups.filter(section => section.items.length > 0)
}

function CollapsedSidebarLink({ item, location }) {
  const active = isActive(item.to, location)
  return (
    <Link
      to={item.to}
      title={item.label}
      aria-current={active ? 'page' : undefined}
      className={`relative grid h-11 w-11 place-items-center rounded-2xl transition ${
        active
          ? 'bg-blue-700 text-white shadow-lg shadow-blue-700/20'
          : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'
      }`}
    >
      <AppIcon name={item.icon} className="h-5 w-5" />
      {item.badge && (
        <span className="absolute -mr-8 -mt-8 rounded-full bg-blue-700 px-1.5 py-0.5 text-[9px] font-black text-white">
          {item.badge}
        </span>
      )}
    </Link>
  )
}

function RecentSection({ items, location, onNavigate }) {
  return (
    <section>
      <p className="mb-1.5 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        Récents
      </p>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold leading-relaxed text-slate-500">
            Les groupes, projets et activités consultés apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="grid gap-0.5">
          {items.slice(0, 8).map(item => (
            <ContextLink key={`recent-${item.to}`} item={item} location={location} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </section>
  )
}

function ContextSection({ section, location, onNavigate }) {
  return (
    <section>
      <p className="mb-1.5 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {section.title}
      </p>
      <div className="grid gap-0.5">
        {section.items.map(item => (
          <ContextLink key={`${section.title}-${item.label}-${item.to || item.disabledLabel}`} item={item} location={location} onNavigate={onNavigate} />
        ))}
      </div>
    </section>
  )
}

function roleLabel(role) {
  if (role === 'SUPER_ADMIN') return 'Super admin'
  if (role === 'ADMIN') return 'Admin'
  if (role === 'REFERENT') return 'Référent'
  if (role === 'PARTENAIRE') return 'Partenaire'
  return 'Membre'
}

function fullName(user) {
  return `${user?.prenom || ''} ${user?.nom || ''}`.trim()
}

function readRecentItems(storageKey) {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || '[]')
    return Array.isArray(parsed) ? parsed.filter(item => item?.to && item?.label).slice(0, 8) : []
  } catch {
    return []
  }
}

function recentItemFromLocation(location) {
  const path = location.pathname
  const groupMatch = path.match(/^\/(?:referent\/)?groupes\/(\d+)$/)
  if (groupMatch) {
    return link(`Groupe #${groupMatch[1]}`, path, 'Users')
  }

  const projectMatch = path.match(/^\/projets\/(\d+)$/)
  if (projectMatch) {
    return link(`Projet #${projectMatch[1]}`, path, 'Rocket')
  }

  const activityMatch = path.match(/^\/activites\/(\d+)$/)
  if (activityMatch) {
    return link(`Activité #${activityMatch[1]}`, path, 'Calendar')
  }

  return null
}

function ContextLink({ item, location, onNavigate }) {
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
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`group flex min-w-0 items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm font-bold transition ${
        active ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
      }`}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <AppIcon name={item.icon} className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-blue-700'}`} />
        <span className="truncate">{item.label}</span>
      </span>
      {item.badge && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${active ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'}`}>
          {item.badge}
        </span>
      )}
    </Link>
  )
}

function isActive(to, location) {
  const [path, query] = to.split('?')
  if (path.includes('#')) {
    const [hashPath, hash] = path.split('#')
    return location.pathname === hashPath && location.hash === `#${hash}`
  }
  if (query) {
    if (location.pathname !== path) return false
    const expected = new URLSearchParams(query)
    const actual = new URLSearchParams(location.search)
    return [...expected.entries()].every(([key, value]) => actual.get(key) === value)
  }
  return location.pathname === path || location.pathname.startsWith(`${path}/`)
}
