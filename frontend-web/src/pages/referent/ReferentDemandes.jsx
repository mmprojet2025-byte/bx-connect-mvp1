import { useCallback, useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import { useTranslation } from 'react-i18next'

export default function ReferentDemandes() {
  const { t, i18n } = useTranslation()
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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

  const traiterDemande = async (demande, action) => {
    setProcessingId(demande.id)
    setMessage('')
    setError('')
    try {
      await api.patch(`/referent/groupes/${demande.groupeId}/demandes/${demande.id}/${action}`)
      setMessage(action === 'accepter' ? t('referent.requestAccepted') : t('referent.requestRefused'))
      await fetchDemandes()
    } catch {
      setError(t('referent.errorProcessRequest'))
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-blue-900">{t('referent.requestsTitle')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('referent.pendingRequestsCount', { count: demandes.length })}</p>
        </div>

        {message && <Alert>{message}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : demandes.length === 0 ? (
          <EmptyState
            title={t('referent.noPendingRequests')}
            description={t('referent.noPendingRequestsDesc')}
            actionLabel={t('referent.viewMyGroups')}
            actionTo="/referent/groupes"
          />
        ) : (
          <div className="space-y-4">
            {demandes.map(demande => (
              <div key={`${demande.groupeId}-${demande.id}`} className="bg-white rounded-2xl shadow p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="font-bold text-blue-900">{demande.prenom} {demande.nom}</h2>
                  <p className="text-sm text-gray-500">{demande.email}</p>
                  <p className="text-xs text-gray-400 mt-1">{demande.groupeNom} · {formatDate(demande.dateAdhesion, i18n.language)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => traiterDemande(demande, 'accepter')}
                    disabled={processingId === demande.id}
                    className="bg-green-600 hover:bg-green-500 disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                  >
                    {t('referent.accept')}
                  </button>
                  <button
                    onClick={() => traiterDemande(demande, 'refuser')}
                    disabled={processingId === demande.id}
                    className="bg-red-600 hover:bg-red-500 disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                  >
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

function formatDate(value, language = 'fr') {
  return value ? new Date(value).toLocaleDateString(language) : '-'
}
