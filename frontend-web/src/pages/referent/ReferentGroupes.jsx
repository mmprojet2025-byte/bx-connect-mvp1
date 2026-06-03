import { useCallback, useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'
import { useTranslation } from 'react-i18next'
import StatusBadge from '../../components/StatusBadge'
import GroupAvatar from '../../components/GroupAvatar'

export default function ReferentGroupes() {
  const { t } = useTranslation()
  const [groupes, setGroupes] = useState([])
  const [details, setDetails] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchGroupes = useCallback(async () => {
    setLoading(true)
    try {
      const groupesRes = await api.get('/referent/groupes')
      const groupesData = groupesRes.data
      const detailsData = {}

      await Promise.all(groupesData.map(async (groupe) => {
        const [membresRes, demandesRes] = await Promise.all([
          api.get(`/referent/groupes/${groupe.id}/membres`),
          api.get(`/referent/groupes/${groupe.id}/demandes`),
        ])
        detailsData[groupe.id] = {
          membres: membresRes.data,
          demandes: demandesRes.data,
        }
      }))

      setGroupes(groupesData)
      setDetails(detailsData)
      setError('')
    } catch {
      setError(t('messaging.errorGroups'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchGroupes() }, [fetchGroupes])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <h1 className="text-2xl font-bold text-blue-900 mb-6">{t('nav.myGroups')}</h1>
        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : groupes.length === 0 ? (
          <EmptyState>{t('referent.noAssignedGroups')}</EmptyState>
        ) : (
          <div className="space-y-5">
            {groupes.map(groupe => {
              const membres = details[groupe.id]?.membres || []
              const demandes = details[groupe.id]?.demandes || []
              return (
                <article key={groupe.id} className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                  <div className="flex flex-col md:flex-row md:justify-between gap-3 mb-4">
                    <div className="flex items-start gap-4">
                      <GroupAvatar name={groupe.nom} />
                      <div>
                        <h2 className="text-lg font-bold text-blue-900">{groupe.nom}</h2>
                        {groupe.description && <p className="text-sm text-gray-500 mt-1">{groupe.description}</p>}
                        <div className="flex flex-wrap gap-2 mt-3 text-xs">
                          {groupe.nombreMembres !== undefined && (
                            <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-full font-semibold">
                              {t('groups.members_count', { count: groupe.nombreMembres })}
                            </span>
                          )}
                          {groupe.theme && <span className="bg-teal-50 text-teal-800 px-2.5 py-1 rounded-full font-semibold">{groupe.theme}</span>}
                          {groupe.categorie && <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-semibold">{groupe.categorie}</span>}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={groupe.statut} className="self-start">
                      {t(`statuses.${groupe.statut}`, groupe.statut)}
                    </StatusBadge>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <InfoPanel title={t('ux.referentDashboard.members')} count={membres.length}>
                      <CompactPeopleList items={membres} empty={t('referent.noAcceptedMembers')} />
                    </InfoPanel>
                    <InfoPanel title={t('nav.requests')} count={demandes.length}>
                      <CompactPeopleList items={demandes} empty={t('referent.noPendingRequests')} />
                    </InfoPanel>
                    <InfoPanel title={t('referent.linkedActivities')}>
                      <p className="text-sm text-gray-400">Non disponible.</p>
                    </InfoPanel>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function InfoPanel({ title, count, children }) {
  return (
    <section className="bg-gray-50 rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-blue-900 text-sm">{title}</h3>
        {count !== undefined && (
          <span className="text-xs bg-white border border-gray-100 text-gray-500 rounded-full px-2 py-0.5">{count}</span>
        )}
      </div>
      {children}
    </section>
  )
}

function CompactPeopleList({ items, empty }) {
  if (items.length === 0) return <p className="text-sm text-gray-400">{empty}</p>
  return (
    <ul className="space-y-2">
      {items.slice(0, 4).map(item => (
        <li key={item.id} className="text-sm text-gray-600">
          <span className="font-medium text-gray-800">{item.prenom} {item.nom}</span>
          <span className="block text-xs text-gray-400">{item.email}</span>
        </li>
      ))}
    </ul>
  )
}

function EmptyState({ children }) {
  return <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400 text-sm">{children}</div>
}

function Alert({ type, children }) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-green-50 border-green-200 text-green-700'

  return <div className={`border px-4 py-3 rounded-xl mb-5 text-sm ${styles}`}>{children}</div>
}
