import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AppIcon from '../../components/ui/AppIcons'
import logoBxConnect from '../../assets/images/logo-bx-connect.png'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex">
            <img
              src={logoBxConnect}
              alt="BX-CONNECT"
              className="h-16 w-[200px] object-contain"
            />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-950">
            {t('auth.forgot_password_title')}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {t('auth.forgot_password_subtitle')}
          </p>
        </div>

        {submitted && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <AppIcon name="CheckCircle" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t('auth.forgot_password_confirmation')}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('auth.email')}
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder={t('auth.email_placeholder')}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-700 py-2.5 font-semibold text-white transition hover:bg-blue-600"
          >
            {t('auth.forgot_password_submit')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link to="/login" className="font-medium text-blue-700 hover:underline">
            {t('auth.back_to_login')}
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
