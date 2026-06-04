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
    <div className="min-h-screen flex flex-col bg-gray-50">
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
          <p className="text-gray-400 text-center py-10">{t('memberDashboard.loading')}</p>
        ) : dashboard ? (
          <div className="space-y-6">
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
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <p className="text-gray-500 text-sm mb-4">{t('memberDashboard.unavailable')}</p>
            <Link to="/activites" className="text-blue-700 text-sm font-semibold hover:underline">
              {t('memberDashboard.buttons.viewActivities')}
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
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
