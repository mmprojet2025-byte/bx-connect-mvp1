import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import { getDefaultRouteForRole } from '../../routes/roleRoutes'
import AppIcon from '../../components/ui/AppIcons'
import logoBxConnect from '../../assets/images/logo-bx-connect.png'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [form, setForm] = useState({ email: '', motDePasse: '' })
  const [erreur, setErreur] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreur(null)
    setLoading(true)
    try {
      const res = await api.post('/auth/login', form)
      const { token, prenom, nom, email, role } = res.data
      login(token, { prenom, nom, email, role })
      navigate(getDefaultRouteForRole(role))
    } catch (err) {
      setErreur(formatAuthError(err, t('auth.error_login'), t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex">
            <img
              src={logoBxConnect}
              alt="BX-CONNECT"
              className="h-16 w-[200px] object-contain"
            />
          </Link>
          <p className="text-gray-500 text-sm mt-1">{t('auth.login_subtitle')}</p>
        </div>

        {/* Erreur */}
        {erreur && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
            <AppIcon name="XCircle" className="h-4 w-4 shrink-0" />
            <span>{erreur}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.email')}
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder={t('auth.email_placeholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.password')}
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={form.motDePasse}
              onChange={e => setForm({ ...form, motDePasse: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder={t('auth.password_placeholder')}
            />
            <div className="mt-2 text-right">
              <Link
                to="/mot-de-passe-oublie"
                className="text-sm font-medium text-blue-700 hover:underline"
              >
                {t('auth.forgot_password')}
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60"
          >
            {loading ? t('common.loading') : t('auth.login_btn')}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {t('auth.no_account')}{' '}
          <Link to="/register" className="text-blue-700 font-medium hover:underline">
            {t('auth.register_link')}
          </Link>
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <Link to="/conditions-utilisation" className="hover:text-blue-700">{t('legal.links.terms')}</Link>
          <Link to="/politique-confidentialite" className="hover:text-blue-700">{t('legal.links.privacy')}</Link>
          <Link to="/mentions-legales" className="hover:text-blue-700">{t('legal.links.notices')}</Link>
        </div>
      </div>
    </div>
  )
}

function formatAuthError(err, fallback, t) {
  if (err.response?.status === 403) return t('errors.forbidden')
  return fallback
}
