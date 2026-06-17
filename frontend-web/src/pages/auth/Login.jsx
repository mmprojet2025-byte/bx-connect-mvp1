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
  const [googleNotice, setGoogleNotice] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreur(null)
    setGoogleNotice(null)
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
    <div className="min-h-screen bg-white px-5 py-6 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col">
        <div className="flex justify-center text-sm text-slate-600 sm:justify-end">
          <span>Pas encore inscrit ?</span>
          <Link
            to="/register"
            className="ml-2 font-semibold text-blue-700 hover:text-blue-800 hover:underline"
          >
            {t('auth.register_link')}
          </Link>
        </div>

        <main className="flex flex-1 items-center justify-center py-12">
          <section className="w-full max-w-[420px]">
            <div className="mb-10 text-center">
              <Link to="/" className="inline-flex justify-center">
                <img
                  src={logoBxConnect}
                  alt="BX-CONNECT"
                  className="w-[260px] max-w-full object-contain sm:w-[340px]"
                />
              </Link>
              <h1 className="mt-10 text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
                Bienvenue sur BX-Connect
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
                Rejoins les activités, groupes et projets de ta communauté.
              </p>
            </div>

            {erreur && (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AppIcon name="XCircle" className="h-4 w-4 shrink-0" />
                <span>{erreur}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="h-13 w-full rounded-xl border border-slate-300 px-4 text-base text-slate-900 transition placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  placeholder={t('auth.email_placeholder')}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label className="block text-sm font-semibold text-slate-800">
                    {t('auth.password')}
                  </label>
                  <Link
                    to="/mot-de-passe-oublie"
                    className="text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                  >
                    {t('auth.forgot_password')}
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={form.motDePasse}
                  onChange={e => setForm({ ...form, motDePasse: e.target.value })}
                  className="h-13 w-full rounded-xl border border-slate-300 px-4 text-base text-slate-900 transition placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  placeholder={t('auth.password_placeholder')}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-13 w-full rounded-xl bg-blue-700 px-5 text-base font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? t('common.loading') : t('auth.login_btn')}
              </button>
            </form>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                OU SE CONNECTER AVEC
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={() => setGoogleNotice('Connexion Google bientôt disponible.')}
              className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-base font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              Google
            </button>

            {googleNotice && (
              <p className="mt-3 text-center text-sm font-medium text-blue-700">
                {googleNotice}
              </p>
            )}

            <p className="mt-7 text-center text-sm text-slate-600">
              {t('auth.no_account')}{' '}
              <Link to="/register" className="font-semibold text-blue-700 hover:text-blue-800 hover:underline">
                {t('auth.register_link')}
              </Link>
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-slate-200 pt-6 text-xs text-slate-500">
              <Link to="/conditions-utilisation" className="hover:text-blue-700">{t('legal.links.terms')}</Link>
              <Link to="/politique-confidentialite" className="hover:text-blue-700">{t('legal.links.privacy')}</Link>
              <Link to="/mentions-legales" className="hover:text-blue-700">{t('legal.links.notices')}</Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

function formatAuthError(err, fallback, t) {
  if (err.response?.status === 403) return t('errors.forbidden')
  return fallback
}
