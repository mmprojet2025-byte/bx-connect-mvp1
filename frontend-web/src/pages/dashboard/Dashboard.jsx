import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import MemberGroupCard from '../../components/member/MemberGroupCard'
import MemberReferentCard from '../../components/member/MemberReferentCard'
import MemberNextActions from '../../components/member/MemberNextActions'
import MemberActivitiesCard from '../../components/member/MemberActivitiesCard'
import MemberMessagingCard from '../../components/member/MemberMessagingCard'
import MemberNotificationsCard from '../../components/member/MemberNotificationsCard'
import MemberProjectsCard from '../../components/member/MemberProjectsCard'
import MemberEngagementCard from '../../components/member/MemberEngagementCard'
import api from '../../api/axios'

export default function Dashboard() {
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
      setError('Impossible de charger votre dashboard membre.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const groupe = dashboard?.groupe
  const referent = dashboard?.referent
  const messagerieDisponible = dashboard?.messagerieDisponible || false

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <header className="mb-8">
          <p className="text-sm text-gray-500">Bienvenue dans ton espace BX-Connect.</p>
          <h1 className="text-3xl font-bold text-blue-900 mt-1">Bonjour, {user?.prenom}</h1>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-center py-10">Chargement...</p>
        ) : dashboard ? (
          <div className="space-y-6">
            <MemberGroupCard groupe={groupe} messagerieDisponible={messagerieDisponible} />

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

            <MemberEngagementCard implication={dashboard.implication} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <p className="text-gray-500 text-sm mb-4">Votre espace membre n’est pas disponible pour le moment.</p>
            <Link to="/activites" className="text-blue-700 text-sm font-semibold hover:underline">
              Voir les activités
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
