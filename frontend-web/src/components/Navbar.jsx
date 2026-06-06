import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'
import AppIcon from './ui/AppIcons'

const LANGUAGES = [
  { code: 'fr', label: 'FR' },
  { code: 'nl', label: 'NL' },
  { code: 'en', label: 'EN' },
]

export default function Navbar() {
  const { isAuthenticated, isAdmin, isSuperAdmin, isReferent, isMembre, isPartenaire, user, logout } = useAuth()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [notifCount, setNotifCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/notifications/count')
        .then(res => setNotifCount(res.data.nonLues || 0))
        .catch(() => {})
    }
  }, [isAuthenticated])

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    setProfileOpen(false)
    navigate('/')
  }

  const changeLanguage = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('bxconnect_lang', code)
  }

  const navLinks = getNavLinks({
    isSuperAdmin,
    isAdmin,
    isReferent,
    isMembre,
    isPartenaire,
    t,
  })

  const closeMenu = () => {
    setMenuOpen(false)
    setProfileOpen(false)
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-blue-100/80 bg-white/90 px-4 py-3 text-slate-700 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <Link to="/" onClick={closeMenu} className="group flex min-w-0 items-center gap-3">
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 ring-4 ring-blue-50">
            <AppIcon name="Users" className="h-6 w-6" />
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-orange-500 ring-2 ring-white" />
          </span>
          <span className="min-w-0">
            <span className="block text-xl font-black leading-tight tracking-tight text-slate-950 group-hover:text-blue-700">
              BX-Connect
            </span>
            <span className="hidden text-xs font-bold text-orange-600 sm:block">
              Connecter • Inspirer • Impacter
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-slate-100 bg-slate-50/80 p-1 text-sm font-bold lg:flex">
          {navLinks.map(link => (
            <Link key={`${link.to}-${link.label}`} to={link.to} className="rounded-full px-3.5 py-2 text-slate-600 transition hover:bg-white hover:text-blue-700 hover:shadow-sm">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <LanguageSelector i18n={i18n} onChange={changeLanguage} />

          <div className="hidden sm:flex items-center gap-2">
            <AccountActions
              isAuthenticated={isAuthenticated}
              user={user}
              notifCount={notifCount}
              profileOpen={profileOpen}
              setProfileOpen={setProfileOpen}
              onLogout={handleLogout}
              t={t}
            />
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(open => !open)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-700 lg:hidden"
            aria-expanded={menuOpen}
            aria-label={t('nav.openMenu')}
          >
            {menuOpen ? t('nav.close') : t('nav.menu')}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mx-auto mt-3 max-w-7xl border-t border-slate-100 pt-3 lg:hidden">
          <div className="grid gap-1 text-sm font-bold">
            {navLinks.map(link => (
              <Link
                key={`${link.to}-${link.label}`}
                to={link.to}
                onClick={closeMenu}
                className="rounded-2xl px-3 py-2.5 text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 sm:hidden">
            <AccountActions
              isAuthenticated={isAuthenticated}
              user={user}
              notifCount={notifCount}
              profileOpen={profileOpen}
              setProfileOpen={setProfileOpen}
              onLogout={handleLogout}
              t={t}
              onNavigate={closeMenu}
              mobile
            />
          </div>
        </div>
      )}
    </nav>
  )
}

function getNavLinks({ isSuperAdmin, isAdmin, isReferent, isMembre, isPartenaire, t }) {
  if (isSuperAdmin) {
    return [
      { to: '/super-admin/dashboard', label: t('nav.dashboard', { defaultValue: 'Accueil' }) },
      { to: '/super-admin/admins', label: t('nav.admins', { defaultValue: 'Administrateurs' }) },
      { to: '/notifications', label: t('nav.notifications', { defaultValue: 'Notifications' }) },
    ]
  }

  if (isAdmin) {
    return [
      { to: '/admin/dashboard', label: t('nav.dashboard', { defaultValue: 'Accueil' }) },
      { to: '/admin/utilisateurs', label: t('nav.users', { defaultValue: 'Utilisateurs' }) },
      { to: '/admin/groupes', label: t('nav.groups', { defaultValue: 'Groupes' }) },
      { to: '/admin/groupes', label: t('nav.requests', { defaultValue: 'Demandes' }) },
      { to: '/admin/activites', label: t('nav.activities', { defaultValue: 'Activités' }) },
      { to: '/admin/projets', label: t('nav.projects', { defaultValue: 'Projets' }) },
      { to: '/admin/soutiens', label: t('partnerSupport.admin.nav', { defaultValue: 'Soutiens' }) },
    ]
  }

  if (isReferent) {
    return [
      { to: '/referent/dashboard', label: t('nav.dashboard', { defaultValue: 'Accueil' }) },
      { to: '/referent/groupes', label: t('nav.myGroups', { defaultValue: 'Mes groupes' }) },
      { to: '/referent/demandes', label: t('nav.requests', { defaultValue: 'Demandes' }) },
      { to: '/referent/activites', label: t('nav.activities', { defaultValue: 'Activités' }) },
      { to: '/referent/projets', label: t('nav.projects', { defaultValue: 'Projets' }) },
      { to: '/referent/messagerie', label: t('nav.messaging', { defaultValue: 'Messages' }) },
    ]
  }

  if (isMembre) {
    return [
      { to: '/dashboard', label: t('nav.dashboard', { defaultValue: 'Accueil' }) },
      { to: '/activites', label: t('nav.activities', { defaultValue: 'Activités' }) },
      { to: '/groupes', label: t('nav.groups', { defaultValue: 'Groupes' }) },
      { to: '/projets', label: t('nav.projects', { defaultValue: 'Projets' }) },
      { to: '/messagerie', label: t('nav.messaging', { defaultValue: 'Messages' }) },
    ]
  }

  if (isPartenaire) {
    return [
      { to: '/partenaire?tab=dashboard', label: t('nav.dashboard', { defaultValue: 'Accueil' }) },
      { to: '/partenaire?tab=projets', label: t('nav.projects', { defaultValue: 'Projets' }) },
      { to: '/partenaire?tab=activites', label: t('nav.activities', { defaultValue: 'Activités' }) },
      { to: '/partenaire?tab=soutiens', label: t('partner.supports', { defaultValue: 'Soutiens' }) },
      { to: '/notifications', label: t('nav.notifications', { defaultValue: 'Notifications' }) },
    ]
  }

  return [
    { to: '/', label: t('nav.home', { defaultValue: 'Accueil' }) },
    { to: '/activites', label: t('nav.activities', { defaultValue: 'Activités' }) },
    { to: '/groupes', label: t('nav.groups', { defaultValue: 'Groupes' }) },
    { to: '/projets', label: t('nav.projects', { defaultValue: 'Projets' }) },
    { to: '/a-propos', label: t('nav.about', { defaultValue: 'À propos' }) },
  ]
}

function LanguageSelector({ i18n, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-slate-100 bg-slate-50 px-1.5 py-1 text-slate-600">
      {LANGUAGES.map(lang => (
        <button
          key={lang.code}
          type="button"
          onClick={() => onChange(lang.code)}
          className={`rounded-full px-2 py-1 text-xs transition ${i18n.language === lang.code ? 'bg-white font-black text-blue-700 shadow-sm' : 'font-semibold hover:text-blue-700'}`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}

function AccountActions({ isAuthenticated, user, notifCount, profileOpen, setProfileOpen, onLogout, onNavigate, t, mobile = false }) {
  if (!isAuthenticated) {
    return (
      <>
        <Link to="/login" onClick={onNavigate} className="rounded-full px-3 py-2 font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700">
          {t('nav.login')}
        </Link>
        <Link
          to="/register"
          onClick={onNavigate}
          className="rounded-full bg-blue-600 px-4 py-2 font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
        >
          {t('nav.register')}
        </Link>
      </>
    )
  }

  if (mobile) {
    return (
      <>
        <Link to="/notifications" onClick={onNavigate} className="relative rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
          {t('nav.notifications')}
          <NotificationDot count={notifCount} />
        </Link>
        <Link to="/profil" onClick={onNavigate} className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-700">
          <UserInitials user={user} />
          <span className="text-sm font-bold">{user?.prenom}</span>
        </Link>
        <button type="button" onClick={onLogout} className="rounded-full border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          {t('nav.logout')}
        </button>
      </>
    )
  }

  return (
    <>
      <Link to="/notifications" className="relative grid h-11 w-11 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 transition hover:bg-blue-100">
        <AppIcon name="Bell" className="h-5 w-5" />
        <NotificationDot count={notifCount} />
      </Link>

      <div className="relative">
        <button
          type="button"
          onClick={() => setProfileOpen(open => !open)}
          className="flex items-center gap-2 rounded-full border border-slate-100 bg-white px-2 py-1.5 text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-700"
        >
          <UserInitials user={user} />
          <span className="hidden max-w-24 truncate text-sm font-black md:inline">{user?.prenom}</span>
          <AppIcon name="Settings" className="h-4 w-4 text-slate-400" />
        </button>

        {profileOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-3xl border border-slate-100 bg-white p-2 shadow-xl shadow-slate-900/10">
            <div className="px-3 py-2">
              <p className="text-sm font-black text-slate-950">{user?.prenom} {user?.nom}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
            <Link to="/profil" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700">
              <AppIcon name="User" className="h-4 w-4" />
              {t('nav.profile')}
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-bold text-red-700 hover:bg-red-50"
            >
              <AppIcon name="LogOut" className="h-4 w-4" />
              {t('nav.logout')}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function NotificationDot({ count }) {
  if (!count) return null
  return (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
      {count > 9 ? '9+' : count}
    </span>
  )
}

function UserInitials({ user }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-400 text-xs font-black text-white shadow-sm">
      {user?.prenom?.[0]}{user?.nom?.[0]}
    </span>
  )
}
