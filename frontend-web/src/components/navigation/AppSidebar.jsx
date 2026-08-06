import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getDefaultRouteForRole } from '../../routes/roleRoutes'
import AppIcon from '../ui/AppIcons'
import logoBxConnect from '../../assets/images/logo-bx-connect.png'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const role = user?.role || 'MEMBRE'
  const routes = ROLE_ROUTES[role] || ROLE_ROUTES.MEMBRE
  const recentItems = useRecentWorkspaceItems(location, user)
  const mainSections = getMainSections(role, t)
  const spaceSections = getSpaceSections(role, t)
  const workSections = getWorkSections(role, t)
  const sidebarSections = [...mainSections, ...spaceSections, ...workSections]
  const homeRoute = routes.home || getDefaultRouteForRole(role)
  const showRecentLast = role === 'ADMIN'
  const showRecentSection = role !== 'PARTENAIRE'

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
        <div className={`flex gap-3 border-b border-slate-100 px-3 py-4 ${contextCollapsed ? 'flex-col items-center' : 'items-center justify-between'}`}>
          <Link
            to={homeRoute}
            className={`flex min-w-0 items-center gap-3 rounded-lg transition hover:bg-slate-50 ${contextCollapsed ? 'p-2' : 'px-2 py-2'}`}
            title="BX-Connect"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
              <img src={logoBxConnect} alt="BX-Connect" className="h-8 w-10 object-contain" />
            </span>
            {!contextCollapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-slate-950">BX-Connect</span>
                <span className="block truncate text-[10px] font-black uppercase tracking-wide text-slate-400">{roleLabel(role, t)}</span>
              </span>
            )}
          </Link>
          {contextCollapsed && (
            <button
              type="button"
              onClick={onToggleContext}
              title={t('sidebar.open')}
              aria-label={t('sidebar.open')}
              className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
            >
              <AppIcon name="PanelLeftOpen" className="h-5 w-5" />
            </button>
          )}
          {!contextCollapsed && (
            <button
              type="button"
              onClick={onToggleContext}
              title={t('sidebar.collapse')}
              aria-label={t('sidebar.collapse')}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-blue-700"
            >
              <AppIcon name="PanelLeftClose" className="h-4 w-4" />
            </button>
          )}
        </div>

        {contextCollapsed ? (
          <div className="flex min-h-0 flex-1 flex-col items-center px-2 py-3">
            <nav className="flex min-h-0 flex-col items-center gap-1.5 overflow-y-auto" aria-label={t('sidebar.compactNavigation')}>
              {sidebarSections.flatMap(section => section.items).map(item => (
                <CollapsedSidebarLink key={`${item.label}-${item.to}`} item={item} location={location} />
              ))}
            </nav>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={t('sidebar.mainNavigation')}>
              <div className="space-y-5">
                {mainSections.map(section => (
                  <ContextSection
                    key={section.title}
                    section={section}
                    location={location}
                  />
                ))}

                {showRecentSection && !showRecentLast && <RecentSection items={recentItems} location={location} />}

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

                {showRecentSection && showRecentLast && <RecentSection items={recentItems} location={location} />}
              </div>
            </nav>

            <div className="border-t border-slate-100 p-3">
              <Link
                to="/profil#infos"
                className="flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  <AppIcon name="User" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-slate-950">
                    {fullName(user) || roleLabel(role, t)}
                  </span>
                  <span className="block truncate text-xs font-semibold text-slate-500">
                    {user?.email || t('profile.userProfile', { defaultValue: t('sidebar.userProfile') })}
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
        title={t('nav.openMenu')}
        aria-label={t('nav.openMenu')}
        aria-expanded={mobileOpen}
        aria-controls="app-sidebar-mobile-drawer"
        className="fixed left-3 top-3 z-[60] grid h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-lg shadow-slate-950/10 transition hover:bg-blue-50 hover:text-blue-700 lg:hidden"
      >
        <AppIcon name="Menu" className="h-5 w-5" />
      </button>

      <div id="app-sidebar-mobile-drawer" className={`fixed inset-0 z-[70] lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}>
        <button
          type="button"
          aria-label={t('nav.close')}
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 bg-slate-950/35 transition-opacity duration-200 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[260px] max-w-[86vw] flex-col border-r border-slate-200 bg-white text-slate-900 shadow-2xl shadow-slate-950/20 transition-transform duration-200 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label={t('sidebar.mobileMenu')}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-4">
            <Link
              to={homeRoute}
              onClick={() => setMobileOpen(false)}
              className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50"
              title="BX-Connect"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
                <img src={logoBxConnect} alt="BX-Connect" className="h-8 w-10 object-contain" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-slate-950">BX-Connect</span>
                <span className="block truncate text-[10px] font-black uppercase tracking-wide text-slate-400">{roleLabel(role, t)}</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              title={t('nav.close')}
              aria-label={t('nav.close')}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-blue-700"
            >
              <AppIcon name="X" className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={t('sidebar.mobileNavigation')}>
            <div className="space-y-5">
              {mainSections.map(section => (
                <ContextSection
                  key={`mobile-${section.title}`}
                  section={section}
                  location={location}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}

              {showRecentSection && !showRecentLast && <RecentSection items={recentItems} location={location} onNavigate={() => setMobileOpen(false)} />}

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

              {showRecentSection && showRecentLast && <RecentSection items={recentItems} location={location} onNavigate={() => setMobileOpen(false)} />}
            </div>
          </nav>

          <div className="border-t border-slate-100 p-3">
            <Link
              to="/profil#infos"
              onClick={() => setMobileOpen(false)}
              className="flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <AppIcon name="User" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-slate-950">
                  {fullName(user) || roleLabel(role, t)}
                </span>
                <span className="block truncate text-xs font-semibold text-slate-500">
                    {user?.email || t('profile.userProfile', { defaultValue: t('sidebar.userProfile') })}
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

function getMainSections(role, t) {
  if (role === 'ADMIN') {
    return sections([
      group(t('sidebar.sections.pilotage'), [
        link(t('nav.dashboard'), '/admin/dashboard', 'Home'),
        link(t('nav.conversations'), '/admin/conversations', 'MessagesSquare'),
        link(t('nav.notifications'), '/notifications', 'Bell'),
      ]),
    ])
  }

  if (role === 'PARTENAIRE') {
    return sections([
      group(t('sidebar.sections.overview'), [
        link(t('nav.dashboard'), '/partenaire?tab=dashboard', 'Home'),
        link(t('partnerSpace.openProjects', { defaultValue: 'Projets ouverts' }), '/partenaire?tab=projets', 'Rocket'),
        link(t('partnerSpace.openActivities', { defaultValue: 'Activités ouvertes' }), '/partenaire?tab=activites', 'Calendar'),
        link(t('partnerSpace.mySupports', { defaultValue: 'Mes soutiens' }), '/partenaire?tab=soutiens', 'Wallet'),
      ]),
      group(t('sidebar.sections.communication'), [
        link(t('nav.conversations'), '/partenaire/conversations', 'MessagesSquare'),
        link(t('nav.notifications'), '/notifications', 'Bell'),
      ]),
    ])
  }

  if (role === 'REFERENT') {
    return sections([
      group(t('sidebar.sections.overview'), [
        link(t('nav.dashboard'), '/referent/dashboard', 'Home'),
        link(t('nav.messaging'), '/referent/messagerie', 'MessageCircle'),
        link(t('nav.conversations'), '/referent/conversations', 'MessagesSquare'),
      ]),
      group(t('sidebar.sections.communication'), [
        link(t('nav.notifications'), '/notifications', 'Bell'),
      ]),
    ])
  }

  if (role === 'SUPER_ADMIN') {
    return sections([
      group(t('sidebar.sections.supervision'), [
        link(t('nav.dashboard'), '/super-admin/dashboard', 'Home'),
      ]),
      group(t('sidebar.sections.security'), [
        link(t('nav.admins'), '/super-admin/admins', 'Lock'),
        link(t('nav.logs'), '/super-admin/logs', 'ClipboardList'),
      ]),
      group(t('sidebar.sections.communication'), [
        link(t('nav.conversations'), '/admin/conversations', 'MessagesSquare'),
        link(t('nav.notifications'), '/notifications', 'Bell'),
      ]),
    ])
  }

  return sections([
    group(t('sidebar.sections.overview'), [
      link(t('nav.dashboard'), '/dashboard', 'Home'),
      link(t('nav.messaging'), '/messagerie', 'MessageCircle'),
      link(t('nav.notifications'), '/notifications', 'Bell'),
    ]),
  ])
}

function getSpaceSections(role, t) {
  if (role === 'ADMIN') {
    return sections([
      group(t('sidebar.sections.management'), [
        link(t('nav.users'), '/admin/utilisateurs', 'Users'),
        link(t('nav.referents'), '/admin/referents', 'User'),
        link(t('nav.activities'), '/admin/activites', 'Calendar'),
      ]),
    ])
  }

  if (role === 'PARTENAIRE') {
    // MVP1.5 / masqué volontairement : opportunités, soutiens et sous-onglets avancés.
    return []
  }

  if (role === 'REFERENT') {
    return sections([
      group(t('sidebar.sections.groupLife'), [
        link(t('nav.myGroups'), '/referent/groupes', 'Users'),
        link(t('nav.members'), '/referent/membres', 'User'),
        link(t('nav.projects'), '/referent/projets', 'Rocket'),
      ]),
    ])
  }

  if (role === 'SUPER_ADMIN') return []

  return sections([
    group(t('sidebar.sections.participation'), [
      link(t('nav.myGroups'), '/groupes', 'Users'),
      link(t('sidebar.labels.myActivities'), '/activites', 'Calendar'),
      link(t('sidebar.labels.myProjects'), '/projets', 'Rocket'),
    ]),
  ])
}

function getWorkSections(role, t) {
  if (role === 'ADMIN') {
    return sections([
      group(t('sidebar.sections.validation'), [
        link(t('sidebar.labels.pendingGroups'), '/admin/groupes', 'ClipboardList'),
        link(t('admin.projectsToValidate'), '/admin/projets', 'Rocket'),
        link(t('nav.supports'), '/admin/soutiens', 'Wallet'),
      ]),
    ])
  }

  if (role === 'REFERENT') {
    return sections([
      group(t('sidebar.sections.priorityActions'), [
        link(t('sidebar.labels.membershipRequests'), '/referent/demandes', 'ClipboardList'),
        link(t('sidebar.labels.activitiesToPrepare'), '/referent/activites', 'Calendar'),
      ]),
    ])
  }

  if (role === 'PARTENAIRE') {
    // MVP1.5 / masqué volontairement : actions de soutien et opportunités partenaires.
    return []
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
      className={`relative grid h-11 w-11 place-items-center rounded-lg transition ${
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
  const { t } = useTranslation()

  return (
    <section>
      <p className="mb-1.5 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {t('sidebar.recent')}
      </p>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold leading-relaxed text-slate-500">
            {t('sidebar.recentEmpty')}
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

function roleLabel(role, t) {
  return t(`roles.${role || 'MEMBRE'}`, { defaultValue: role || 'MEMBRE' })
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
  const { t } = useTranslation()

  if (!item.to) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-400">
        <span className="inline-flex min-w-0 items-center gap-2">
          <AppIcon name={item.icon} className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.label}</span>
        </span>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-400">
          {t('sidebar.comingSoon')}
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
