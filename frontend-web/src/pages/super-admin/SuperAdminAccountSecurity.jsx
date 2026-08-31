import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import AppIcon from '../../components/ui/AppIcons'
import { useAuth } from '../../context/AuthContext'
import { isValidResetPassword } from '../../utils/passwordPolicy'

const EMPTY_FORM = {
  ancienMotDePasse: '',
  nouveauMotDePasse: '',
  confirmationMotDePasse: '',
}

export default function SuperAdminAccountSecurity() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const updateField = event => {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')

    if (form.nouveauMotDePasse !== form.confirmationMotDePasse) {
      setError(t('profile.passwordMismatch'))
      return
    }
    if (!isValidResetPassword(form.nouveauMotDePasse)) {
      setError(t('profile.passwordInvalid'))
      return
    }

    setSubmitting(true)
    try {
      await api.put('/users/me/password', {
        ancienMotDePasse: form.ancienMotDePasse,
        nouveauMotDePasse: form.nouveauMotDePasse,
      })
      logout()
      navigate('/login', { replace: true, state: { passwordChanged: true } })
    } catch (requestError) {
      setError(formatPasswordError(requestError, t))
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:px-6 sm:py-12">
        <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-labelledby="account-security-title">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <AppIcon name="Shield" className="h-5 w-5" />
            </div>
            <div>
              <h1 id="account-security-title" className="text-2xl font-black text-slate-950">
                {t('profile.securityAccount')}
              </h1>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {t('profile.securityAccountDescription')}
              </p>
              {user?.role && (
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-blue-700">
                  {t(`roles.${user.role}`, user.role)}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div id="account-security-error" role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" aria-describedby="account-password-rules">
            <PasswordField
              id="super-admin-current-password"
              name="ancienMotDePasse"
              label={t('profile.old_password')}
              value={form.ancienMotDePasse}
              onChange={updateField}
              autoComplete="current-password"
            />
            <PasswordField
              id="super-admin-new-password"
              name="nouveauMotDePasse"
              label={t('profile.new_password')}
              value={form.nouveauMotDePasse}
              onChange={updateField}
              autoComplete="new-password"
            />
            <PasswordField
              id="super-admin-confirm-password"
              name="confirmationMotDePasse"
              label={t('profile.confirm_password')}
              value={form.confirmationMotDePasse}
              onChange={updateField}
              autoComplete="new-password"
            />

            <p id="account-password-rules" className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              {t('profile.passwordRules')}
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <AppIcon name="Lock" className="h-4 w-4" />
              {submitting ? t('profile.passwordChanging') : t('profile.save_password')}
            </button>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function PasswordField({ id, name, label, value, onChange, autoComplete }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="password"
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required
        aria-describedby="account-password-rules"
        className="h-12 w-full rounded-xl border border-slate-300 px-4 text-base text-slate-950 transition focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
      />
    </div>
  )
}

function formatPasswordError(error, t) {
  if (error.response?.status === 401) return t('errors.session_expired')
  if (error.response?.status === 403) return t('errors.forbidden')
  return error.response?.data?.message || t('profile.error_password')
}
