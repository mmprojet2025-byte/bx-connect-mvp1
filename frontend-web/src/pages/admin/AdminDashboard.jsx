import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '../../api/axios'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import AppIcon from '../../components/ui/AppIcons'
import ActivityFeed from '../../components/dashboard/ActivityFeed'
import CompactKpiRow from '../../components/dashboard/CompactKpiRow'
import {
  CollaborativeDashboardLayout,
} from '../../components/dashboard/CollaborativeDashboard'

export default function AdminDashboard() {
  const [groupes, setGroupes] = useState([])
  const [groupesEnAttente, setGroupesEnAttente] = useState([])
  const [projets, setProjets] = useState([])
  const [soutiens, setSoutiens] = useState([])
  const [activites, setActivites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { t } = useTranslation()

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [groupesRes, attenteRes, projetsRes, soutiensRes, activitesRes] = await Promise.all([
        api.get('/admin/groupes'),
        api.get('/admin/groupes/en-attente'),
        api.get('/projets/admin/tous').catch(() => ({ data: [] })),
        api.get('/partenaire/admin/tous').catch(() => ({ data: [] })),
        api.get('/activites/admin/toutes').catch(() => ({ data: [] })),
      ])
      setGroupes(groupesRes.data)
      setGroupesEnAttente(attenteRes.data)
      setProjets(Array.isArray(projetsRes.data) ? projetsRes.data : [])
      setSoutiens(Array.isArray(soutiensRes.data) ? soutiensRes.data : [])
      setActivites(Array.isArray(activitesRes.data) ? activitesRes.data : [])
    } catch {
      setError(t('admin.error_load'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const groupesSansReferent = useMemo(
    () => groupes.filter(groupe => !groupe.referentId),
    [groupes]
  )
  const projetsSoumis = projets.filter(projet => projet.statut === 'SOUMIS')
  const soutiensEnAttente = soutiens.filter(soutien => soutien.statutPaiement === 'EN_ATTENTE')
  const activitesAPublier = activites.filter(activite => activite.statut === 'BROUILLON')
  const pendingTotal = groupesEnAttente.length + projetsSoumis.length + soutiensEnAttente.length + activitesAPublier.length
  const projectStatusData = useMemo(
    () => buildStatusData(projets, 'statut', t),
    [projets, t]
  )
  const activityStatusData = useMemo(
    () => buildStatusData(activites, 'statut', t),
    [activites, t]
  )
  const supportStatusData = useMemo(
    () => buildStatusData(soutiens, 'statutPaiement', t),
    [soutiens, t]
  )

  return (
    <CollaborativeDashboardLayout
      emoji="Shield"
      title={t('ux.adminDashboard.title', { defaultValue: 'Centre de pilotage BX-Connect' })}
      subtitle={t('admin.dashboardSummary', {
        count: pendingTotal,
        defaultValue: `${pendingTotal} validation(s) en attente`,
      })}
    >
        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-slate-400 text-center py-10">{t('admin.loading')}</p>
        ) : (
          <>
            <CompactKpiRow
              accent="blue"
              className="mb-4"
              items={[
                { icon: 'TriangleAlert', label: t('ux.adminDashboard.priority'), value: pendingTotal, tone: pendingTotal > 0 ? 'amber' : 'green' },
                { icon: 'Clock', label: t('ux.adminDashboard.pendingGroups'), value: groupesEnAttente.length, tone: groupesEnAttente.length > 0 ? 'amber' : 'blue' },
                { icon: 'Rocket', label: t('statuses.SOUMIS', { defaultValue: 'Projets soumis' }), value: projetsSoumis.length, tone: projetsSoumis.length > 0 ? 'amber' : 'blue' },
                { icon: 'Handshake', label: t('nav.supports', { defaultValue: 'Soutiens' }), value: soutiensEnAttente.length, tone: soutiensEnAttente.length > 0 ? 'amber' : 'blue' },
              ]}
            />

            <AdminQueue
              groupesSansReferent={groupesSansReferent}
              groupesEnAttente={groupesEnAttente}
              projetsSoumis={projetsSoumis}
              soutiensEnAttente={soutiensEnAttente}
              activitesAPublier={activitesAPublier}
              t={t}
            />

            <AdminCharts
              projectStatusData={projectStatusData}
              activityStatusData={activityStatusData}
              supportStatusData={supportStatusData}
              t={t}
            />

            <ActivityFeed
              title={t('activityFeed.title', { defaultValue: 'Mon fil d’activité' })}
              subtitle={t('activityFeed.adminSubtitle', { defaultValue: 'Validations, créations et changements de statut à surveiller.' })}
              emptyLabel={t('admin.noRecentActivity', { defaultValue: 'Aucune activité récente à afficher.' })}
              items={buildAdminActivityItems({ groupesEnAttente, groupesSansReferent, projets, soutiens, activites, t })}
              accent="blue"
              limit={5}
            />

            {groupes.length === 0 && (
              <div className="mt-8">
                <EmptyState
                  title={t('admin.noGroupsCreated')}
                  description={t('admin.noGroupsCreatedDesc')}
                  actionLabel={t('admin.createGroup')}
                  actionTo="/admin/groupes"
                />
              </div>
            )}
          </>
        )}
    </CollaborativeDashboardLayout>
  )
}

const CHART_COLORS = ['#2563eb', '#0f766e', '#d97706', '#7c3aed', '#dc2626', '#64748b']

function buildStatusData(items, field, t) {
  const counts = items.reduce((acc, item) => {
    const status = item[field] || 'UNKNOWN'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  return Object.entries(counts).map(([status, value]) => ({
    status,
    label: t(`statuses.${status}`, { defaultValue: status.replaceAll('_', ' ') }),
    value,
  }))
}

function AdminCharts({ projectStatusData, activityStatusData, supportStatusData, t }) {
  const hasProjects = projectStatusData.length > 0
  const hasActivities = activityStatusData.length > 0
  const hasSupports = supportStatusData.length > 0

  if (!hasProjects && !hasActivities && !hasSupports) return null

  return (
    <section className="mb-6 rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-lg shadow-slate-950/5">
      <SectionHeader icon="BarChart" title={t('dashboardCharts.title')} subtitle={t('dashboardCharts.adminSubtitle')} />
      <div className="grid gap-4 xl:grid-cols-3">
        {hasProjects && (
          <ChartPanel title={t('dashboardCharts.projectsByStatus')}>
            <StatusBarChart data={projectStatusData} />
          </ChartPanel>
        )}
        {hasActivities && (
          <ChartPanel title={t('dashboardCharts.activitiesByStatus')}>
            <StatusPieChart data={activityStatusData} />
          </ChartPanel>
        )}
        {hasSupports && (
          <ChartPanel title={t('dashboardCharts.supportsByStatus')}>
            <StatusPieChart data={supportStatusData} />
          </ChartPanel>
        )}
      </div>
    </section>
  )
}

function ChartPanel({ title, children }) {
  return (
    <article className="min-h-[240px] rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <h3 className="mb-3 text-sm font-black text-slate-800">{title}</h3>
      {children}
    </article>
  )
}

function StatusBarChart({ data }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} height={52} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.status} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function StatusPieChart({ data }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={42} outerRadius={72} paddingAngle={3}>
            {data.map((entry, index) => (
              <Cell key={entry.status} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function buildAdminActivityItems({ groupesEnAttente, groupesSansReferent, projets, soutiens, activites, t }) {
  const groupItems = [
    ...groupesEnAttente.map(groupe => ({
      key: `groupe-attente-${groupe.id}`,
      icon: 'Users',
      title: t('ux.adminDashboard.pendingGroups'),
      description: groupe.nom,
      date: groupe.dateCreation || groupe.dateDemande,
      to: '/admin/groupes',
    })),
    ...groupesSansReferent.map(groupe => ({
      key: `groupe-sans-referent-${groupe.id}`,
      icon: 'User',
      title: t('ux.adminDashboard.groupsWithoutReferent'),
      description: groupe.nom,
      date: groupe.dateModification || groupe.dateCreation,
      to: '/admin/groupes',
    })),
  ]

  const projectItems = projets.map(projet => ({
    key: `projet-${projet.id}`,
    icon: 'Rocket',
    title: projet.titre,
    description: projet.statut ? t(`statuses.${projet.statut}`, { defaultValue: projet.statut }) : t('nav.projects'),
    date: projet.dateModification || projet.dateCreation,
    to: '/admin/projets',
  }))

  const supportItems = soutiens.map(soutien => ({
    key: `soutien-${soutien.id}`,
    icon: 'Handshake',
    title: soutien.projetTitre || soutien.activiteTitre || t('nav.supports', { defaultValue: 'Soutien partenaire' }),
    description: soutien.statutPaiement || t('partnerSupport.admin.title'),
    date: soutien.dateCreation || soutien.datePaiement,
    to: `/admin/soutiens?soutien=${soutien.id}`,
  }))

  const activityItems = activites.map(activite => ({
    key: `activite-${activite.id}`,
    icon: 'Calendar',
    title: activite.titre,
    description: activite.statut ? t(`statuses.${activite.statut}`, { defaultValue: activite.statut }) : t('nav.activities'),
    date: activite.dateModification || activite.dateCreation || activite.dateDebut,
    to: '/admin/activites',
  }))

  return [...groupItems, ...projectItems, ...supportItems, ...activityItems]
}

function AdminQueue({ groupesSansReferent, groupesEnAttente, projetsSoumis, soutiensEnAttente, activitesAPublier, t }) {
  const items = [
    {
      icon: 'User',
      label: t('ux.adminDashboard.groupsWithoutReferent'),
      value: groupesSansReferent.length,
      description: t('admin.assignReferentDesc'),
      to: '/admin/groupes',
    },
    {
      icon: 'Clock',
      label: t('ux.adminDashboard.pendingGroups'),
      value: groupesEnAttente.length,
      description: t('admin.pendingGroupsDesc'),
      to: '/admin/groupes',
    },
    {
      icon: 'Rocket',
      label: t('statuses.SOUMIS', { defaultValue: 'Projets soumis' }),
      value: projetsSoumis.length,
      description: t('admin.submittedProjectsDesc', { defaultValue: 'Projets à relire ou orienter.' }),
      to: '/admin/projets',
    },
    {
      icon: 'Handshake',
      label: t('nav.supports', { defaultValue: 'Soutiens partenaires' }),
      value: soutiensEnAttente.length,
      description: t('partnerSupport.admin.listDescription', { defaultValue: 'Soutiens à valider ou refuser.' }),
      to: '/admin/soutiens',
    },
    {
      icon: 'Calendar',
      label: t('activities.draftsToPublish', { defaultValue: 'Activités à publier' }),
      value: activitesAPublier.length,
      description: t('activities.draftsToPublishDesc', { defaultValue: 'Brouillons prêts à vérifier.' }),
      to: '/admin/activites',
    },
  ]
  const activeItems = items.filter(item => item.value > 0)

  return (
    <section className="mb-6 rounded-[1.5rem] border border-amber-100 bg-white p-5 shadow-lg shadow-amber-950/5">
      <SectionHeader icon="TriangleAlert" title={t('ux.adminDashboard.priority')} subtitle={t('ux.adminDashboard.priorityDesc')} />
      {activeItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
          <AppIcon name="CheckCircle" className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
          <p className="text-sm font-black text-slate-700">{t('admin.noPendingValidation', { defaultValue: 'Aucune validation en attente.' })}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeItems.slice(0, 5).map(item => <PriorityCard key={item.label} {...item} />)}
        </div>
      )}
    </section>
  )
}

function PriorityCard({ icon, label, value, description, to }) {
  return (
    <Link to={to} className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700">
        <AppIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-black text-slate-950">{value} · {label}</span>
        <span className="mt-0.5 block text-sm leading-5 text-slate-500">{description}</span>
      </span>
    </Link>
  )
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
        <AppIcon name={icon} className="h-5 w-5 text-blue-700" />
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}
