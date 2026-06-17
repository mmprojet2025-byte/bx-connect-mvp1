import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import MemberStatusCard from '../../components/member/MemberStatusCard'
import MemberGroupCard from '../../components/member/MemberGroupCard'
import MemberReferentCard from '../../components/member/MemberReferentCard'
import MemberNextActions from '../../components/member/MemberNextActions'
import MemberActivitiesCard from '../../components/member/MemberActivitiesCard'
import MemberMessagingCard from '../../components/member/MemberMessagingCard'
import MemberNotificationsCard from '../../components/member/MemberNotificationsCard'
import MemberProjectsCard from '../../components/member/MemberProjectsCard'
import MemberEngagementCard from '../../components/member/MemberEngagementCard'
import MemberStatsCard from '../../components/member/MemberStatsCard'
import api from '../../api/axios'
import PageHeader from '../../components/ui/PageHeader'
import QuickActionCard from '../../components/ui/QuickActionCard'
import AppIcon from '../../components/ui/AppIcons'

export default function Dashboard() {
  const { t } = useTranslation()
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <PageHeader
          eyebrow={t('memberDashboard.welcome')}
          title={t('memberDashboard.hello', { name: user?.prenom || t('memberDashboard.memberFallback') })}
          description={groupe?.nom ? groupe.nom : t('memberDashboard.group.noGroupDescription')}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-400 text-center py-10">{t('memberDashboard.loading')}</p>
        ) : dashboard ? (
          <div className="space-y-6">
            <MemberTodaySection
              groupe={groupe}
              inscriptions={dashboard.inscriptions || []}
              notifications={dashboard.notifications || []}
              projets={dashboard.projets || []}
              messagerieDisponible={messagerieDisponible}
              t={t}
            />

            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
              <MemberGroupCard
                groupe={groupe}
                referent={referent}
                messagerieDisponible={messagerieDisponible}
              />
              <div className="grid gap-4">
                <MemberStatusCard groupe={groupe} messagerieDisponible={messagerieDisponible} />
                <QuickActions messagerieDisponible={messagerieDisponible} t={t} />
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <MemberReferentCard
                referent={referent}
                groupe={groupe}
                messagerieDisponible={messagerieDisponible}
              />
              <MemberNextActions groupe={groupe} messagerieDisponible={messagerieDisponible} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <MemberActivitiesCard inscriptions={dashboard.inscriptions || []} />
              <MemberMessagingCard groupe={groupe} messagerieDisponible={messagerieDisponible} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <MemberNotificationsCard notifications={dashboard.notifications || []} />
              <MemberProjectsCard projets={dashboard.projets || []} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <MemberStatsCard
                implication={dashboard.implication}
                notifications={dashboard.notifications || []}
              />
              <MemberEngagementCard implication={dashboard.implication} />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-lg shadow-slate-900/5 p-10 text-center">
            <p className="text-slate-500 text-sm mb-4">{t('memberDashboard.unavailable')}</p>
            <Link to="/activites" className="text-blue-600 text-sm font-semibold hover:underline">
              {t('memberDashboard.buttons.viewActivities')}
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function MemberTodaySection({ groupe, inscriptions, notifications, projets, messagerieDisponible, t }) {
  const hasGroup = !!groupe
  const unreadNotifications = notifications.filter(notification => !notification.lue).length
  const nextInscriptions = inscriptions.slice(0, 2)
  const latestProjects = projets.slice(0, 2)

  return (
    <section className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-lg shadow-blue-950/5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            {t('memberDashboard.today.eyebrow', { defaultValue: 'À faire' })}
          </p>
          <h2 className="text-xl font-black text-slate-950">
            {t('memberDashboard.today.title', { defaultValue: 'Mon espace aujourd’hui' })}
          </h2>
        </div>
        <Link to="/notifications" className="text-sm font-bold text-blue-700 hover:underline">
          {t('nav.notifications')}
          {unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-3 md:grid-cols-2">
          <TodayCard
            title={hasGroup ? t('memberDashboard.group.current', { defaultValue: 'Groupe actuel' }) : t('memberDashboard.group.noGroup', { defaultValue: 'Aucun groupe rejoint' })}
            description={hasGroup ? groupe.nom : t('memberDashboard.group.noGroupDescription')}
            to={hasGroup ? '/dashboard' : '/groupes'}
            action={hasGroup ? t('common.open') : t('ux.groups.joinGroup', { defaultValue: 'Rejoindre un groupe' })}
            tone={hasGroup ? 'green' : 'blue'}
            icon="Users"
          />
          <TodayCard
            title={t('nav.activities')}
            description={nextInscriptions.length > 0
              ? t('memberDashboard.today.nextActivities', { count: nextInscriptions.length, defaultValue: `${nextInscriptions.length} inscription(s) à suivre` })
              : t('memberDashboard.activities.empty', { defaultValue: 'Aucune inscription à venir pour le moment.' })}
            to="/activites"
            action={t('activities.viewActivities', { defaultValue: 'Voir les activités' })}
            tone="blue"
            icon="Calendar"
          />
          <TodayCard
            title={t('nav.messaging')}
            description={messagerieDisponible
              ? t('memberDashboard.nextActions.openGroupMessaging')
              : t('messaging.joinGroupDescription')}
            to={messagerieDisponible ? '/messagerie' : '/groupes'}
            action={messagerieDisponible ? t('common.open') : t('groups.discover')}
            tone="teal"
            icon="MessageCircle"
          />
          <TodayCard
            title={t('nav.projects')}
            description={latestProjects.length > 0
              ? t('memberDashboard.today.projectsCount', { count: latestProjects.length, defaultValue: `${latestProjects.length} projet(s) à suivre` })
              : t('projects.no_projects', { defaultValue: 'Aucun projet à suivre pour le moment.' })}
            to="/projets"
            action={t('common.open')}
            tone="violet"
            icon="Rocket"
          />
        </div>

        <div className="grid gap-3">
          <QuickActionCard to="/groupes" title={t('ux.groups.joinGroup', { defaultValue: 'Rejoindre un groupe' })} tone="blue" icon="Users" />
          <QuickActionCard to="/activites" title={t('activities.viewActivities', { defaultValue: 'Voir les activités' })} tone="teal" icon="Calendar" />
          <QuickActionCard to={messagerieDisponible ? '/messagerie' : '/groupes'} title={t('messaging.openMessaging', { defaultValue: 'Ouvrir la messagerie' })} tone="violet" icon="MessageCircle" />
          <QuickActionCard to="/notifications" title={t('memberDashboard.today.viewNotifications', { defaultValue: 'Voir mes notifications' })} tone="amber" icon="Bell" />
        </div>
      </div>
    </section>
  )
}

function TodayCard({ title, description, to, action, tone = 'blue', icon = 'Folder' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    teal: 'bg-teal-50 text-teal-700',
    violet: 'bg-violet-50 text-violet-700',
  }

  return (
    <Link to={to} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <span className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}>
        <AppIcon name={icon} className="h-5 w-5" />
      </span>
      <h3 className="font-black text-slate-950">{title}</h3>
      <p className="mt-1 min-h-[38px] text-sm leading-5 text-slate-500">{description}</p>
      <span className="mt-3 inline-flex text-xs font-black text-blue-700">{action}</span>
    </Link>
  )
}

function QuickActions({ messagerieDisponible, t }) {
  return (
    <div className="grid sm:grid-cols-3 lg:grid-cols-1 gap-3">
      <QuickActionCard to="/activites" title={t('nav.activities')} description={t('memberDashboard.nextActions.viewActivities')} tone="blue" icon="Calendar" />
      <QuickActionCard to="/projets" title={t('nav.projects')} description={t('memberDashboard.nextActions.discoverProjects')} tone="violet" icon="Rocket" />
      <QuickActionCard
        to={messagerieDisponible ? '/messagerie' : '/groupes'}
        title={t('nav.groups')}
        description={messagerieDisponible ? t('memberDashboard.nextActions.openGroupMessaging') : t('memberDashboard.nextActions.viewMyGroup')}
        tone="teal"
        icon={messagerieDisponible ? 'MessageCircle' : 'Users'}
      />
    </div>
  )
}
