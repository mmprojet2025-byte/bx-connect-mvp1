import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'

export default function ReferentDashboard() {
  const [stats, setStats] = useState({ groupes: 0, membres: 0, demandes: 0, activites: 0 })
  const [groupes, setGroupes] = useState([])
  const [detailsGroupes, setDetailsGroupes] = useState([])
  const [activites, setActivites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { t } = useTranslation()

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
      setError('Impossible de charger le tableau de bord référent.')
    } finally {
      setLoading(false)
    }
  }, [])

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
        <header className="bg-teal-700 text-white rounded-2xl p-6 mb-6">
          <p className="text-teal-100 text-sm font-semibold uppercase tracking-wide">{t('ux.referentDashboard.eyebrow')}</p>
          <h1 className="text-3xl font-bold mt-1">{t('ux.referentDashboard.title')}</h1>
          <p className="text-teal-100 text-sm mt-2">
            {t('ux.referentDashboard.intro')}
          </p>
        </header>

        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-gray-400 text-center py-10">Chargement...</p>
        ) : (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label={t('ux.referentDashboard.assignedGroups')} value={stats.groupes} />
              <StatCard label={t('ux.referentDashboard.members')} value={stats.membres} />
              <StatCard label={t('ux.referentDashboard.pendingRequests')} value={stats.demandes} highlight={stats.demandes > 0} />
              <StatCard label={t('ux.referentDashboard.activities')} value={stats.activites} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-blue-900">{t('ux.referentDashboard.requestsToHandle')}</h2>
                    <p className="text-sm text-gray-500">{t('ux.referentDashboard.requestsDesc')}</p>
                  </div>
                  <Link to="/referent/demandes" className="text-teal-700 text-sm font-semibold hover:underline">
                    Voir demandes
                  </Link>
                </div>

                {demandesRecentes.length === 0 ? (
                  <EmptyState
                    title="Aucune demande en attente"
                    description="Toutes les demandes de vos groupes sont traitées."
                    actionLabel="Voir mes groupes"
                    actionTo="/referent/groupes"
                  />
                ) : (
                  <div className="grid gap-3">
                    {demandesRecentes.map(demande => (
                      <div key={`${demande.groupeNom}-${demande.id}`} className="border border-amber-100 bg-amber-50 rounded-xl p-4">
                        <p className="font-semibold text-blue-900 text-sm">{demande.prenom} {demande.nom}</p>
                        <p className="text-xs text-gray-500 mt-1">{demande.groupeNom} · {formatDate(demande.dateAdhesion)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="font-bold text-blue-900 mb-4">{t('ux.referentDashboard.quickActions')}</h2>
                <div className="grid gap-3">
                  <QuickAction to="/referent/demandes" label="Traiter les demandes" />
                  <QuickAction to="/referent/activites" label="Créer une activité" />
                  <QuickAction to="/referent/messagerie" label={t('ux.referentDashboard.openMessaging')} />
                </div>
              </div>
            </section>

            <section className="grid lg:grid-cols-2 gap-6 mb-8">
              <InfoPanel title={t('ux.referentDashboard.assignedGroups')} to="/referent/groupes">
                {groupes.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucun groupe ne vous est assigné.</p>
                ) : (
                  <div className="grid gap-3">
                    {groupes.map(groupe => (
                      <div key={groupe.id} className="border border-gray-100 rounded-xl p-4">
                        <h3 className="font-semibold text-blue-900">{groupe.nom}</h3>
                        <p className="text-xs text-gray-400 mt-2">{groupe.nombreMembres ?? 0} membre(s)</p>
                      </div>
                    ))}
                  </div>
                )}
              </InfoPanel>

              <InfoPanel title={t('ux.referentDashboard.recentMembers')} to="/referent/membres">
                {membresRecents.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucun membre dans vos groupes pour le moment.</p>
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

            <InfoPanel title={t('ux.referentDashboard.upcomingActivities')} to="/referent/activites">
              {prochainesActivites.length === 0 ? (
                <p className="text-sm text-gray-400">Aucune activité référent pour le moment.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {prochainesActivites.map(activite => (
                    <div key={activite.id} className="border border-gray-100 rounded-xl p-4">
                      <h3 className="font-semibold text-blue-900">{activite.titre}</h3>
                      <p className="text-xs text-gray-400 mt-1">{activite.dateDebut || 'Date à confirmer'}</p>
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

function StatCard({ label, value, highlight = false }) {
  return (
    <div className={`rounded-2xl shadow p-5 ${highlight ? 'bg-amber-50 border border-amber-200' : 'bg-white'}`}>
      <p className={`text-3xl font-bold ${highlight ? 'text-amber-800' : 'text-teal-700'}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function QuickAction({ to, label }) {
  return (
    <Link to={to} className="bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl text-center transition">
      {label}
    </Link>
  )
}

function InfoPanel({ title, to, children }) {
  return (
    <section className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-blue-900">{title}</h2>
        <Link to={to} className="text-teal-700 text-sm font-semibold hover:underline">
          Ouvrir
        </Link>
      </div>
      {children}
    </section>
  )
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-BE') : '-'
}
