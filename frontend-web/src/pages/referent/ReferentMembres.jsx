import { useCallback, useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'

export default function ReferentMembres() {
  const [groupes, setGroupes] = useState([])
  const [membres, setMembres] = useState([])
  const [groupeFiltre, setGroupeFiltre] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchMembres = useCallback(async () => {
    setLoading(true)
    try {
      const groupesRes = await api.get('/referent/groupes')
      const groupesData = groupesRes.data
      const membresData = await Promise.all(groupesData.map(async (groupe) => {
        const res = await api.get(`/referent/groupes/${groupe.id}/membres`)
        return res.data.map(membre => ({ ...membre, groupeId: groupe.id, groupeNom: groupe.nom }))
      }))

      setGroupes(groupesData)
      setMembres(membresData.flat())
      setError('')
    } catch {
      setError('Impossible de charger les membres.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMembres() }, [fetchMembres])

  const membresFiltres = groupeFiltre
    ? membres.filter(membre => String(membre.groupeId) === groupeFiltre)
    : membres

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Membres de mes groupes</h1>
            <p className="text-sm text-gray-500 mt-1">{membresFiltres.length} membre(s) visible(s)</p>
          </div>
          <select
            value={groupeFiltre}
            onChange={e => setGroupeFiltre(e.target.value)}
            className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="">Tous mes groupes</option>
            {groupes.map(groupe => <option key={groupe.id} value={groupe.id}>{groupe.nom}</option>)}
          </select>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-gray-400 text-center py-10">Chargement...</p>
        ) : membresFiltres.length === 0 ? (
          <EmptyState>Aucun membre accepté dans ce périmètre.</EmptyState>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '760px' }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nom</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Groupe</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Depuis</th>
                  </tr>
                </thead>
                <tbody>
                  {membresFiltres.map(membre => (
                    <tr key={`${membre.groupeId}-${membre.id}`} className="border-b border-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-blue-900">{membre.prenom} {membre.nom}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{membre.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{membre.groupeNom}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(membre.dateAdhesion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function Alert({ type, children }) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-green-50 border-green-200 text-green-700'

  return <div className={`border px-4 py-3 rounded-xl mb-5 text-sm ${styles}`}>{children}</div>
}

function EmptyState({ children }) {
  return <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400 text-sm">{children}</div>
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-BE') : '-'
}
