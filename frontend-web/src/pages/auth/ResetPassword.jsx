import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import AppIcon from '../../components/ui/AppIcons'
import logoBxConnect from '../../assets/images/logo-bx-connect.png'
import { getResetPasswordChecks } from '../../utils/passwordPolicy.js'

export default function ResetPassword() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(token ? null : t('auth.reset_password_invalid_link'))
  const checks = useMemo(() => getResetPasswordChecks(password), [password])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    if (!token) {
      setError(t('auth.reset_password_invalid_link'))
      return
    }
    if (!checks.every(Boolean)) {
      setError(t('auth.reset_password_requirements'))
      return
    }
    if (password !== confirmation) {
      setError(t('auth.error_passwords'))
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        token,
        nouveauMotDePasse: password,
      })
      setPassword('')
      setConfirmation('')
      setSuccess(true)
    } catch (requestError) {
      const status = requestError.response?.status
      setError(status === 400 || status === 422
        ? t('auth.reset_password_invalid_or_expired')
        : t('auth.reset_password_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex">
            <img src={logoBxConnect} alt="BX-CONNECT" className="w-[230px] max-w-full object-contain sm:w-[280px]" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-950">{t('auth.reset_password_title')}</h1>
          <p className="mt-2 text-sm text-gray-500">{t('auth.reset_password_subtitle')}</p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-left text-sm text-green-700" role="status">
              <AppIcon name="CheckCircle" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t('auth.reset_password_success')}</span>
            </div>
            <Link to="/login" className="inline-flex rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-600">
              {t('auth.back_to_login')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                <AppIcon name="XCircle" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <PasswordField
              id="reset-password"
              label={t('auth.reset_password_new')}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
            <PasswordRules checks={checks} t={t} />
            <PasswordField
              id="reset-password-confirmation"
              label={t('auth.confirm_password')}
              value={confirmation}
              onChange={setConfirmation}
              autoComplete="new-password"
            />

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full rounded-xl bg-blue-700 py-2.5 font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t('common.loading') : t('auth.reset_password_submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function PasswordField({ id, label, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false)
  const { t } = useTranslation()

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={event => onChange(event.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="button"
          onClick={() => setVisible(current => !current)}
          aria-label={visible ? t('auth.hide_password') : t('auth.show_password')}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-blue-700"
        >
          <AppIcon name={visible ? 'EyeOff' : 'Eye'} className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

function PasswordRules({ checks, t }) {
  const labels = [
    t('auth.reset_password_rule_length'),
    t('auth.password_rule_uppercase'),
    t('auth.password_rule_lowercase'),
    t('auth.password_rule_digit'),
    t('auth.password_rule_special'),
  ]

  return (
    <ul className="space-y-1 text-xs">
      {labels.map((label, index) => (
        <li key={label} className={checks[index] ? 'text-green-600' : 'text-slate-500'}>
          {checks[index] ? '✓' : '•'} {label}
        </li>
      ))}
    </ul>
  )
}
