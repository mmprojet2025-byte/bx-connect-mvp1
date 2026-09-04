import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import { LEGAL_VERSION } from '../../constants/legal'
import { getDefaultRouteForRole } from '../../routes/roleRoutes'
import logoBxConnect from '../../assets/images/logo-bx-connect.png'
import AppIcon from '../../components/ui/AppIcons'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [form, setForm] = useState({ prenom:'', nom:'', dateNaissance:'', email:'', motDePasse:'', confirmation:'' })
  const [legalAccepted, setLegalAccepted] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const passwordChecks = getPasswordChecks(form.motDePasse)
  const passwordStrength = getPasswordStrength(passwordChecks)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreur(null)
    if (!form.prenom.trim()) { setErreur(t('auth.error_firstname_required')); return }
    if (!form.nom.trim()) { setErreur(t('auth.error_lastname_required')); return }
    const birthDateError = validateBirthDate(form.dateNaissance, t)
    if (birthDateError) { setErreur(birthDateError); return }
    if (!form.email.trim()) { setErreur(t('auth.error_email_required')); return }
    if (!isValidEmail(form.email)) { setErreur(t('auth.error_email_invalid')); return }
    if (!form.motDePasse) { setErreur(t('auth.error_password_required')); return }
    if (!form.confirmation) { setErreur(t('auth.error_confirmation_required')); return }
    if (form.motDePasse !== form.confirmation) { setErreur(t('auth.error_passwords')); return }
    if (!passwordChecks.every(Boolean)) { setErreur(t('auth.error_password_requirements')); return }
    if (!legalAccepted) { setErreur(t('legal.acceptanceRequired')); return }
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        prenom: form.prenom.trim(), nom: form.nom.trim(),
        dateNaissance: form.dateNaissance,
        email: form.email.trim(), motDePasse: form.motDePasse,
        termsAccepted: true,
        privacyAccepted: true,
        legalVersion: LEGAL_VERSION,
      })
      const { token, prenom, nom, email, role } = res.data
      login(token, { prenom, nom, email, role })
      navigate(getDefaultRouteForRole(role))
    } catch (err) {
      setErreur(formatAuthError(err, t('auth.error_register'), t))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex">
            <img
              src={logoBxConnect}
              alt="BX-CONNECT"
              className="w-[230px] max-w-full object-contain sm:w-[280px]"
            />
          </Link>
          <p className="text-gray-500 text-sm mt-1">{t('auth.register_subtitle')}</p>
        </div>
        {erreur && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5" role="alert">{erreur}</div>}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="register-firstname" className="block text-sm font-medium text-gray-700 mb-1">{t('auth.firstname')} *</label>
              <input id="register-firstname" required value={form.prenom} onChange={e=>setForm({...form,prenom:e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
            <div>
              <label htmlFor="register-lastname" className="block text-sm font-medium text-gray-700 mb-1">{t('auth.lastname')} *</label>
              <input id="register-lastname" required value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
          </div>
          <div>
            <label htmlFor="register-birthdate" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.birthdate_label')} *
            </label>
            <input
              id="register-birthdate"
              type="date"
              required
              min={getBirthDateLimits().min}
              max={getBirthDateLimits().max}
              value={form.dateNaissance}
              onChange={e => setForm({ ...form, dateNaissance: e.target.value })}
              aria-describedby="register-birthdate-help"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p id="register-birthdate-help" className="mt-1 text-xs text-slate-500">{t('auth.birthdate_hint')}</p>
          </div>
          <div>
            <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')} *</label>
            <input id="register-email" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
              placeholder={t('auth.email_placeholder')}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
          <div>
            <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')} *</label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={form.motDePasse}
                onChange={e=>setForm({...form,motDePasse:e.target.value})}
                aria-describedby="register-password-requirements"
                placeholder={t('auth.password_placeholder')}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-blue-700"
              >
                <AppIcon name={showPassword ? 'EyeOff' : 'Eye'} className="h-5 w-5" />
              </button>
            </div>
            <PasswordHelp id="register-password-requirements" checks={passwordChecks} strength={passwordStrength} t={t} />
          </div>
          <div>
            <label htmlFor="register-password-confirmation" className="block text-sm font-medium text-gray-700 mb-1">{t('auth.confirm_password')} *</label>
            <div className="relative">
              <input
                id="register-password-confirmation"
                type={showConfirmation ? 'text' : 'password'}
                required
                value={form.confirmation}
                onChange={e=>setForm({...form,confirmation:e.target.value})}
                placeholder={t('auth.confirm_password')}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirmation(value => !value)}
                aria-label={showConfirmation ? t('auth.hide_password') : t('auth.show_password')}
                aria-pressed={showConfirmation}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-blue-700"
              >
                <AppIcon name={showConfirmation ? 'EyeOff' : 'Eye'} className="h-5 w-5" />
              </button>
            </div>
          </div>
          <label htmlFor="register-legal-acceptance" className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <input
              id="register-legal-acceptance"
              type="checkbox"
              checked={legalAccepted}
              onChange={e => setLegalAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 accent-blue-700"
            />
            <span>
              {t('legal.acceptancePrefix')}{' '}
              <Link to="/conditions-utilisation" target="_blank" className="font-semibold text-blue-700 hover:underline">
                {t('legal.links.terms')}
              </Link>{' '}
              {t('legal.acceptanceAnd')}{' '}
              <Link to="/politique-confidentialite" target="_blank" className="font-semibold text-blue-700 hover:underline">
                {t('legal.links.privacy')}
              </Link>.
            </span>
          </label>
          <button type="submit" disabled={loading} aria-busy={loading}
            className="w-full bg-blue-700 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60">
            {loading ? t('common.loading') : t('auth.register_btn')}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          {t('auth.already_account')}{' '}
          <Link to="/login" className="text-blue-700 font-medium hover:underline">{t('auth.login_link')}</Link>
        </p>
        <LegalLinks t={t} />
      </div>
    </div>
  )
}

function PasswordHelp({ id, checks, strength, t }) {
  if (!strength) return (
    <ul id={id} className="mt-2 space-y-1 text-xs text-slate-500">
      <li>{t('auth.password_rule_length')}</li>
      <li>{t('auth.password_rule_uppercase')}</li>
      <li>{t('auth.password_rule_digit')}</li>
    </ul>
  )

  const strengthStyles = {
    weak: 'text-red-600',
    medium: 'text-amber-600',
    strong: 'text-green-600',
  }

  return (
    <div id={id} className="mt-2">
      <p className={`text-xs font-semibold ${strengthStyles[strength]}`}>
        {t(`auth.password_strength_${strength}`)}
      </p>
      <ul className="mt-1 space-y-1 text-xs">
        <PasswordRule valid={checks[0]} label={t('auth.password_rule_length')} />
        <PasswordRule valid={checks[1]} label={t('auth.password_rule_uppercase')} />
        <PasswordRule valid={checks[2]} label={t('auth.password_rule_digit')} />
      </ul>
    </div>
  )
}

function PasswordRule({ valid, label }) {
  return (
    <li className={valid ? 'text-green-600' : 'text-slate-500'}>
      {valid ? '✓' : '•'} {label}
    </li>
  )
}

function getPasswordChecks(password) {
  return [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
  ]
}

function getPasswordStrength(checks) {
  const score = checks.filter(Boolean).length
  if (score === 0) return null
  if (score === 1) return 'weak'
  if (score === 2) return 'medium'
  return 'strong'
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function validateBirthDate(value, t) {
  if (!value) return t('auth.error_birthdate_required')
  const birthDate = parseIsoDate(value)
  if (!birthDate) return t('auth.error_birthdate_invalid')

  const today = getLocalDateParts()
  const age = calculateAge(birthDate, today)
  if (compareDateParts(birthDate, today) > 0) return t('auth.error_birthdate_future')
  if (age < 16) return t('auth.error_birthdate_too_young')
  if (age > 120 || compareDateParts(birthDate, shiftYears(today, -120)) < 0) return t('auth.error_birthdate_implausible')
  return ''
}

function getBirthDateLimits() {
  const today = getLocalDateParts()
  return {
    min: formatIsoDate(shiftYears(today, -120)),
    max: formatIsoDate(shiftYears(today, -16)),
  }
}

function getLocalDateParts() {
  const date = new Date()
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }
}

function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  if (date.getUTCFullYear() !== parts.year || date.getUTCMonth() + 1 !== parts.month || date.getUTCDate() !== parts.day) return null
  return parts
}

function calculateAge(birthDate, today) {
  let age = today.year - birthDate.year
  if (today.month < birthDate.month || (today.month === birthDate.month && today.day < birthDate.day)) age -= 1
  return age
}

function compareDateParts(left, right) {
  return (left.year - right.year) || (left.month - right.month) || (left.day - right.day)
}

function shiftYears(date, years) {
  const year = date.year + years
  const lastDay = new Date(Date.UTC(year, date.month, 0)).getUTCDate()
  return { year, month: date.month, day: Math.min(date.day, lastDay) }
}

function formatIsoDate(parts) {
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function LegalLinks({ t }) {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-400">
      <Link to="/conditions-utilisation" className="hover:text-blue-700">{t('legal.links.terms')}</Link>
      <Link to="/politique-confidentialite" className="hover:text-blue-700">{t('legal.links.privacy')}</Link>
      <Link to="/mentions-legales" className="hover:text-blue-700">{t('legal.links.notices')}</Link>
    </div>
  )
}

function formatAuthError(err, fallback, t) {
  if (err.response?.status === 403) return t('errors.forbidden')
  const birthDateErrors = {
    BIRTH_DATE_REQUIRED: 'error_birthdate_required',
    BIRTH_DATE_FUTURE: 'error_birthdate_future',
    BIRTH_DATE_MIN_AGE: 'error_birthdate_too_young',
    BIRTH_DATE_IMPLAUSIBLE: 'error_birthdate_implausible',
  }
  if (birthDateErrors[err.response?.data?.code]) return t(`auth.${birthDateErrors[err.response.data.code]}`)
  const message = err.response?.data?.message?.toLowerCase() || ''
  if (message.includes('existe')) return t('auth.error_email_exists')
  return fallback
}
