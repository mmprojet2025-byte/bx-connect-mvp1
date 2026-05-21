import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'

const LANGUAGES = [
  { code: 'fr', label: '🇫🇷 FR' },
  { code: 'nl', label: '🇧🇪 NL' },
  { code: 'en', label: '🇬🇧 EN' },
]

export default function Navbar() {
  const { isAuthenticated, isAdmin, isReferent, isPartenaire, user, logout } = useAuth()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [notifCount, setNotifCount] = useState(0)

  // ─── Badge notifications ──────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/notifications/count')
        .then(res => setNotifCount(res.data.nonLues || 0))
        .catch(() => {})
    }
  }, [isAuthenticated])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const changeLanguage = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('bxconnect_lang', code)
  }

  return (
    <nav className="bg-blue-900 text-white px-4 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="text-xl font-bold tracking-tight hover:text-blue-200 transition">
          BX-CONNECT
        </Link>

        {/* Liens principaux */}
        <div className="hidden md:flex items-center gap-4 text-sm font-medium">
          <Link to="/"          className="hover:text-blue-200 transition">{t('nav.home')}</Link>
          <Link to="/activites" className="hover:text-blue-200 transition">{t('nav.activities')}</Link>
          <Link to="/projets"   className="hover:text-blue-200 transition">{t('nav.projects')}</Link>
          <Link to="/annonces"  className="hover:text-blue-200 transition">📢 Annonces</Link>
          <Link to="/a-propos"  className="hover:text-blue-200 transition">À propos</Link>

          {isAuthenticated && (
            <>
              <Link to="/groupes"    className="hover:text-blue-200 transition">👥 {t('nav.groups')}</Link>
              <Link to="/messagerie" className="hover:text-blue-200 transition">💬 {t('nav.messaging')}</Link>
              <Link to="/prestations" className="hover:text-blue-200 transition">🤝 Bénévolat</Link>
            </>
          )}

          {/* Partenaire */}
          {isPartenaire && (
            <Link to="/partenaire" className="text-orange-300 hover:text-orange-200 transition font-semibold">
              🤝 Partenaire
            </Link>
          )}

          {/* Référent */}
          {isReferent && !isAdmin && (
            <Link to="/referent" className="text-teal-300 hover:text-teal-200 transition font-semibold">
              👤 Référent
            </Link>
          )}

          {/* Admin */}
          {isAdmin && (
            <Link to="/admin" className="text-yellow-300 hover:text-yellow-200 transition font-semibold">
              ⚙️ {t('nav.admin')}
            </Link>
          )}
        </div>

        {/* Droite : langue + notifications + actions */}
        <div className="flex items-center gap-2 text-sm">

          {/* Sélecteur de langue */}
          <div className="flex items-center gap-1 bg-blue-800 rounded-full px-2 py-1">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                style={{
                  background: i18n.language === lang.code ? 'rgba(255,255,255,0.25)' : 'transparent',
                  border: 'none', color: '#fff', borderRadius: '20px',
                  padding: '2px 7px', cursor: 'pointer', fontSize: '0.75rem',
                  fontWeight: i18n.language === lang.code ? 700 : 400,
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {isAuthenticated ? (
            <>
              {/* Badge notifications */}
              <Link to="/notifications" className="relative p-1.5 hover:bg-blue-800 rounded-full transition">
                <span className="text-lg">🔔</span>
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </Link>

              {/* Profil */}
              <Link
                to="/profil"
                className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 px-3 py-1.5 rounded-full transition"
              >
                <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
                  {user?.prenom?.[0]}{user?.nom?.[0]}
                </span>
                <span className="hidden md:inline text-sm">{user?.prenom}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-full transition font-medium text-sm"
              >
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-blue-200 transition font-medium">
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="bg-white text-blue-900 hover:bg-blue-100 px-4 py-1.5 rounded-full transition font-semibold"
              >
                {t('nav.register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}