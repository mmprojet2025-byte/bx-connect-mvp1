import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'

export default function ReferentDashboard() {
  const [stats, setStats] = useState({ groupes: 0, membres: 0, demandes: 0, activites: 0 })
  const [groupes, setGroupes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const [groupesRes, activitesRes] = await Promise.all([
        api.get('/referent/groupes'),
        api.get('/referent/mes-activites'),
      ])

      const groupesData = groupesRes.data
      const details = await Promise.all(groupesData.map(async (groupe) => {
        const [membresRes, demandesRes] = await Promise.all([
          api.get(`/referent/groupes/${groupe.id}/membres`),
          api.get(`/referent/groupes/${groupe.id}/demandes`),
        ])
        return { groupe, membres: membresRes.data, demandes: demandesRes.data }
      }))

      setGroupes(groupesData)
      setStats({
        groupes: groupesData.length,
        membres: details.reduce((total, item) => total + item.membres.length, 0),
        demandes: details.reduce((total, item) => total + item.demandes.length, 0),
        activites: activitesRes.data.length,
      })
      setError('')
    } catch {
      setError('Impossible de charger le tableau de bord référent.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <div className="bg-teal-700 text-white rounded-2xl p-6 mb-6">
          <h1 className="text-2xl font-bold">Tableau de bord référent</h1>
          <p className="text-teal-100 text-sm mt-1">Vue centrée sur vos groupes, membres, demandes et activités.</p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-gray-400 text-center py-10">Chargement...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="Groupes assignés" value={stats.groupes} />
              <StatCard label="Membres" value={stats.membres} />
              <StatCard label="Demandes en attente" value={stats.demandes} />
              <StatCard label="Activités" value={stats.activites} />
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <NavCard to="/referent/groupes" title="Mes groupes" description="Suivre les groupes assignés" />
              <NavCard to="/referent/demandes" title="Demandes" description="Traiter les adhésions en attente" />
              <NavCard to="/referent/activites" title="Activités" description="Gérer les activités de vos groupes" />
            </div>

            <section className="bg-white rounded-2xl shadow p-5">
              <h2 className="font-bold text-blue-900 mb-4">Groupes assignés</h2>
              {groupes.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun groupe assigné.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {groupes.map(groupe => (
                    <div key={groupe.id} className="border border-gray-100 rounded-xl p-4">
                      <h3 className="font-semibold text-blue-900">{groupe.nom}</h3>
                      {groupe.description && <p className="text-sm text-gray-500 mt-1">{groupe.description}</p>}
                      <p className="text-xs text-gray-400 mt-3">{groupe.nombreMembres ?? 0} membre(s)</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <p className="text-3xl font-bold text-teal-700">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function NavCard({ to, title, description }) {
  return (
    <Link to={to} className="bg-white rounded-2xl shadow p-5 hover:shadow-md transition block">
      <h3 className="font-bold text-blue-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </Link>
  )
}

function Alert({ type, children }) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-green-50 border-green-200 text-green-700'

  return <div className={`border px-4 py-3 rounded-xl mb-5 text-sm ${styles}`}>{children}</div>
}
