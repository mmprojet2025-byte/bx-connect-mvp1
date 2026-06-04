import { useCallback, useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'
import { useTranslation } from 'react-i18next'
import StatusBadge from '../../components/StatusBadge'
import GroupAvatar from '../../components/GroupAvatar'
import AppIcon from '../../components/ui/AppIcons'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'

export default function ReferentGroupes() {
  const { t } = useTranslation()
  const [groupes, setGroupes] = useState([])
  const [details, setDetails] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recherche, setRecherche] = useState('')

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

  const groupesFiltres = groupes.filter(groupe => {
    const texte = `${groupe.nom || ''} ${groupe.description || ''} ${groupe.theme || ''} ${groupe.categorie || ''}`.toLowerCase()
    return texte.includes(recherche.toLowerCase())
  })
  const totalMembres = Object.values(details).reduce((total, detail) => total + (detail.membres?.length || 0), 0)
  const totalDemandes = Object.values(details).reduce((total, detail) => total + (detail.demandes?.length || 0), 0)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <PageHeader
          eyebrow={t('nav.myGroups')}
          title={t('nav.myGroups')}
          description={t('referent.groupsSubtitle', { defaultValue: 'Suivez vos groupes assignés, leurs membres et leurs demandes.' })}
        />
        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : groupes.length === 0 ? (
          <EmptyState>{t('referent.noAssignedGroups')}</EmptyState>
        ) : (
          <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon="Users" label={t('ux.referentDashboard.assignedGroups')} value={groupes.length} tone="blue" />
            <StatCard icon="User" label={t('ux.referentDashboard.members')} value={totalMembres} tone="green" />
            <StatCard icon="Clock" label={t('ux.referentDashboard.pendingRequests')} value={totalDemandes} tone="amber" />
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

          {groupesFiltres.length === 0 ? (
            <EmptyState>{t('common.noResults', { defaultValue: 'Aucun résultat trouvé.' })}</EmptyState>
          ) : (
          <div className="space-y-5">
            {groupesFiltres.map(groupe => {
              const membres = details[groupe.id]?.membres || []
              const demandes = details[groupe.id]?.demandes || []
              return (
                <article key={groupe.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
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
                    <InfoPanel title={t('ux.referentDashboard.members')} count={membres.length} icon="Users">
                      <CompactPeopleList items={membres} empty={t('referent.noAcceptedMembers')} />
                    </InfoPanel>
                    <InfoPanel title={t('nav.requests')} count={demandes.length} icon="Clock">
                      <CompactPeopleList items={demandes} empty={t('referent.noPendingRequests')} />
                    </InfoPanel>
                    <InfoPanel title={t('referent.linkedActivities')} icon="Calendar">
                      <p className="text-sm text-gray-400">Non disponible.</p>
                    </InfoPanel>
                  </div>
                </article>
              )
            })}
          </div>
          )}
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

function InfoPanel({ title, count, icon = 'Folder', children }) {
  return (
    <section className="rounded-2xl bg-gray-50 p-4 transition hover:bg-slate-100">
      <div className="flex justify-between items-center mb-3">
        <h3 className="inline-flex items-center gap-2 font-semibold text-blue-900 text-sm">
          <AppIcon name={icon} className="h-4 w-4 text-teal-700" />
          {title}
        </h3>
        {count !== undefined && (
          <span className="text-xs bg-white border border-gray-100 text-gray-500 rounded-full px-2 py-0.5">{count}</span>
        )}
      </div>
      {children}
    </section>
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
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-gray-400 shadow-sm">
      <AppIcon name="Users" className="mx-auto mb-3 h-10 w-10 text-teal-200" />
      <p className="text-sm">{children}</p>
    </div>
  )
}

function Alert({ type, children }) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-green-50 border-green-200 text-green-700'

  return <div className={`border px-4 py-3 rounded-xl mb-5 text-sm ${styles}`}>{children}</div>
}
