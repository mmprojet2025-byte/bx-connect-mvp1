import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import MemberGroupCard from '../../components/member/MemberGroupCard'
import MemberActivitiesCard from '../../components/member/MemberActivitiesCard'
import MemberProjectsCard from '../../components/member/MemberProjectsCard'
import api from '../../api/axios'
import AppIcon from '../../components/ui/AppIcons'
import ActivityFeed from '../../components/dashboard/ActivityFeed'
import CompactKpiRow from '../../components/dashboard/CompactKpiRow'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import LoadingState from '../../components/ui/LoadingState'
import {
  CollaborativeDashboardLayout,
  WorkspaceEmpty,
} from '../../components/dashboard/CollaborativeDashboard'

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/membre/dashboard')
      setDashboard(res.data)
    } catch {
      setError(t('memberDashboard.errorLoad'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const groupe = dashboard?.groupe
  const referent = dashboard?.referent
  const messagerieDisponible = dashboard?.messagerieDisponible || false
  const unreadNotifications = (dashboard?.notifications || []).filter(notification => !notification.lue).length
  const memberActivityItems = dashboard ? buildMemberActivityItems({ dashboard, groupe, t, language: i18n.language }) : []

  return (
    <CollaborativeDashboardLayout
      emoji="👋"
      title={t('memberDashboard.hello', { name: user?.prenom || t('memberDashboard.memberFallback') })}
      subtitle={groupe?.nom ? t('memberDashboard.group.currentWithName', { group: groupe.nom, defaultValue: `Espace de travail : ${groupe.nom}` }) : t('memberDashboard.group.noGroupDescription')}
      accentHeader
      compact
    >
        {error && dashboard && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingState label={t('memberDashboard.loading')} />
        ) : error && !dashboard ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error}
            actionLabel={t('common.retry')}
            action={fetchDashboard}
          />
        ) : dashboard ? (
          <>
            <MemberPrioritySection
              groupe={groupe}
              inscriptions={dashboard.inscriptions || []}
              notifications={dashboard.notifications || []}
              projets={dashboard.projets || []}
              t={t}
            />

            <section className="collab-reveal">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                {t('memberDashboard.quickAccess')}
              </p>
              <CompactKpiRow
                accent="blue"
                items={[
                  { icon: 'Calendar', label: t('nav.activities'), value: (dashboard.inscriptions || []).length, to: '/activites' },
                  { icon: 'Rocket', label: t('nav.projects'), value: (dashboard.projets || []).length, to: '/projets' },
                  { icon: 'Bell', label: t('nav.notifications'), value: unreadNotifications, tone: unreadNotifications > 0 ? 'amber' : 'green', to: '/notifications' },
                ]}
              />
            </section>

            {groupe ? (
              <MemberGroupCard
                groupe={groupe}
                referent={referent}
                messagerieDisponible={messagerieDisponible}
              />
            ) : (
              <WorkspaceEmpty
                emoji="👥"
                title={t('groups.no_group_joined')}
                description={t('groups.choose_group')}
                actionTo="/groupes"
                actionLabel={t('groups.discover')}
              />
            )}

              {((dashboard.inscriptions || []).length > 0 || (dashboard.projets || []).length > 0) && (
              <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                {(dashboard.inscriptions || []).length > 0 && <MemberActivitiesCard inscriptions={dashboard.inscriptions || []} />}
                {(dashboard.projets || []).length > 0 && <MemberProjectsCard projets={dashboard.projets || []} />}
              </section>
              )}

            {memberActivityItems.length > 0 && (
            <ActivityFeed
              title={t('activityFeed.title')}
              subtitle={t('activityFeed.memberSubtitle')}
              emptyLabel={t('activityFeed.empty')}
                items={memberActivityItems}
                language={i18n.language}
                accent="blue"
                limit={10}
                actionTo="/notifications"
                actionLabel={t('activityFeed.viewAll')}
              />
            )}
          </>
        ) : (
          <EmptyState
            title={t('memberDashboard.unavailable')}
            actionLabel={t('memberDashboard.buttons.viewActivities')}
            actionTo="/activites"
          />
        )}
    </CollaborativeDashboardLayout>
  )
}

function buildMemberActivityItems({ dashboard, groupe, t, language }) {
  const notifications = (dashboard.notifications || []).map(notification => ({
    key: `notification-${notification.id}`,
    icon: notification.lue ? 'Bell' : 'TriangleAlert',
    title: notification.titre || t('nav.notifications'),
    description: notification.message,
    date: notification.dateCreation,
    to: '/notifications',
  }))

  const inscriptions = (dashboard.inscriptions || []).map(inscription => ({
    key: `inscription-${inscription.id || inscription.activiteId || inscription.titre}`,
    icon: 'Calendar',
    title: inscription.titre || inscription.activiteTitre || t('memberDashboard.activities.title'),
    description: (inscription.activiteDateDebut || inscription.dateDebut)
      ? t('activityFeed.activityDate', { date: new Date(inscription.activiteDateDebut || inscription.dateDebut).toLocaleDateString(language || 'fr-BE') })
      : t('memberDashboard.activities.dateToConfirm'),
    date: inscription.dateInscription || inscription.dateCreation || inscription.activiteDateDebut || inscription.dateDebut,
    to: '/activites',
  }))

  const projets = (dashboard.projets || []).map(projet => ({
    key: `projet-${projet.id || projet.titre}`,
    icon: 'Rocket',
    title: projet.titre || t('nav.projects'),
    description: projet.statut ? t(`statuses.${projet.statut}`, { defaultValue: projet.statut }) : t('activityFeed.projectTracked'),
    date: projet.dateModification || projet.dateCreation,
    to: projet.id ? `/projets/${projet.id}` : '/projets',
  }))

  const groupItem = groupe && {
    key: `groupe-${groupe.id || groupe.nom}`,
    icon: 'Users',
    title: t('activityFeed.currentGroup'),
    description: groupe.nom,
    date: groupe.dateAdhesion || groupe.dateCreation,
    to: groupe.id ? `/groupes/${groupe.id}` : '/groupes',
  }

  return [groupItem, ...notifications, ...inscriptions, ...projets]
}

function MemberPrioritySection({ groupe, inscriptions, notifications, projets, t }) {
  const hasGroup = !!groupe
  const unreadNotifications = notifications.filter(notification => !notification.lue).length
  const paymentPending = inscriptions.find(inscription => inscription.statut === 'EN_ATTENTE_PAIEMENT')
  const imminentInscription = inscriptions.find(inscription => inscription.statut !== 'EN_ATTENTE_PAIEMENT' && isImminentInscription(inscription))
  const projectNeedingAction = projets.find(projet => ['BROUILLON', 'REFUSE_REFERENT', 'REJETE'].includes(projet.statut))
  const priorities = [
    !hasGroup && {
      title: t('memberDashboard.group.noGroup'),
      description: t('memberDashboard.group.noGroupDescription'),
      to: '/groupes',
      tone: 'blue',
      icon: 'Users',
    },
    unreadNotifications > 0 && {
      title: t('nav.notifications'),
      description: t('memberDashboard.unreadNotifications', { count: unreadNotifications, defaultValue: `${unreadNotifications} notification(s) à lire` }),
      to: '/notifications',
      tone: 'amber',
      icon: 'Bell',
    },
    paymentPending && {
      title: t('memberDashboard.paymentRequired'),
      description: paymentPending.titre || paymentPending.activiteTitre || t('memberDashboard.activities.title'),
      to: '/activites',
      tone: 'amber',
      icon: 'CreditCard',
    },
    imminentInscription && {
      title: t('memberDashboard.activitySoon'),
      description: imminentInscription.titre || imminentInscription.activiteTitre || t('memberDashboard.activities.title'),
      to: '/activites',
      tone: 'teal',
      icon: 'Calendar',
    },
    projectNeedingAction && {
      title: t('memberDashboard.projectNeedsAction'),
      description: projectNeedingAction.titre || t('nav.projects'),
      to: '/projets',
      tone: 'violet',
      icon: 'Rocket',
    },
  ].filter(Boolean).slice(0, 5)

  return (
    <section className="collab-reveal rounded-xl border border-blue-100 bg-white p-4 shadow-lg shadow-blue-950/5">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            {t('memberDashboard.today.eyebrow')}
          </p>
          <h2 className="text-lg font-black text-slate-950">
            {t('memberDashboard.today.title')}
          </h2>
        </div>
      </div>

      {priorities.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
          <AppIcon name="CheckCircle" className="h-5 w-5 shrink-0 text-emerald-500" />
          <p className="text-sm font-black text-slate-700">{t('memberDashboard.noPriorityToday')}</p>
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {priorities.map(priority => <TodayCard key={`${priority.to}-${priority.title}`} {...priority} />)}
        </div>
      )}
    </section>
  )
}

function isImminentInscription(inscription) {
  const dateValue = inscription.activiteDateDebut || inscription.dateDebut
  if (!dateValue) return false
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  return date.getTime() >= now.getTime() && date.getTime() - now.getTime() <= sevenDays
}

function TodayCard({ title, description, to, tone = 'blue', icon = 'Folder' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    teal: 'bg-teal-50 text-teal-700',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700',
  }

  return (
    <Link to={to} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone] || tones.blue}`}>
        <AppIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-black text-slate-950">{title}</span>
        <span className="mt-0.5 block truncate text-sm text-slate-500">{description}</span>
      </span>
    </Link>
  )
}
