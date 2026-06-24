import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import LoadingState from '../../components/ui/LoadingState'
import AppIcon from '../../components/ui/AppIcons'
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
  const [opportunites, setOpportunites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { t } = useTranslation()

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [groupesRes, attenteRes, projetsRes, soutiensRes, activitesRes, opportunitesRes] = await Promise.all([
        api.get('/admin/groupes'),
        api.get('/admin/groupes/en-attente'),
        api.get('/projets/admin/tous').catch(() => ({ data: [] })),
        api.get('/partenaire/admin/tous').catch(() => ({ data: [] })),
        api.get('/activites/admin/toutes').catch(() => ({ data: [] })),
        api.get('/annonces/admin/opportunites').catch(() => ({ data: [] })),
      ])
      setGroupes(groupesRes.data)
      setGroupesEnAttente(attenteRes.data)
      setProjets(Array.isArray(projetsRes.data) ? projetsRes.data : [])
      setSoutiens(Array.isArray(soutiensRes.data) ? soutiensRes.data : [])
      setActivites(Array.isArray(activitesRes.data) ? activitesRes.data : [])
      setOpportunites(Array.isArray(opportunitesRes.data) ? opportunitesRes.data : [])
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
  const projetsSoumis = projets.filter(projet => ['VALIDE_REFERENT', 'SOUMIS'].includes(projet.statut))
  const soutiensEnAttente = soutiens.filter(soutien => soutien.statutPaiement === 'EN_ATTENTE')
  const activitesAPublier = activites.filter(activite => activite.statut === 'BROUILLON')
  const opportunitesEnAttente = opportunites.filter(opportunite => opportunite.statutModeration === 'EN_ATTENTE')
  const pendingTotal = groupesEnAttente.length + projetsSoumis.length + soutiensEnAttente.length + opportunitesEnAttente.length
  const hasDashboardData = groupes.length > 0
    || groupesEnAttente.length > 0
    || projets.length > 0
    || soutiens.length > 0
    || activites.length > 0
    || opportunites.length > 0

  return (
    <CollaborativeDashboardLayout
      emoji="Shield"
      title={t('ux.adminDashboard.title', { defaultValue: 'Centre de pilotage BX-Connect' })}
      subtitle={t('admin.dashboardSummary', {
        count: pendingTotal,
        defaultValue: `${pendingTotal} validation(s) en attente`,
      })}
    >
        {error && hasDashboardData && <Alert type="error">{error}</Alert>}

        {loading ? (
          <LoadingState label={t('admin.loading')} />
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
              accent="blue"
              className="mb-4"
              items={[
                { icon: 'TriangleAlert', label: t('ux.adminDashboard.priority'), value: pendingTotal, tone: pendingTotal > 0 ? 'amber' : 'green' },
                { icon: 'Clock', label: t('ux.adminDashboard.pendingGroups'), value: groupesEnAttente.length, tone: groupesEnAttente.length > 0 ? 'amber' : 'blue' },
                { icon: 'Rocket', label: t('admin.projectsToValidate'), value: projetsSoumis.length, tone: projetsSoumis.length > 0 ? 'amber' : 'blue' },
                { icon: 'Megaphone', label: t('admin.opportunitiesToModerate', { defaultValue: 'Opportunités à modérer' }), value: opportunitesEnAttente.length, tone: opportunitesEnAttente.length > 0 ? 'amber' : 'blue' },
                { icon: 'Handshake', label: t('nav.supports', { defaultValue: 'Soutiens' }), value: soutiensEnAttente.length, tone: soutiensEnAttente.length > 0 ? 'amber' : 'blue' },
              ]}
            />

            <AdminQueue
              groupesSansReferent={groupesSansReferent}
              groupesEnAttente={groupesEnAttente}
              projetsSoumis={projetsSoumis}
              soutiensEnAttente={soutiensEnAttente}
              opportunitesEnAttente={opportunitesEnAttente}
              activitesAPublier={activitesAPublier}
              t={t}
            />

            <AdminImpactCta
              groupsWithoutReferent={groupesSansReferent.length}
              activitiesToPublish={activitesAPublier.length}
              pendingTotal={pendingTotal}
              t={t}
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

function AdminQueue({ groupesSansReferent, groupesEnAttente, projetsSoumis, soutiensEnAttente, opportunitesEnAttente, activitesAPublier, t }) {
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
      label: t('admin.projectsToValidate'),
      value: projetsSoumis.length,
      description: t('admin.submittedProjectsDesc', { defaultValue: 'Projets à relire ou orienter.' }),
      to: '/admin/projets',
    },
    {
      icon: 'Megaphone',
      label: t('admin.opportunitiesToModerate', { defaultValue: 'Opportunités à modérer' }),
      value: opportunitesEnAttente.length,
      description: t('admin.opportunitiesToModerateDesc', { defaultValue: 'Publications partenaires à publier ou refuser.' }),
      to: '/admin/annonces',
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

function AdminImpactCta({ groupsWithoutReferent, activitiesToPublish, pendingTotal, t }) {
  return (
    <section className="mb-6 rounded-xl border border-blue-100 bg-white p-5 shadow-lg shadow-blue-950/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <AppIcon name="BarChart3" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950">
              {t('impact.title', { defaultValue: 'Centre d’Impact' })}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              {t('admin.impactCtaDescription', {
                pending: pendingTotal,
                groups: groupsWithoutReferent,
                activities: activitiesToPublish,
                defaultValue: `${pendingTotal} action(s) à suivre · ${groupsWithoutReferent} groupe(s) sans référent · ${activitiesToPublish} activité(s) à publier.`,
              })}
            </p>
          </div>
        </div>
        <Link
          to="/impact"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-600"
        >
          {t('admin.openImpactCenter', { defaultValue: 'Ouvrir le Centre d’Impact' })}
          <AppIcon name="ArrowRight" className="h-4 w-4" />
        </Link>
      </div>
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
