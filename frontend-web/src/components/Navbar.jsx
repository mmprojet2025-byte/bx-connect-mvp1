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
  const [mobileOpen, setMobileOpen] = useState(false)
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
    setMobileOpen(false)
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
        setMobileOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const navigation = getPublicNavigation(t)
  const notificationItem = isAuthenticated
    ? { to: '/notifications', label: t('nav.notifications'), icon: 'Bell' }
    : navigation.communication.find(item => item.to === '/notifications')
  const communicationItems = navigation.communication.filter(item => item.to !== '/notifications')
  const homeRoute = isAuthenticated ? getDefaultRouteForRole(user?.role) : '/'

  const changeLanguage = code => {
    i18n.changeLanguage(code)
    localStorage.setItem('bxconnect_lang', code)
  }

  const handleLogout = () => {
    logout()
    setMobileOpen(false)
    setOpenDropdown(null)
    navigate('/')
  }

  const toggleDropdown = name => {
    setOpenDropdown(current => current === name ? null : name)
  }

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 text-slate-700 backdrop-blur-xl"
    >
      <div className="mx-auto grid min-h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-5">
        <Link to={homeRoute} className="flex min-w-0 items-center py-2">
          <img
            src={logoBxConnect}
            alt="BX-CONNECT"
            className="w-[150px] max-w-[42vw] shrink-0 object-contain sm:w-[190px]"
          />
          <span className="ml-2 hidden text-[10px] font-semibold tracking-wide text-orange-600 2xl:block">
            Connecter • Inspirer • Impacter
          </span>
        </Link>

        <div className="hidden items-center justify-center gap-1 lg:flex">
          {!isAuthenticated && (
            <>
              {navigation.space && (
                <NavItem
                  item={navigation.space}
                  active={isLinkActive(navigation.space.to, location)}
                />
              )}

              {navigation.management.length > 0 && (
                <Dropdown
                  name="management"
                  label={t('nav.management')}
                  icon="Folder"
                  items={navigation.management}
                  open={openDropdown === 'management'}
                  active={navigation.management.some(item => isLinkActive(item.to, location))}
                  onToggle={toggleDropdown}
                  location={location}
                />
              )}

              {communicationItems.length > 0 && (
                <Dropdown
                  name="communication"
                  label={t('nav.communication')}
                  icon="MessageCircle"
                  items={communicationItems}
                  open={openDropdown === 'communication'}
                  active={communicationItems.some(item => isLinkActive(item.to, location))}
                  onToggle={toggleDropdown}
                  location={location}
                />
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-1">
          <div className={`${isAuthenticated ? 'flex' : 'hidden lg:flex'} items-center gap-1`}>
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
            <AccountDropdown
              open={openDropdown === 'account'}
              active={location.pathname === '/profil'}
              onToggle={toggleDropdown}
              isAuthenticated={isAuthenticated}
              user={user}
              onLogout={handleLogout}
              t={t}
            />
          </div>

          {!isAuthenticated && (
            <button
              type="button"
              onClick={() => setMobileOpen(open => !open)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              aria-label={t('nav.openMenu')}
            >
              {mobileOpen ? t('nav.close') : t('nav.menu')}
            </button>
          )}
        </div>
      </div>

      {mobileOpen && !isAuthenticated && (
        <div id="mobile-navigation" className="mx-auto max-w-7xl border-t border-slate-100 py-3 lg:hidden">
          <div className="grid gap-2">
            {navigation.space && (
              <MobileSection title={t('nav.space')}>
                <NavItem
                  item={navigation.space}
                  active={isLinkActive(navigation.space.to, location)}
                  mobile
                />
              </MobileSection>
            )}

            {navigation.management.length > 0 && (
              <MobileSection title={t('nav.management')}>
                {navigation.management.map(item => (
                  <NavItem
                    key={item.to}
                    item={item}
                    active={isLinkActive(item.to, location)}
                    mobile
                  />
                ))}
              </MobileSection>
            )}

            {navigation.communication.length > 0 && (
              <MobileSection title={t('nav.communication')}>
                {navigation.communication.map(item => (
                  <NavItem
                    key={item.to}
                    item={item}
                    active={isLinkActive(item.to, location)}
                    mobile
                    badge={item.to === '/notifications' ? notifCount : 0}
                  />
                ))}
              </MobileSection>
            )}

            <MobileAccount
              isAuthenticated={isAuthenticated}
              user={user}
              i18n={i18n}
              onLanguageChange={changeLanguage}
              onLogout={handleLogout}
              t={t}
              profileActive={location.pathname === '/profil'}
            />
          </div>
        </div>
      )}
    </nav>
  )
}

function getPublicNavigation(t) {
  return {
    space: { to: '/', label: t('nav.home'), icon: 'Home' },
    management: [
      { to: '/activites', label: t('nav.activities'), icon: 'Calendar' },
      { to: '/groupes', label: t('nav.groups'), icon: 'Users' },
      { to: '/projets', label: t('nav.projects'), icon: 'Rocket' },
      { to: '/a-propos', label: t('nav.about'), icon: 'Building' },
    ],
    communication: [],
  }
}

function Dropdown({ name, label, icon, items, open, active, onToggle, location }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onToggle(name)}
        className={`relative flex items-center gap-1.5 px-3 py-5 text-sm font-semibold transition ${
          active || open
            ? 'text-blue-700 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-blue-600'
            : 'text-slate-600 hover:text-slate-950'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <AppIcon name={icon} className="h-3.5 w-3.5" />
        <span>{label}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/8"
        >
          {items.map(item => (
            <NavItem
              key={item.to}
              item={item}
              active={isLinkActive(item.to, location)}
              dropdown
            />
          ))}
        </div>
      )}
    </div>
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

function AccountDropdown({ open, active, onToggle, isAuthenticated, user, onLogout, t }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onToggle('account')}
        className={`flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold transition ${
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
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          )}

          {isAuthenticated ? (
            <>
              <NavItem item={{ to: '/profil', label: t('nav.profile'), icon: 'User' }} active={active} dropdown />
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

function MobileAccount({ isAuthenticated, user, i18n, onLanguageChange, onLogout, t, profileActive }) {
  return (
    <MobileSection title={t('nav.account')}>
      {isAuthenticated && (
        <div className="mb-1 rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-sm font-black text-slate-950">{user?.prenom} {user?.nom}</p>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
        </div>
      )}
      <LanguageMenu i18n={i18n} onChange={onLanguageChange} t={t} mobile />
      {isAuthenticated ? (
        <>
          <NavItem item={{ to: '/profil', label: t('nav.profile'), icon: 'User' }} active={profileActive} mobile />
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-700 transition hover:bg-red-50"
          >
            <AppIcon name="LogOut" className="h-4 w-4" />
            {t('nav.logout')}
          </button>
        </>
      ) : (
        <>
          <NavItem item={{ to: '/login', label: t('nav.login'), icon: 'User' }} mobile />
          <NavItem item={{ to: '/register', label: t('nav.register'), icon: 'PlusCircle' }} mobile />
        </>
      )}
    </MobileSection>
  )
}

function LanguageMenu({ i18n, onChange, t, mobile = false }) {
  return (
    <div className={`${mobile ? 'px-3 py-2' : 'border-b border-slate-100 px-3 py-3'}`}>
      <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">{t('nav.language')}</p>
      <div className="flex gap-1 rounded-xl bg-slate-50 p-1">
        {LANGUAGES.map(language => (
          <button
            key={language.code}
            type="button"
            onClick={() => onChange(language.code)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition ${
              i18n.language === language.code
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {language.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function MobileSection({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-100 bg-white p-1.5">
      <h2 className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</h2>
      <div className="grid gap-1">{children}</div>
    </section>
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
