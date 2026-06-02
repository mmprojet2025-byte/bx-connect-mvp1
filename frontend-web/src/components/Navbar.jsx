import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'

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

  const closeMenu = () => setMenuOpen(false)

  return (
    <nav className="bg-blue-900 text-white px-4 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <Link to="/" onClick={closeMenu} className="text-xl font-bold tracking-tight hover:text-blue-200 transition">
          BX-CONNECT
        </Link>

        <div className="hidden lg:flex items-center gap-4 text-sm font-medium">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} className={link.className || 'hover:text-blue-200 transition'}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <LanguageSelector i18n={i18n} onChange={changeLanguage} />

          <div className="hidden sm:flex items-center gap-2">
            <AccountActions
              isAuthenticated={isAuthenticated}
              isSuperAdmin={isSuperAdmin}
              user={user}
              notifCount={notifCount}
              onLogout={handleLogout}
              t={t}
            />
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(open => !open)}
            className="lg:hidden border border-blue-700 hover:bg-blue-800 rounded-xl px-3 py-2 text-sm font-semibold"
            aria-expanded={menuOpen}
            aria-label={t('nav.openMenu')}
          >
            {menuOpen ? t('nav.close') : t('nav.menu')}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden max-w-7xl mx-auto mt-3 border-t border-blue-800 pt-3">
          <div className="grid gap-1 text-sm font-medium">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={closeMenu}
                className="px-3 py-2 rounded-xl hover:bg-blue-800 transition"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="sm:hidden mt-3 pt-3 border-t border-blue-800 flex flex-wrap items-center gap-2">
            <AccountActions
              isAuthenticated={isAuthenticated}
              isSuperAdmin={isSuperAdmin}
              user={user}
              notifCount={notifCount}
              onLogout={handleLogout}
              t={t}
              onNavigate={closeMenu}
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
      { to: '/super-admin/dashboard', label: t('nav.dashboard') },
      { to: '/super-admin/admins', label: t('nav.admins') },
      { to: '/super-admin/logs', label: t('nav.logs') },
    ]
  }

  if (isAdmin) {
    return [
      { to: '/admin/dashboard', label: t('nav.adminDashboard') },
      { to: '/admin/utilisateurs', label: t('nav.users') },
      { to: '/admin/referents', label: t('nav.referents') },
      { to: '/admin/groupes', label: t('nav.groups') },
      { to: '/admin/activites', label: t('nav.activities') },
      { to: '/admin/projets', label: t('nav.projects') },
    ]
  }

  if (isReferent) {
    return [
      { to: '/referent/dashboard', label: t('nav.dashboard') },
      { to: '/referent/groupes', label: t('nav.myGroups') },
      { to: '/referent/membres', label: t('nav.users') },
      { to: '/referent/demandes', label: t('nav.requests') },
      { to: '/referent/activites', label: t('nav.activities') },
      { to: '/referent/messagerie', label: t('nav.messaging') },
    ]
  }

  if (isMembre) {
    return [
      { to: '/dashboard', label: t('nav.dashboard') },
      { to: '/activites', label: t('nav.activities') },
      { to: '/groupes', label: t('nav.groups') },
      { to: '/projets', label: t('nav.projects') },
      { to: '/messagerie', label: t('nav.messaging') },
      { to: '/profil', label: t('nav.profile') },
    ]
  }

  if (isPartenaire) {
    return [
      { to: '/partenaire', label: t('nav.partner'), className: 'text-orange-300 hover:text-orange-200 transition font-semibold' },
    ]
  }

  return [
    { to: '/', label: t('nav.home') },
    { to: '/activites', label: t('nav.activities') },
    { to: '/groupes', label: t('nav.groups') },
    { to: '/projets', label: t('nav.projects') },
    { to: '/a-propos', label: t('nav.about') },
  ]
}

function LanguageSelector({ i18n, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-blue-800 rounded-full px-2 py-1">
      {LANGUAGES.map(lang => (
        <button
          key={lang.code}
          type="button"
          onClick={() => onChange(lang.code)}
          className={`rounded-full px-2 py-0.5 text-xs transition ${i18n.language === lang.code ? 'bg-white/25 font-bold' : 'font-normal'}`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}

function AccountActions({ isAuthenticated, isSuperAdmin, user, notifCount, onLogout, onNavigate, t }) {
  if (!isAuthenticated) {
    return (
      <>
        <Link to="/login" onClick={onNavigate} className="hover:text-blue-200 transition font-medium">
          {t('nav.login')}
        </Link>
        <Link
          to="/register"
          onClick={onNavigate}
          className="bg-white text-blue-900 hover:bg-blue-100 px-4 py-1.5 rounded-full transition font-semibold"
        >
          {t('nav.register')}
        </Link>
      </>
    )
  }

  return (
    <>
      {!isSuperAdmin && (
        <>
          <Link to="/notifications" onClick={onNavigate} className="relative p-1.5 hover:bg-blue-800 rounded-full transition">
            <span className="text-lg">🔔</span>
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </Link>

          <Link
            to="/profil"
            onClick={onNavigate}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 px-3 py-1.5 rounded-full transition"
          >
            <UserInitials user={user} />
            <span className="text-sm">{user?.prenom}</span>
          </Link>
        </>
      )}

      {isSuperAdmin && (
        <span className="flex items-center gap-2 bg-blue-700 px-3 py-1.5 rounded-full">
          <UserInitials user={user} />
          <span className="text-sm">{user?.prenom}</span>
        </span>
      )}

      <button
        type="button"
        onClick={onLogout}
        className="bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-full transition font-medium text-sm"
      >
        {t('nav.logout')}
      </button>
    </>
  )
}

function UserInitials({ user }) {
  return (
    <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
      {user?.prenom?.[0]}{user?.nom?.[0]}
    </span>
  )
}
