import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Alert from '../../components/ui/Alert'
import AppIcon from '../../components/ui/AppIcons'
import ErrorState from '../../components/ui/ErrorState'
import LoadingState from '../../components/ui/LoadingState'
import { CollaborativeDashboardLayout } from '../../components/dashboard/CollaborativeDashboard'
import CompactKpiRow from '../../components/dashboard/CompactKpiRow'

export default function ReferentDashboard() {
  const [stats, setStats] = useState({ groupes: 0, membres: 0, demandes: 0, activites: 0 })
  const [detailsGroupes, setDetailsGroupes] = useState([])
  const [activites, setActivites] = useState([])
  const [projets, setProjets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { t, i18n } = useTranslation()
  const { user } = useAuth()

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const [groupesRes, activitesRes, projetsRes] = await Promise.all([
        api.get('/referent/groupes'),
        api.get('/referent/mes-activites'),
        api.get('/projets/referent/mes-groupes').catch(() => ({ data: [] })),
      ])

      const groupesData = groupesRes.data
      const details = await Promise.all(groupesData.map(async (groupe) => {
        const [membresRes, demandesRes] = await Promise.all([
          api.get(`/referent/groupes/${groupe.id}/membres`).catch(() => ({ data: [] })),
          api.get(`/referent/groupes/${groupe.id}/demandes`).catch(() => ({ data: [] })),
        ])
        return { groupe, membres: membresRes.data, demandes: demandesRes.data }
      }))

      setDetailsGroupes(details)
      setActivites(activitesRes.data)
      setProjets(Array.isArray(projetsRes.data) ? projetsRes.data : [])
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
  const activitesAPublier = activites.filter(activite => activite.statut === 'BROUILLON')
  const activitesAPreparer = activites.filter(activite => isUpcomingActivity(activite)).slice(0, 3)
  const presencesAEncoder = activites.filter(activite => isPastActivity(activite)).slice(0, 3)
  const projetsARelire = projets.filter(projet => projet.statut === 'SOUMIS').slice(0, 3)
  const hasDashboardData = detailsGroupes.length > 0 || activites.length > 0 || projets.length > 0

  return (
    <CollaborativeDashboardLayout
      emoji="User"
      title={t('referent.hello', { name: user?.prenom || '', defaultValue: `Bonjour ${user?.prenom || ''} 👋` })}
      subtitle={t('referent.dashboardSummary', {
        groups: stats.groupes,
        requests: stats.demandes,
        defaultValue: `${stats.groupes} groupe(s) encadré(s) · ${stats.demandes} demande(s) à traiter`,
      })}
    >
        {error && hasDashboardData && <Alert type="error">{error}</Alert>}

        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : error && !hasDashboardData ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error}
            actionLabel={t('common.retry')}
            action={fetchDashboard}
          />
        ) : (
          <>
            <CompactKpiRow
              accent="teal"
              className="mb-4"
              items={[
                { icon: 'Users', label: t('ux.referentDashboard.assignedGroups'), value: stats.groupes },
                { icon: 'Clock', label: t('ux.referentDashboard.pendingRequests'), value: stats.demandes, tone: stats.demandes > 0 ? 'amber' : 'green' },
                { icon: 'Rocket', label: t('referent.projectsToReview', { defaultValue: 'Projets à relire' }), value: projetsARelire.length, tone: projetsARelire.length > 0 ? 'amber' : 'green' },
                { icon: 'ClipboardList', label: t('referent.presencesToEncode', { defaultValue: 'Présences à encoder' }), value: presencesAEncoder.length, tone: presencesAEncoder.length > 0 ? 'amber' : 'green' },
              ]}
            />

            <ReferentWorkQueue
              demandes={demandesRecentes}
              activitesAPublier={activitesAPublier}
              activitesAPreparer={activitesAPreparer}
              presencesAEncoder={presencesAEncoder}
              projets={projetsARelire}
              t={t}
              language={i18n.language}
            />

            <ReferentQuickAccess stats={stats} projectsCount={projets.length} t={t} />
          </>
        )}
    </CollaborativeDashboardLayout>
  )
}

function ReferentQuickAccess({ stats, projectsCount, t }) {
  return (
    <section className="mb-6 rounded-xl border border-teal-100 bg-white p-5 shadow-lg shadow-teal-950/5">
      <SectionHeader
        icon="BarChart3"
        title={t('referent.quickAccessTitle', { defaultValue: 'Pilotage de mes groupes' })}
        subtitle={t('referent.quickAccessSubtitle', { defaultValue: 'Accès rapides aux vues d’analyse et aux rapports.' })}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <Link
          to="/referent/impact"
          className="flex items-start gap-3 rounded-lg border border-teal-100 bg-teal-50 p-4 transition hover:bg-teal-100"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700">
            <AppIcon name="BarChart3" className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-black text-slate-950">{t('referentImpact.cta.title')}</span>
            <span className="mt-1 block text-sm leading-6 text-slate-500">
              {t('referentImpact.cta.description', {
                groups: stats.groupes,
                activities: stats.activites,
                projects: projectsCount,
              })}
            </span>
          </span>
        </Link>
        <Link
          to="/referent/rapports"
          className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-md"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700">
            <AppIcon name="FileText" className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-black text-slate-950">{t('referent.reportsQuickAccess', { defaultValue: 'Rapports de groupe' })}</span>
            <span className="mt-1 block text-sm leading-6 text-slate-500">
              {t('referent.reportsQuickAccessDesc', { defaultValue: 'Exporter les données terrain de vos groupes en PDF ou Excel.' })}
            </span>
          </span>
        </Link>
      </div>
    </section>
  )
}

function ReferentWorkQueue({ demandes, activitesAPublier, activitesAPreparer, presencesAEncoder, projets, t, language }) {
  const actions = [
    ...demandes.map(demande => ({
      key: `demande-${demande.id}`,
      icon: 'Clock',
      title: t('referent.requestToReview', { defaultValue: 'Demande à valider' }),
      description: `${demande.prenom} ${demande.nom} · ${demande.groupeNom}`,
      meta: formatDate(demande.dateAdhesion, language),
      to: '/referent/demandes',
      tone: 'amber',
    })),
    ...activitesAPublier.map(activite => ({
      key: `activite-${activite.id}`,
      icon: 'Calendar',
      title: t('activities.draftsToPublish', { defaultValue: 'Activité à publier' }),
      description: activite.titre,
      meta: activite.dateDebut ? formatDate(activite.dateDebut, language) : '',
      to: '/referent/activites',
      tone: 'teal',
    })),
    ...activitesAPreparer.map(activite => ({
      key: `activite-preparer-${activite.id}`,
      icon: 'Calendar',
      title: t('referent.activityToPrepare', { defaultValue: 'Activité à préparer' }),
      description: activite.titre,
      meta: activite.dateDebut ? formatDate(activite.dateDebut, language) : '',
      to: '/referent/activites',
      tone: 'teal',
    })),
    ...presencesAEncoder.map(activite => ({
      key: `presence-${activite.id}`,
      icon: 'ClipboardList',
      title: t('referent.presencesToEncodeOne', { defaultValue: 'Présences à encoder' }),
      description: activite.titre,
      meta: activite.dateDebut ? formatDate(activite.dateDebut, language) : '',
      to: activite.id ? `/referent/activites/${activite.id}/presences` : '/referent/activites',
      tone: 'amber',
    })),
    ...projets.map(projet => ({
      key: `projet-${projet.id}`,
      icon: 'Rocket',
      title: t('referent.projectToReview', { defaultValue: 'Projet à relire' }),
      description: projet.titre,
      meta: projet.statut,
      to: '/referent/projets',
      tone: 'violet',
    })),
  ]

  return (
    <section className="mb-6 rounded-[1.5rem] border border-teal-100 bg-white p-5 shadow-lg shadow-teal-950/5">
      <SectionHeader
        icon="ClipboardList"
        title={t('referent.todayActions', { defaultValue: 'À traiter aujourd’hui' })}
        subtitle={t('referent.todayActionsSubtitle', { defaultValue: 'Uniquement les éléments qui nécessitent une action.' })}
      />

      {actions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
          <AppIcon name="CheckCircle" className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
          <p className="text-sm font-black text-slate-700">{t('referent.noActionToday', { defaultValue: 'Aucune action en attente aujourd’hui' })}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {actions.slice(0, 6).map(action => <ActionItem key={action.key} action={action} />)}
        </div>
      )}
    </section>
  )
}

function ActionItem({ action }) {
  const tones = {
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    teal: 'bg-teal-50 text-teal-700',
    violet: 'bg-violet-50 text-violet-700',
  }

  return (
    <Link
      to={action.to}
      className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-md"
    >
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[action.tone] || tones.teal}`}>
        <AppIcon name={action.icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-black text-slate-950">{action.title}</span>
        <span className="mt-0.5 block truncate text-sm text-slate-500">{action.description}</span>
        {action.meta && <span className="mt-1 block text-xs font-bold text-slate-400">{action.meta}</span>}
      </span>
    </Link>
  )
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
        <AppIcon name={icon} className="h-5 w-5 text-teal-700" />
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}

function formatDate(value, language = 'fr') {
  return value ? new Date(value).toLocaleDateString(language) : '-'
}

function isUpcomingActivity(activite) {
  if (!activite.dateDebut) return activite.statut === 'PUBLIEE'
  const date = new Date(activite.dateDebut)
  if (Number.isNaN(date.getTime())) return false
  return date >= new Date() && activite.statut !== 'BROUILLON'
}

function isPastActivity(activite) {
  if (!activite.dateDebut) return false
  const date = new Date(activite.dateDebut)
  if (Number.isNaN(date.getTime())) return false
  return date < new Date() && !['BROUILLON', 'ANNULEE', 'ANNULE'].includes(activite.statut)
}
