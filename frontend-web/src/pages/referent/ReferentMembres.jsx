import { useCallback, useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'
import { useTranslation } from 'react-i18next'
import StatusBadge from '../../components/StatusBadge'
import AppIcon from '../../components/ui/AppIcons'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'

export default function ReferentMembres() {
  const { t, i18n } = useTranslation()
  const [groupes, setGroupes] = useState([])
  const [membres, setMembres] = useState([])
  const [groupeFiltre, setGroupeFiltre] = useState('')
  const [recherche, setRecherche] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchMembres = useCallback(async () => {
    setLoading(true)
    try {
      const groupesRes = await api.get('/referent/groupes')
      const groupesData = groupesRes.data
      const membresData = await Promise.all(groupesData.map(async (groupe) => {
        const res = await api.get(`/referent/groupes/${groupe.id}/membres`)
        return res.data.map(membre => ({ ...membre, groupeId: groupe.id, groupeNom: groupe.nom }))
      }))

      setGroupes(groupesData)
      setMembres(membresData.flat())
      setError('')
    } catch {
      setError(t('referent.errorMembersLoad'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchMembres() }, [fetchMembres])

  const membresFiltres = membres.filter(membre => {
    const matchGroupe = groupeFiltre ? String(membre.groupeId) === groupeFiltre : true
    const texte = `${membre.prenom || ''} ${membre.nom || ''} ${membre.email || ''} ${membre.groupeNom || ''}`.toLowerCase()
    return matchGroupe && texte.includes(recherche.toLowerCase())
  })

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <PageHeader
          eyebrow={t('nav.members', { defaultValue: t('ux.referentDashboard.members') })}
          title={t('referent.membersOfGroups')}
          description={t('referent.visibleMembersCount', { count: membresFiltres.length })}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon="Users" label={t('ux.referentDashboard.members')} value={membres.length} tone="blue" />
          <StatCard icon="Folder" label={t('ux.referentDashboard.assignedGroups')} value={groupes.length} tone="green" />
          <StatCard icon="Search" label={t('common.results', { defaultValue: 'Résultats' })} value={membresFiltres.length} tone="amber" />
        </div>

        <SectionCard className="mb-6" title={t('common.filters', { defaultValue: 'Filtres' })}>
          <div className="grid gap-3 md:grid-cols-[1fr_260px]">
            <label className="relative block">
              <AppIcon name="Search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                placeholder={t('common.search', { defaultValue: 'Rechercher' })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </label>
            <select
              value={groupeFiltre}
              onChange={e => setGroupeFiltre(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">{t('referent.allMyGroups')}</option>
              {groupes.map(groupe => <option key={groupe.id} value={groupe.id}>{groupe.nom}</option>)}
            </select>
          </div>
        </SectionCard>

        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : membresFiltres.length === 0 ? (
          <EmptyState>{t('referent.noAcceptedMembers')}</EmptyState>
        ) : (
          <>
          <div className="grid gap-3 md:hidden">
            {membresFiltres.map(membre => (
              <MembreCard
                key={`${membre.groupeId}-${membre.id}`}
                membre={membre}
                language={i18n.language}
                t={t}
              />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '760px' }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.name')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.email')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('admin.groupName')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('users.memberSince')}</th>
                  </tr>
                </thead>
                <tbody>
                  {membresFiltres.map(membre => (
                    <tr key={`${membre.groupeId}-${membre.id}`} className="border-b border-gray-50 transition hover:bg-teal-50/50">
                      <td className="px-4 py-3 text-sm font-medium text-blue-900">{membre.prenom} {membre.nom}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{membre.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{membre.groupeNom}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(membre.dateAdhesion, i18n.language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

function MembreCard({ membre, language, t }) {
  const statut = membre.statut || membre.statutAdhesion

  return (
    <article className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-blue-900">{membre.prenom} {membre.nom}</h2>
          <p className="text-sm text-gray-500 mt-1 break-all">{membre.email}</p>
        </div>
        {statut && (
          <StatusBadge status={statut}>
            {t(`statuses.${statut}`, statut)}
          </StatusBadge>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase text-gray-400">{t('admin.groupName')}</dt>
          <dd className="mt-1 text-gray-700">{membre.groupeNom || '-'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-gray-400">{t('users.memberSince')}</dt>
          <dd className="mt-1 text-gray-700">{formatDate(membre.dateAdhesion, language)}</dd>
        </div>
      </dl>
    </article>
  )
}

function StatCard({ icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  }
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${tones[tone] || tones.blue}`}>
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  )
}

function Alert({ type, children }) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-green-50 border-green-200 text-green-700'

  return <div className={`border px-4 py-3 rounded-xl mb-5 text-sm ${styles}`}>{children}</div>
}

function EmptyState({ children }) {
  return <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400 text-sm">{children}</div>
}

function formatDate(value, language = 'fr') {
  return value ? new Date(value).toLocaleDateString(language) : '-'
}
