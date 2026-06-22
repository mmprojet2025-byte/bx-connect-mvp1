import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'
import { userFriendlyError } from '../../utils/userFriendlyError'
import AppIcon from '../../components/ui/AppIcons'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import LoadingState from '../../components/ui/LoadingState'

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
  const [recherche, setRecherche] = useState('')

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

  const referentsFiltres = referents.filter(referent => {
    const texte = `${referent.prenom || ''} ${referent.nom || ''} ${referent.email || ''}`.toLowerCase()
    return texte.includes(recherche.toLowerCase())
  })
  const stats = {
    total: referents.length,
    actifs: referents.filter(referent => referent.actif).length,
    inactifs: referents.filter(referent => !referent.actif).length,
  }

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
        <PageHeader
          eyebrow={t('admin.referents_title')}
          title={t('referent.title')}
          description={t('referent.subtitle')}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon="User" label={t('common.total', { defaultValue: 'Total' })} value={stats.total} tone="blue" />
          <StatCard icon="CheckCircle" label={t('common.active')} value={stats.actifs} tone="green" />
          <StatCard icon="Clock" label={t('common.inactive')} value={stats.inactifs} tone="amber" />
        </div>

        {message && <Alert>{message}</Alert>}
        {error && referents.length > 0 && <Alert type="error">{error}</Alert>}

        <form onSubmit={creerReferent} className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
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
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            <AppIcon name="PlusCircle" className="h-4 w-4" />
            {saving ? t('common.creating') : t('referent.createButton')}
          </button>
        </form>

        <SectionCard className="mb-6" title={t('common.filters', { defaultValue: 'Filtres' })}>
          <label className="relative block">
            <AppIcon name="Search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder={t('common.search', { defaultValue: 'Rechercher' })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>
        </SectionCard>

        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : error && referents.length === 0 ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error}
            actionLabel={t('common.retry')}
            action={fetchReferents}
          />
        ) : referents.length === 0 ? (
          <EmptyState
            icon="User"
            title={t('referent.none')}
          />
        ) : referentsFiltres.length === 0 ? (
          <EmptyState
            icon="Search"
            title={t('common.noResults', { defaultValue: 'Aucun résultat trouvé.' })}
          />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
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
                  {referentsFiltres.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-gray-400 text-sm">{t('referent.none')}</td>
                    </tr>
                  ) : referentsFiltres.map((referent, index) => (
                    <tr key={referent.id} className={`border-b border-gray-50 transition hover:bg-blue-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3 font-medium text-blue-900 text-sm">{referent.prenom} {referent.nom}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{referent.email}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={referent.actif ? 'VALIDE' : 'ANNULEE'}>
                          {referent.actif ? t('common.active') : t('common.inactive')}
                        </StatusBadge>
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

function StatCard({ icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  }
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${tones[tone] || tones.blue}`}>
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
    </div>
  )
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
