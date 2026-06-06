import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import { LEGAL_VERSION } from '../../constants/legal'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [form, setForm] = useState({ prenom:'', nom:'', email:'', motDePasse:'', confirmation:'' })
  const [legalAccepted, setLegalAccepted] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreur(null)
    if (form.motDePasse !== form.confirmation) { setErreur(t('auth.error_passwords')); return }
    if (form.motDePasse.length < 8) { setErreur(t('auth.error_password_min')); return }
    if (!legalAccepted) { setErreur(t('legal.acceptanceRequired')); return }
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        prenom: form.prenom.trim(), nom: form.nom.trim(),
        email: form.email.trim(), motDePasse: form.motDePasse,
        termsAccepted: true,
        privacyAccepted: true,
        legalVersion: LEGAL_VERSION,
      })
      const { token, prenom, nom, email, role } = res.data
      login(token, { prenom, nom, email, role })
      navigate('/dashboard')
    } catch (err) {
      setErreur(formatAuthError(err, t('auth.error_register'), t))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-blue-800">BX-CONNECT</Link>
          <p className="text-gray-500 text-sm mt-1">{t('auth.register_subtitle')}</p>
        </div>
        {erreur && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">{erreur}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.firstname')} *</label>
              <input required value={form.prenom} onChange={e=>setForm({...form,prenom:e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.lastname')} *</label>
              <input required value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')} *</label>
            <input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
              placeholder={t('auth.email_placeholder')}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')} *</label>
            <input type="password" required value={form.motDePasse} onChange={e=>setForm({...form,motDePasse:e.target.value})}
              placeholder={t('auth.password_placeholder')}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.confirm_password')} *</label>
            <input type="password" required value={form.confirmation} onChange={e=>setForm({...form,confirmation:e.target.value})}
              placeholder={t('auth.confirm_password')}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <input
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
          <button type="submit" disabled={loading}
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
  const message = err.response?.data?.message?.toLowerCase() || ''
  if (message.includes('existe')) return t('auth.error_email_exists')
  return fallback
}
