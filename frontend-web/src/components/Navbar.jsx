import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import AppIcon from './ui/AppIcons'
import logoBxConnect from '../assets/images/logo-bx-connect.png'
import { getDefaultRouteForRole } from '../routes/roleRoutes'

const LANGUAGES = [
  { code: 'fr', label: 'FR' },
  { code: 'nl', label: 'NL' },
  { code: 'en', label: 'EN' },
]

export default function Navbar() {
  const {
    isAuthenticated,
    user,
    logout,
  } = useAuth()
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const navRef = useRef(null)
  const [notifCount, setNotifCount] = useState(0)
  const [openDropdown, setOpenDropdown] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifCount(0)
      return
    }

    api.get('/notifications/count')
      .then(res => setNotifCount(res.data.nonLues || 0))
      .catch(() => {})
  }, [isAuthenticated])

  useEffect(() => {
    setOpenDropdown(null)
  }, [location.pathname, location.search])

  useEffect(() => {
    const closeOnOutsideClick = event => {
      if (!navRef.current?.contains(event.target)) {
        setOpenDropdown(null)
      }
    }
    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const notificationItem = isAuthenticated
    ? { to: '/notifications', label: t('nav.notifications'), icon: 'Bell' }
    : null
  const homeRoute = isAuthenticated ? getDefaultRouteForRole(user?.role) : '/'

  const changeLanguage = code => {
    i18n.changeLanguage(code)
    localStorage.setItem('bxconnect_lang', code)
  }

  const handleLogout = () => {
    logout()
    setOpenDropdown(null)
    navigate('/', { replace: true })
  }

  const toggleDropdown = name => {
    setOpenDropdown(current => current === name ? null : name)
  }

  return (
    <nav
      ref={navRef}
      className={`sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 text-slate-700 backdrop-blur-xl ${isAuthenticated ? 'pl-16 lg:pl-4' : ''}`}
    >
      <div className="mx-auto grid min-h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-5">
        <Link to={homeRoute} className="flex min-w-0 items-center py-2">
          <img
            src={logoBxConnect}
            alt="BX-CONNECT"
            className="w-[150px] max-w-[42vw] shrink-0 object-contain sm:w-[190px]"
          />
          <span className="ml-2 hidden text-[10px] font-semibold tracking-wide text-orange-600 2xl:block">
            {t('nav.tagline')}
          </span>
        </Link>

        <div className="hidden items-center justify-center gap-1 lg:flex">
          {isAuthenticated && (
            <GlobalSearch navigate={navigate} />
          )}
        </div>

        <div className="flex items-center justify-end gap-1">
          <div className="flex items-center gap-1">
            {notificationItem && (
              <NotificationLink
                item={notificationItem}
                count={notifCount}
                active={isLinkActive(notificationItem.to, location)}
                label={t('nav.notifications')}
              />
            )}
            <LanguageDropdown
              open={openDropdown === 'language'}
              onToggle={toggleDropdown}
              i18n={i18n}
              onLanguageChange={changeLanguage}
              t={t}
            />
            {!isAuthenticated && (
              <Link
                to="/register"
                className="hidden h-9 items-center rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white transition hover:bg-blue-800 sm:inline-flex"
              >
                {t('nav.register')}
              </Link>
            )}
            <AccountDropdown
              open={openDropdown === 'account'}
              active={location.pathname === '/profil'}
              notificationsActive={location.pathname === '/notifications'}
              onToggle={toggleDropdown}
              isAuthenticated={isAuthenticated}
              user={user}
              onLogout={handleLogout}
              t={t}
            />
          </div>

        </div>
      </div>
    </nav>
  )
}

function LanguageDropdown({ open, onToggle, i18n, onLanguageChange, t }) {
  const currentLanguage = LANGUAGES.find(language => i18n.language.startsWith(language.code)) || LANGUAGES[0]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onToggle('language')}
        className={`flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition ${
          open ? 'bg-slate-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('nav.language')}
      >
        <AppIcon name="Globe" className="h-4 w-4" />
        <span>{currentLanguage.label}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-32 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/8"
        >
          {LANGUAGES.map(language => (
            <button
              key={language.code}
              type="button"
              role="menuitem"
              onClick={() => {
                onLanguageChange(language.code)
                onToggle('language')
              }}
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs font-semibold transition ${
                i18n.language.startsWith(language.code)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              {language.label}
              {i18n.language.startsWith(language.code) && (
                <span className="text-sm leading-none" aria-hidden="true">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AccountDropdown({ open, active, notificationsActive, onToggle, isAuthenticated, user, onLogout, t }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onToggle('account')}
        className={`flex h-8 items-center gap-1.5 rounded-lg px-1.5 text-sm font-semibold transition ${
          active || open
            ? 'bg-slate-100 text-blue-700'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {isAuthenticated ? <UserInitials user={user} /> : <AppIcon name="User" className="h-4 w-4" />}
        <span>{t('nav.account')}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/8"
        >
          {isAuthenticated && (
            <div className="mb-1 border-b border-slate-100 px-2.5 py-2">
              <p className="text-sm font-semibold text-slate-950">{user?.prenom} {user?.nom}</p>
              <p className="break-all text-xs leading-relaxed text-slate-500">{user?.email}</p>
            </div>
          )}

          {isAuthenticated ? (
            <>
              <NavItem item={{ to: '/profil', label: t('nav.profile'), icon: 'User' }} active={active} dropdown />
              <NavItem item={{ to: '/notifications', label: t('nav.notifications'), icon: 'Bell' }} active={notificationsActive} dropdown />
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50"
              >
                <AppIcon name="LogOut" className="h-4 w-4" />
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <NavItem item={{ to: '/login', label: t('nav.login'), icon: 'User' }} dropdown />
              <NavItem item={{ to: '/register', label: t('nav.register'), icon: 'PlusCircle' }} dropdown />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function NavItem({ item, active = false, mobile = false, dropdown = false, badge = 0 }) {
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      role={dropdown ? 'menuitem' : undefined}
      className={`flex items-center font-semibold transition ${
        dropdown || mobile
          ? `gap-2.5 rounded-md px-2.5 py-2 text-sm ${
              active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
            }`
          : `relative gap-1.5 px-3 py-5 text-sm ${
              active
                ? 'text-blue-700 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-blue-600'
                : 'text-slate-600 hover:text-slate-950'
            }`
      }`}
    >
      <AppIcon name={item.icon} className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 whitespace-nowrap">{item.label}</span>
      {badge > 0 && <CountBadge count={badge} />}
    </Link>
  )
}

function NotificationLink({ item, count, active, label }) {
  return (
    <Link
      to={item.to}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`relative grid h-9 w-9 place-items-center rounded-lg transition ${
        active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
      }`}
    >
      <AppIcon name="Bell" className="h-[18px] w-[18px]" />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}

const SEARCH_GROUPS = [
  { type: 'ACTIVITE', labelKey: 'nav.activities', icon: 'Calendar' },
  { type: 'GROUPE', labelKey: 'nav.groups', icon: 'Users' },
  { type: 'PROJET', labelKey: 'nav.projects', icon: 'Rocket' },
  // MVP1.5 / masqué volontairement : partenaires et opportunités restent exclus de la recherche visible.
  { type: 'MEMBRE', labelKey: 'nav.members', icon: 'User' },
]

function GlobalSearch({ navigate }) {
  const { t } = useTranslation()
  const searchRef = useRef(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const closeOnOutsideClick = event => {
      if (!searchRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    const closeOnEscape = event => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setError('')
      setLoading(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setLoading(true)
      setError('')
      api.get('/search', { params: { q: trimmed, limit: 30 } })
        .then(res => {
          setResults(Array.isArray(res.data) ? res.data : [])
          setOpen(true)
        })
        .catch(() => {
          setResults([])
          setError(t('search.unavailable'))
          setOpen(true)
        })
        .finally(() => setLoading(false))
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [query])

  const groupedResults = SEARCH_GROUPS
    .map(group => ({
      ...group,
      items: results.filter(result => result.type === group.type),
    }))
    .filter(group => group.items.length > 0)

  const hasQuery = query.trim().length >= 2
  const showPanel = open && hasQuery

  const openResult = result => {
    setOpen(false)
    setQuery('')
    navigate(result.url || '/')
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <label className="relative block">
        <span className="sr-only">{t('search.global')}</span>
        <AppIcon name="Search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onFocus={() => hasQuery && setOpen(true)}
          onChange={event => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          placeholder={t('search.placeholder')}
          className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setResults([])
              setOpen(false)
            }}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={t('search.clear')}
          >
            <AppIcon name="X" className="h-3.5 w-3.5" />
          </button>
        )}
      </label>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          {loading ? (
            <SearchState icon="Search" label={t('search.loading')} />
          ) : error ? (
            <SearchState icon="TriangleAlert" label={error} tone="error" />
          ) : groupedResults.length === 0 ? (
            <SearchState icon="Search" label={t('search.noResults')} />
          ) : (
            <div className="max-h-[70vh] overflow-y-auto py-2">
              {groupedResults.map(group => (
                <section key={group.type} className="px-2 py-1">
                  <h3 className="mb-1 flex items-center gap-1.5 px-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
                    <AppIcon name={group.icon} className="h-3.5 w-3.5" />
                    {t(group.labelKey)}
                  </h3>
                  <div className="grid gap-1">
                    {group.items.map(item => (
                      <button
                        key={`${item.type}-${item.id}`}
                        type="button"
                        onClick={() => openResult(item)}
                        className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                      >
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                          <AppIcon name={group.icon} className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-900">{item.titre}</span>
                          {item.sousTitre && (
                            <span className="mt-0.5 block truncate text-xs text-slate-500">{item.sousTitre}</span>
                          )}
                        </span>
                        {item.badge && (
                          <span className="mt-1 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SearchState({ icon, label, tone = 'muted' }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-5 text-sm font-semibold ${tone === 'error' ? 'text-red-600' : 'text-slate-500'}`}>
      <AppIcon name={icon} className="h-4 w-4" />
      {label}
    </div>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className={`h-3 w-3 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
    >
      <path d="m3 4.5 3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CountBadge({ count }) {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
      {count > 9 ? '9+' : count}
    </span>
  )
}

function UserInitials({ user }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
      {user?.prenom?.[0]}{user?.nom?.[0]}
    </span>
  )
}

function isLinkActive(to, location) {
  const [pathname, search = ''] = to.split('?')
  const currentSearch = location.search.replace(/^\?/, '')
  const pathMatches = pathname === '/'
    ? location.pathname === '/'
    : location.pathname === pathname || location.pathname.startsWith(`${pathname}/`)
  const dashboardWithoutQuery = search === 'tab=dashboard' && currentSearch === ''
  return pathMatches && (!search || currentSearch === search || dashboardWithoutQuery)
}
