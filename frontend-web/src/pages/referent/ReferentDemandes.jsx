import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'
import Alert from '../../components/ui/Alert'
import { useTranslation } from 'react-i18next'
import AppIcon from '../../components/ui/AppIcons'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import ErrorState from '../../components/ui/ErrorState'
import LoadingState from '../../components/ui/LoadingState'

export default function ReferentDemandes() {
  const { t, i18n } = useTranslation()
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [recherche, setRecherche] = useState('')

  const fetchDemandes = useCallback(async () => {
    setLoading(true)
    try {
      const groupesRes = await api.get('/referent/groupes')
      const demandesData = await Promise.all(groupesRes.data.map(async (groupe) => {
        const res = await api.get(`/referent/groupes/${groupe.id}/demandes`)
        return res.data.map(demande => ({ ...demande, groupeId: groupe.id, groupeNom: groupe.nom }))
      }))
      setDemandes(demandesData.flat())
      setError('')
    } catch {
      setError(t('referent.errorRequestsLoad'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchDemandes() }, [fetchDemandes])

  const demandesFiltrees = demandes.filter(demande => {
    const texte = `${demande.prenom || ''} ${demande.nom || ''} ${demande.email || ''} ${demande.groupeNom || ''}`.toLowerCase()
    return texte.includes(recherche.toLowerCase())
  })

  const traiterDemande = async (demande, action) => {
    setProcessingId(demande.id)
    setMessage('')
    setError('')
    try {
      await api.patch(`/referent/groupes/${demande.groupeId}/demandes/${demande.id}/${action}`)
      const feedback = action === 'accepter' ? t('referent.requestAccepted') : t('referent.requestRefused')
      setMessage(feedback)
      toast.success(feedback)
      await fetchDemandes()
    } catch {
      const feedback = t('referent.errorProcessRequest')
      setError(feedback)
      toast.error(feedback)
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <PageHeader
          eyebrow={t('nav.requests')}
          title={t('referent.requestsTitle')}
          description={t('referent.pendingRequestsCount', { count: demandes.length })}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon="Clock" label={t('ux.referentDashboard.pendingRequests')} value={demandes.length} tone="amber" />
          <StatCard icon="Search" label={t('common.results', { defaultValue: 'Résultats' })} value={demandesFiltrees.length} tone="blue" />
          <StatCard icon="Users" label={t('nav.myGroups')} value={new Set(demandes.map(demande => demande.groupeId)).size} tone="green" />
        </div>

        <SectionCard className="mb-6" title={t('common.filters', { defaultValue: 'Filtres' })}>
          <label className="relative block">
            <AppIcon name="Search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder={t('common.search', { defaultValue: 'Rechercher' })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </label>
        </SectionCard>

        {message && <Alert>{message}</Alert>}
        {error && demandes.length > 0 && <Alert type="error">{error}</Alert>}

        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : error && demandes.length === 0 ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error}
            actionLabel={t('common.retry')}
            action={fetchDemandes}
          />
        ) : demandes.length === 0 ? (
          <ModernEmpty
            icon="Clock"
            title={t('referent.noPendingRequests')}
            description={t('referent.noPendingRequestsDesc')}
            actionLabel={t('referent.viewMyGroups')}
            actionTo="/referent/groupes"
          />
        ) : demandesFiltrees.length === 0 ? (
          <ModernEmpty
            icon="Search"
            title={t('common.noResults', { defaultValue: 'Aucun résultat trouvé.' })}
            description={t('referent.noPendingRequestsDesc')}
          />
        ) : (
          <div className="space-y-4">
            {demandesFiltrees.map(demande => (
              <div key={`${demande.groupeId}-${demande.id}`} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="font-bold text-blue-900">{demande.prenom} {demande.nom}</h2>
                  <p className="text-sm text-gray-500">{demande.email}</p>
                  <p className="text-xs text-gray-400 mt-1">{demande.groupeNom} · {formatDate(demande.dateAdhesion, i18n.language)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => traiterDemande(demande, 'accepter')}
                    disabled={processingId === demande.id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:bg-gray-300"
                  >
                    <AppIcon name="CheckCircle" className="h-4 w-4" />
                    {t('referent.accept')}
                  </button>
                  <button
                    onClick={() => traiterDemande(demande, 'refuser')}
                    disabled={processingId === demande.id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:bg-gray-300"
                  >
                    <AppIcon name="XCircle" className="h-4 w-4" />
                    {t('referent.refuse')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function StatCard({ icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  }
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${tones[tone] || tones.blue}`}>
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  )
}

function ModernEmpty({ icon, title, description, actionLabel, actionTo }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
      <AppIcon name={icon} className="mx-auto mb-3 h-10 w-10 text-teal-200" />
      <h2 className="font-semibold text-blue-900">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{description}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-600">
          <AppIcon name="Users" className="h-4 w-4" />
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

function formatDate(value, language = 'fr') {
  return value ? new Date(value).toLocaleDateString(language) : '-'
}
