import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import MemberGroupCard from '../../components/member/MemberGroupCard'
import MemberReferentCard from '../../components/member/MemberReferentCard'
import MemberActivitiesCard from '../../components/member/MemberActivitiesCard'
import MemberProjectsCard from '../../components/member/MemberProjectsCard'
import api from '../../api/axios'
import AppIcon from '../../components/ui/AppIcons'
import ActivityFeed from '../../components/dashboard/ActivityFeed'
import CompactKpiRow from '../../components/dashboard/CompactKpiRow'
import {
  CollaborativeDashboardLayout,
  WorkspaceEmpty,
  WorkspaceSection,
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
  const memberActivityItems = dashboard ? buildMemberActivityItems({ dashboard, groupe, t }) : []

  return (
    <CollaborativeDashboardLayout
      role="MEMBRE"
      emoji="👋"
      title={t('memberDashboard.hello', { name: user?.prenom || t('memberDashboard.memberFallback') })}
      subtitle={groupe?.nom ? t('memberDashboard.group.currentWithName', { group: groupe.nom, defaultValue: `Espace de travail : ${groupe.nom}` }) : t('memberDashboard.group.noGroupDescription')}
    >
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-400 text-center py-10">{t('memberDashboard.loading')}</p>
        ) : dashboard ? (
          <>
            <CompactKpiRow
              accent="blue"
              className="mb-4"
              items={[
                { icon: 'Users', label: t('nav.myGroups'), value: groupe?.nom || t('groups.no_group_joined'), tone: groupe ? 'blue' : 'amber' },
                { icon: 'Calendar', label: t('nav.activities'), value: (dashboard.inscriptions || []).length },
                { icon: 'Rocket', label: t('nav.projects'), value: (dashboard.projets || []).length },
                { icon: 'Bell', label: t('nav.notifications'), value: unreadNotifications, tone: unreadNotifications > 0 ? 'amber' : 'green' },
              ]}
            />

            <MemberPrioritySection
              groupe={groupe}
              inscriptions={dashboard.inscriptions || []}
              notifications={dashboard.notifications || []}
              projets={dashboard.projets || []}
              messagerieDisponible={messagerieDisponible}
              t={t}
            />

            <WorkspaceSection
              eyebrow={t('memberDashboard.workspaceEyebrow', { defaultValue: 'Travail en cours' })}
              title={t('memberDashboard.workspaceTitle', { defaultValue: 'Mon espace de travail' })}
              emoji="Folder"
            >
              {groupe ? (
                <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                  <MemberGroupCard
                    groupe={groupe}
                    referent={referent}
                    messagerieDisponible={messagerieDisponible}
                  />
                  <MemberReferentCard
                    referent={referent}
                    groupe={groupe}
                    messagerieDisponible={messagerieDisponible}
                  />
                </div>
              ) : (
                <WorkspaceEmpty
                  emoji="👥"
                  title={t('groups.no_group_joined')}
                  description={t('groups.choose_group')}
                  actionTo="/groupes"
                  actionLabel={t('groups.discover')}
                />
              )}
            </WorkspaceSection>

            {((dashboard.inscriptions || []).length > 0 || (dashboard.projets || []).length > 0) && (
            <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              {(dashboard.inscriptions || []).length > 0 && (
              <CompactPanel
                icon="Calendar"
                title={t('memberDashboard.activities.title', { defaultValue: 'Activités à venir' })}
              >
                <MemberActivitiesCard inscriptions={dashboard.inscriptions || []} />
              </CompactPanel>
              )}
              {(dashboard.projets || []).length > 0 && (
              <CompactPanel
                icon="Rocket"
                title={t('memberDashboard.projects.title', { defaultValue: 'Projets suivis ou proposés' })}
              >
                <MemberProjectsCard projets={dashboard.projets || []} />
              </CompactPanel>
              )}
            </section>
            )}

            {memberActivityItems.length > 0 && (
            <ActivityFeed
              title={t('activityFeed.title', { defaultValue: 'Mon fil d’activité' })}
              subtitle={t('activityFeed.memberSubtitle', { defaultValue: 'Messages, activités, projets et notifications importantes.' })}
              emptyLabel={t('activityFeed.empty', { defaultValue: 'Aucune activité récente pour le moment.' })}
              items={memberActivityItems}
              language={i18n.language}
              accent="blue"
              limit={5}
            />
            )}
          </>
        ) : (
          <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-lg shadow-slate-900/5 p-10 text-center">
            <p className="text-slate-500 text-sm mb-4">{t('memberDashboard.unavailable')}</p>
            <Link to="/activites" className="text-blue-600 text-sm font-semibold hover:underline">
              {t('memberDashboard.buttons.viewActivities')}
            </Link>
          </div>
        )}
    </CollaborativeDashboardLayout>
  )
}

function buildMemberActivityItems({ dashboard, groupe, t }) {
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
    title: inscription.titre || inscription.activiteTitre || t('memberDashboard.activities.title', { defaultValue: 'Activité à venir' }),
    description: inscription.dateDebut
      ? t('activityFeed.activityDate', { date: new Date(inscription.dateDebut).toLocaleDateString('fr-BE'), defaultValue: `Prévue le ${new Date(inscription.dateDebut).toLocaleDateString('fr-BE')}` })
      : t('memberDashboard.activities.dateToConfirm', { defaultValue: 'Date à confirmer' }),
    date: inscription.dateInscription || inscription.dateCreation || inscription.dateDebut,
    to: '/activites',
  }))

  const projets = (dashboard.projets || []).map(projet => ({
    key: `projet-${projet.id || projet.titre}`,
    icon: 'Rocket',
    title: projet.titre || t('nav.projects'),
    description: projet.statut ? t(`statuses.${projet.statut}`, { defaultValue: projet.statut }) : t('activityFeed.projectTracked', { defaultValue: 'Projet suivi' }),
    date: projet.dateModification || projet.dateCreation,
    to: projet.id ? `/projets/${projet.id}` : '/projets',
  }))

  const groupItem = groupe && {
    key: `groupe-${groupe.id || groupe.nom}`,
    icon: 'Users',
    title: t('activityFeed.currentGroup', { defaultValue: 'Groupe actuel' }),
    description: groupe.nom,
    date: groupe.dateAdhesion || groupe.dateCreation,
    to: groupe.id ? `/groupes/${groupe.id}` : '/groupes',
  }

  return [groupItem, ...notifications, ...inscriptions, ...projets]
}

function MemberPrioritySection({ groupe, inscriptions, notifications, projets, messagerieDisponible, t }) {
  const hasGroup = !!groupe
  const unreadNotifications = notifications.filter(notification => !notification.lue).length
  const nextInscription = inscriptions[0]
  const latestProject = projets[0]
  const priorities = [
    !hasGroup && {
      title: t('memberDashboard.group.noGroup', { defaultValue: 'Rejoindre un groupe' }),
      description: t('memberDashboard.group.noGroupDescription'),
      to: '/groupes',
      tone: 'blue',
      icon: 'Users',
    },
    nextInscription && {
      title: t('memberDashboard.activities.next', { defaultValue: 'Prochaine activité' }),
      description: nextInscription.titre || nextInscription.activiteTitre || t('memberDashboard.activities.title'),
      to: '/activites',
      tone: 'teal',
      icon: 'Calendar',
    },
    unreadNotifications > 0 && {
      title: t('nav.notifications'),
      description: t('memberDashboard.unreadNotifications', { count: unreadNotifications, defaultValue: `${unreadNotifications} notification(s) à lire` }),
      to: '/notifications',
      tone: 'amber',
      icon: 'Bell',
    },
    latestProject && {
      title: t('memberDashboard.projectToFollow', { defaultValue: 'Projet à suivre' }),
      description: latestProject.titre || t('nav.projects'),
      to: '/projets',
      tone: 'violet',
      icon: 'Rocket',
    },
    hasGroup && messagerieDisponible && {
      title: t('nav.messaging'),
      description: t('memberDashboard.nextActions.openGroupMessaging'),
      to: '/messagerie',
      tone: 'blue',
      icon: 'MessageCircle',
    },
  ].filter(Boolean).slice(0, 5)

  return (
    <section className="rounded-[1.5rem] border border-blue-100 bg-white p-5 shadow-lg shadow-blue-950/5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            {t('memberDashboard.today.eyebrow', { defaultValue: 'Priorités' })}
          </p>
          <h2 className="text-xl font-black text-slate-950">
            {t('memberDashboard.today.title', { defaultValue: 'Ce que je dois faire maintenant' })}
          </h2>
        </div>
      </div>

      {priorities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
          <AppIcon name="CheckCircle" className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
          <p className="text-sm font-black text-slate-700">{t('memberDashboard.noPriorityToday', { defaultValue: 'Aucune action urgente aujourd’hui' })}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {priorities.map(priority => <TodayCard key={`${priority.to}-${priority.title}`} {...priority} />)}
        </div>
      )}
    </section>
  )
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
    <Link to={to} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}>
        <AppIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-black text-slate-950">{title}</span>
        <span className="mt-0.5 block truncate text-sm text-slate-500">{description}</span>
      </span>
    </Link>
  )
}

function CompactPanel({ icon, title, children }) {
  return (
    <section className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-lg shadow-slate-900/5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-950">
        <AppIcon name={icon} className="h-5 w-5 text-blue-700" />
        {title}
      </h2>
      {children}
    </section>
  )
}
