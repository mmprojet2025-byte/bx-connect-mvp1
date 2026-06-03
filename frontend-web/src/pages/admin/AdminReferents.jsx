import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'
import { userFriendlyError } from '../../utils/userFriendlyError'

const emptyForm = {
  prenom: '',
  nom: '',
  email: '',
  motDePasseTemporaire: '',
}

export default function AdminReferents() {
  const { t, i18n } = useTranslation()
  const [referents, setReferents] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)

  const fetchReferents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/referents')
      setReferents(res.data)
      setError('')
    } catch {
      setError(t('referent.errorLoad'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReferents() }, [fetchReferents])

  const creerReferent = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const res = await api.post('/admin/referents', form)
      setReferents(prev => [...prev, res.data])
      setForm(emptyForm)
      setMessage(t('referent.created'))
    } catch (err) {
      setError(formatCreationError(err, t, t('referent.errorCreate')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-blue-900">{t('referent.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('referent.subtitle')}</p>
        </div>

        {message && <Alert>{message}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={creerReferent} className="bg-white rounded-2xl shadow p-5 mb-6">
          <h2 className="font-bold text-blue-900 mb-4">{t('referent.create')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={t('users.firstname')} value={form.prenom} onChange={value => setForm({ ...form, prenom: value })} />
            <Input label={t('users.lastname')} value={form.nom} onChange={value => setForm({ ...form, nom: value })} />
            <Input label={t('users.email')} type="email" value={form.email} onChange={value => setForm({ ...form, email: value })} />
            <Input
              label={t('users.temporaryPassword')}
              type="password"
              value={form.motDePasseTemporaire}
              onChange={value => setForm({ ...form, motDePasseTemporaire: value })}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 bg-blue-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 transition"
          >
            {saving ? t('common.creating') : t('referent.createButton')}
          </button>
        </form>

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '700px' }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.name')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.status')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.registration')}</th>
                  </tr>
                </thead>
                <tbody>
                  {referents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-gray-400 text-sm">{t('referent.none')}</td>
                    </tr>
                  ) : referents.map((referent, index) => (
                    <tr key={referent.id} className={`border-b border-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3 font-medium text-blue-900 text-sm">{referent.prenom} {referent.nom}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{referent.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-3 py-0.5 rounded-full font-medium ${referent.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {referent.actif ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(referent.dateInscription, i18n.language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

function formatCreationError(err, t, fallback) {
  if (err.response?.status === 401) return t('errors.session_expired')
  if (err.response?.status === 403) return t('referent.adminOnly')
  if (err.response?.status === 400) {
    const message = err.response?.data?.message || ''
    if (message.toLowerCase().includes('email')) return t('users.errorEmail')
    if (message.toLowerCase().includes('mot') || message.toLowerCase().includes('password')) {
      return t('users.errorTemporaryPassword')
    }
    return message || t('users.checkFields')
  }
  return userFriendlyError(err, fallback)
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </label>
  )
}

function Alert({ type, children }) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-green-50 border-green-200 text-green-700'

  return <div className={`border px-4 py-3 rounded-xl mb-5 text-sm ${styles}`}>{children}</div>
}

function formatDate(value, language) {
  return value ? new Date(value).toLocaleDateString(language || 'fr-BE') : '-'
}
