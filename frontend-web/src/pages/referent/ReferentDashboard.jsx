import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import QuickActionCard from '../../components/ui/QuickActionCard'
import AppIcon from '../../components/ui/AppIcons'

export default function ReferentDashboard() {
  const [stats, setStats] = useState({ groupes: 0, membres: 0, demandes: 0, activites: 0 })
  const [groupes, setGroupes] = useState([])
  const [detailsGroupes, setDetailsGroupes] = useState([])
  const [activites, setActivites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { t, i18n } = useTranslation()

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const [groupesRes, activitesRes] = await Promise.all([
        api.get('/referent/groupes'),
        api.get('/referent/mes-activites'),
      ])

      const groupesData = groupesRes.data
      const details = await Promise.all(groupesData.map(async (groupe) => {
        const [membresRes, demandesRes] = await Promise.all([
          api.get(`/referent/groupes/${groupe.id}/membres`),
          api.get(`/referent/groupes/${groupe.id}/demandes`),
        ])
        return { groupe, membres: membresRes.data, demandes: demandesRes.data }
      }))

      setGroupes(groupesData)
      setDetailsGroupes(details)
      setActivites(activitesRes.data)
      setStats({
        groupes: groupesData.length,
        membres: details.reduce((total, item) => total + item.membres.length, 0),
        demandes: details.reduce((total, item) => total + item.demandes.length, 0),
        activites: activitesRes.data.length,
      })
      setError('')
    } catch {
      setError(t('referent.dashboardError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const demandesRecentes = useMemo(
    () => detailsGroupes.flatMap(item => item.demandes.map(demande => ({ ...demande, groupeNom: item.groupe.nom }))).slice(0, 5),
    [detailsGroupes]
  )
  const membresRecents = useMemo(
    () => detailsGroupes.flatMap(item => item.membres.map(membre => ({ ...membre, groupeNom: item.groupe.nom }))).slice(0, 5),
    [detailsGroupes]
  )
  const prochainesActivites = activites.slice(0, 4)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <PageHeader
          eyebrow={t('ux.referentDashboard.eyebrow')}
          title={t('ux.referentDashboard.title')}
          description={t('ux.referentDashboard.intro')}
        />

        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label={t('ux.referentDashboard.assignedGroups')}
                value={stats.groupes}
                to="/referent/groupes"
                actionLabel={t('referent.viewMyGroups')}
                icon="Users"
              />
              <StatCard
                label={t('ux.referentDashboard.members')}
                value={stats.membres}
                to="/referent/membres"
                actionLabel={t('referent.membersOfGroups')}
                icon="Users"
              />
              <StatCard
                label={t('ux.referentDashboard.pendingRequests')}
                value={stats.demandes}
                to="/referent/demandes"
                actionLabel={t('referent.viewRequests')}
                highlight={stats.demandes > 0}
                icon="Clock"
              />
              <StatCard
                label={t('ux.referentDashboard.activities')}
                value={stats.activites}
                to="/referent/activites"
                actionLabel={t('referent.activitiesTitle')}
                icon="Calendar"
              />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 mb-8">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-blue-900">{t('ux.referentDashboard.requestsToHandle')}</h2>
                    <p className="text-sm text-gray-500">{t('ux.referentDashboard.requestsDesc')}</p>
                  </div>
                  <Link to="/referent/demandes" className="text-teal-700 text-sm font-semibold hover:underline">
                    {t('referent.viewRequests')}
                  </Link>
                </div>

                {demandesRecentes.length === 0 ? (
                  <EmptyState
                    title={t('referent.noPendingRequests')}
                    description={t('referent.noPendingRequestsDesc')}
                    actionLabel={t('referent.viewMyGroups')}
                    actionTo="/referent/groupes"
                  />
                ) : (
                  <div className="grid gap-3">
                    {demandesRecentes.map(demande => (
                      <div key={`${demande.groupeNom}-${demande.id}`} className="border border-amber-100 bg-amber-50 rounded-xl p-4">
                        <p className="font-semibold text-blue-900 text-sm">{demande.prenom} {demande.nom}</p>
                        <p className="text-xs text-gray-500 mt-1">{demande.groupeNom} · {formatDate(demande.dateAdhesion, i18n.language)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <h2 className="font-bold text-blue-900 mb-4">{t('ux.referentDashboard.quickActions')}</h2>
                <div className="grid gap-3">
                  <QuickActionCard to="/referent/demandes" title={t('referent.processRequests')} tone="amber" icon="Clock" />
                  <QuickActionCard to="/referent/activites" title={t('referent.createActivity')} tone="teal" icon="PlusCircle" />
                  <QuickActionCard to="/referent/messagerie" title={t('ux.referentDashboard.openMessaging')} tone="blue" icon="MessageCircle" />
                </div>
              </div>
            </section>

            <section className="grid lg:grid-cols-2 gap-6 mb-8">
              <InfoPanel title={t('ux.referentDashboard.assignedGroups')} to="/referent/groupes" actionLabel={t('common.open')}>
                {groupes.length === 0 ? (
                  <p className="text-sm text-gray-400">{t('referent.noAssignedGroups')}</p>
                ) : (
                  <div className="grid gap-3">
                    {groupes.map(groupe => (
                      <div key={groupe.id} className="border border-gray-100 rounded-xl p-4">
                        <h3 className="font-semibold text-blue-900">{groupe.nom}</h3>
                        <p className="text-xs text-gray-400 mt-2">{t('groups.members_count', { count: groupe.nombreMembres ?? 0 })}</p>
                      </div>
                    ))}
                  </div>
                )}
              </InfoPanel>

              <InfoPanel title={t('ux.referentDashboard.recentMembers')} to="/referent/membres" actionLabel={t('common.open')}>
                {membresRecents.length === 0 ? (
                  <p className="text-sm text-gray-400">{t('referent.noMembersYet')}</p>
                ) : (
                  <div className="grid gap-3">
                    {membresRecents.map(membre => (
                      <div key={`${membre.groupeNom}-${membre.id}`} className="border border-gray-100 rounded-xl p-3">
                        <p className="font-semibold text-blue-900 text-sm">{membre.prenom} {membre.nom}</p>
                        <p className="text-xs text-gray-400">{membre.groupeNom}</p>
                      </div>
                    ))}
                  </div>
                )}
              </InfoPanel>
            </section>

            <InfoPanel title={t('ux.referentDashboard.upcomingActivities')} to="/referent/activites" actionLabel={t('common.open')}>
              {prochainesActivites.length === 0 ? (
                <p className="text-sm text-gray-400">{t('referent.noActivitiesYet')}</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {prochainesActivites.map(activite => (
                    <div key={activite.id} className="border border-gray-100 rounded-xl p-4">
                      <h3 className="font-semibold text-blue-900">{activite.titre}</h3>
                      <p className="text-xs text-gray-400 mt-1">{activite.dateDebut ? formatDate(activite.dateDebut, i18n.language) : t('memberDashboard.activities.dateToConfirm')}</p>
                    </div>
                  ))}
                </div>
              )}
            </InfoPanel>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

function StatCard({ label, value, to, actionLabel, highlight = false, icon = 'BarChart' }) {
  return (
    <Link
      to={to}
      className={`group rounded-3xl border shadow-sm p-5 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${highlight ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className={`text-3xl font-bold ${highlight ? 'text-amber-800' : 'text-teal-700'}`}>{value}</p>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${highlight ? 'bg-white text-amber-800' : 'bg-teal-50 text-teal-700'}`}>
          <AppIcon name={icon} className="h-5 w-5" />
        </span>
      </div>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      <span className={`inline-flex mt-4 text-xs font-semibold ${highlight ? 'text-amber-800' : 'text-teal-700'} group-hover:underline`}>
        {actionLabel}
      </span>
    </Link>
  )
}

function InfoPanel({ title, to, actionLabel, children }) {
  return (
    <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-blue-900">{title}</h2>
        <Link to={to} className="text-teal-700 text-sm font-semibold hover:underline">
          {actionLabel}
        </Link>
      </div>
      {children}
    </section>
  )
}

function formatDate(value, language = 'fr') {
  return value ? new Date(value).toLocaleDateString(language) : '-'
}
