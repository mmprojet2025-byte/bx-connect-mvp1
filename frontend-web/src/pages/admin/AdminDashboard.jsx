import { useCallback, useEffect, useState } from 'react'
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

  const projetsSoumis = projets.filter(projet => ['VALIDE_REFERENT', 'SOUMIS'].includes(projet.statut))
  const soutiensEnAttente = soutiens.filter(soutien => soutien.statutPaiement === 'EN_ATTENTE')
  const activitesAPublier = activites.filter(activite => activite.statut === 'BROUILLON')
  const opportunitesEnAttente = opportunites.filter(opportunite => opportunite.statutModeration === 'EN_ATTENTE')
  const pendingTotal = groupesEnAttente.length + projetsSoumis.length + soutiensEnAttente.length + opportunitesEnAttente.length
  const groupesActifs = groupes.filter(groupe => groupe.statut === 'VALIDE').length
  const activitesPubliees = activites.filter(activite => activite.statut === 'PUBLIEE').length
  const projetsActifs = projets.filter(projet => ['APPROUVE', 'EN_COURS'].includes(projet.statut)).length
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
        defaultValue: `${pendingTotal} action(s) à traiter aujourd’hui.`,
      })}
      accentHeader
      compact
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
              className="mb-3 admin-dashboard-reveal"
              items={[
                { icon: 'TriangleAlert', label: t('admin.pendingActions', { defaultValue: 'À traiter' }), value: pendingTotal, tone: pendingTotal > 0 ? 'amber' : 'green' },
                { icon: 'Users', label: t('admin.groups', { defaultValue: 'Groupes' }), value: groupesActifs, tone: 'blue' },
                { icon: 'Calendar', label: t('statuses.PUBLIEE', { defaultValue: 'Publiées' }), value: activitesPubliees, tone: 'green' },
                { icon: 'Rocket', label: t('admin.projects_title', { defaultValue: 'Projets' }), value: projetsActifs, tone: 'violet' },
              ]}
            />

            <AdminWorkFeed
              projetsSoumis={projetsSoumis}
              activitesAPublier={activitesAPublier}
              groupesEnAttente={groupesEnAttente}
              opportunitesEnAttente={opportunitesEnAttente}
              soutiensEnAttente={soutiensEnAttente}
              t={t}
            />

            {groupes.length === 0 && (
              <div className="mt-2">
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

function AdminWorkFeed({ projetsSoumis, activitesAPublier, groupesEnAttente, opportunitesEnAttente, soutiensEnAttente, t }) {
  const items = [
    projetsSoumis[0] && {
      icon: 'Rocket',
      tone: 'violet',
      title: getDisplayTitle(projetsSoumis[0], t('admin.workFeed.projectFallback')),
      description: t('admin.workFeed.projectDescription'),
      actionLabel: t('admin.workFeed.validate'),
      to: '/admin/projets',
    },
    activitesAPublier[0] && {
      icon: 'Calendar',
      tone: 'green',
      title: getDisplayTitle(activitesAPublier[0], t('admin.workFeed.activityFallback')),
      description: t('admin.workFeed.activityDescription'),
      actionLabel: t('admin.workFeed.publish'),
      to: '/admin/activites',
    },
    groupesEnAttente[0] && {
      icon: 'Users',
      tone: 'amber',
      title: getDisplayTitle(groupesEnAttente[0], t('admin.workFeed.groupFallback')),
      description: t('admin.workFeed.groupDescription'),
      actionLabel: t('admin.workFeed.process'),
      to: '/admin/groupes',
    },
    opportunitesEnAttente[0] && {
      icon: 'Megaphone',
      tone: 'rose',
      title: getDisplayTitle(opportunitesEnAttente[0], t('admin.workFeed.opportunityFallback')),
      description: t('admin.workFeed.opportunityDescription'),
      actionLabel: t('admin.workFeed.moderate'),
      to: '/admin/annonces',
    },
    soutiensEnAttente[0] && {
      icon: 'Handshake',
      tone: 'orange',
      title: getSupportTitle(soutiensEnAttente[0], t('admin.workFeed.supportFallback')),
      description: t('admin.workFeed.supportDescription'),
      actionLabel: t('admin.workFeed.review'),
      to: '/admin/soutiens',
    },
  ].filter(Boolean).slice(0, 5)

  return (
    <section className="admin-dashboard-reveal mb-4 rounded-xl border border-white bg-white p-4 shadow-lg shadow-slate-950/5">
      <SectionHeader
        icon="ClipboardList"
        title={t('admin.workFeed.title')}
        subtitle={t('admin.workFeed.subtitle')}
      />
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-4 text-center">
          <AppIcon name="CheckCircle" className="mx-auto mb-2 h-7 w-7 text-emerald-500" />
          <p className="text-sm font-black text-slate-700">{t('admin.workFeed.empty')}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100 bg-slate-50/60">
          {items.map(item => <WorkFeedItem key={`${item.to}-${item.title}`} {...item} />)}
        </div>
      )}
    </section>
  )
}

function WorkFeedItem({ icon, tone = 'blue', title, description, actionLabel, to }) {
  const toneClasses = {
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    cyan: 'bg-cyan-50 text-cyan-700',
    green: 'bg-emerald-50 text-emerald-700',
    orange: 'bg-orange-50 text-orange-700',
    rose: 'bg-rose-50 text-rose-700',
    violet: 'bg-violet-50 text-violet-700',
  }
  const colorClass = toneClasses[tone] || toneClasses.blue

  return (
    <Link
      to={to}
      className="group flex items-center gap-3 bg-white px-3 py-2.5 transition duration-200 hover:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400"
    >
      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
        <AppIcon name={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-slate-950">{title}</span>
        <span className="mt-0.5 block truncate text-xs leading-4 text-slate-500">{description}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700 transition group-hover:bg-blue-700 group-hover:text-white">
        {actionLabel}
        <AppIcon name="ArrowRight" className="h-3.5 w-3.5" />
      </span>
    </Link>
  )
}

function getDisplayTitle(item, fallback) {
  return item?.titre || item?.nom || item?.name || item?.libelle || fallback
}

function getSupportTitle(item, fallback) {
  const partnerName = [item?.partenairePrenom, item?.partenaireNom].filter(Boolean).join(' ').trim()
  return partnerName || item?.partenaireNomComplet || item?.partenaire || item?.projetTitre || fallback
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="mb-3">
      <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
        <AppIcon name={icon} className="h-5 w-5 text-blue-700" />
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  )
}
