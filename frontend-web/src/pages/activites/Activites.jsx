import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'

const STATUT_COLORS = {
  BROUILLON: 'bg-gray-100 text-gray-600',
  PUBLIEE: 'bg-green-100 text-green-700',
  ANNULEE: 'bg-red-100 text-red-600',
  TERMINEE: 'bg-blue-100 text-blue-700',
}

export default function Activites() {
  const { isAuthenticated, isMembre, isAdmin, isReferent } = useAuth()
  const [activites, setActivites] = useState([])
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [message, setMessage] = useState(null)

  const chargerActivites = () => {
    const url = (isAdmin || isReferent)
      ? '/activites/admin/toutes'
      : '/activites'
    api.get(url)
      .then(res => setActivites(res.data))
      .catch(() => setActivites([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    chargerActivites()
  }, [])

  const sInscrire = (activiteId) => {
    api.post('/inscriptions', { activiteId })
      .then(() => {
        setMessage({ type: 'success', text: '✅ Inscription réussie !' })
        setTimeout(() => setMessage(null), 3000)
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'Erreur lors de l\'inscription.'
        setMessage({ type: 'error', text: `❌ ${msg}` })
        setTimeout(() => setMessage(null), 4000)
      })
  }

  const publier = (id) => {
    api.patch(`/activites/${id}/statut?statut=PUBLIEE`)
      .then(() => chargerActivites())
      .catch(() => alert('Erreur lors de la publication.'))
  }

  const filtrees = activites.filter(a =>
    a.titre.toLowerCase().includes(recherche.toLowerCase()) ||
    (a.categorie || '').toLowerCase().includes(recherche.toLowerCase())
  )

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Activités</h1>
          <input
            type="text"
            placeholder="Rechercher une activité..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            className="border border-gray-300 rounded-full px-4 py-2 text-sm w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Message flash */}
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-center py-20">Chargement...</p>
        ) : filtrees.length === 0 ? (
          <p className="text-gray-400 text-center py-20">Aucune activité trouvée.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtrees.map(a => (
              <div key={a.id} className="bg-white rounded-2xl shadow hover:shadow-md transition p-5 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                    {a.categorie || 'Général'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUT_COLORS[a.statut] || 'bg-gray-100 text-gray-500'}`}>
                    {a.statut}
                  </span>
                </div>

                {/* Titre & description */}
                <h3 className="font-semibold text-gray-800 mb-1">{a.titre}</h3>
                <p className="text-gray-500 text-sm mb-3 flex-1 line-clamp-2">{a.description}</p>

                {/* Infos */}
                <div className="text-xs text-gray-400 space-y-1 mb-4">
                  <div>📅 {new Date(a.dateDebut).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div>📍 {a.lieu || 'Bruxelles'}</div>
                  <div>{a.gratuite ? '🆓 Gratuit' : `💶 ${a.prix} €`}</div>
                  {a.capaciteMax > 0 && <div>👥 Max {a.capaciteMax} participants</div>}
                </div>

                {/* Créateur */}
                <p className="text-xs text-gray-400 mb-4">
                  Par {a.createurPrenom} {a.createurNom}
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {isAuthenticated && (isMembre || isAdmin || isReferent) && a.statut === 'PUBLIEE' && (
                    <button
                      onClick={() => sInscrire(a.id)}
                      className="bg-blue-700 hover:bg-blue-600 text-white text-sm py-2 rounded-xl transition font-medium"
                    >
                      S'inscrire
                    </button>
                  )}
                  {(isAdmin || isReferent) && a.statut === 'BROUILLON' && (
                    <button
                      onClick={() => publier(a.id)}
                      className="bg-green-600 hover:bg-green-500 text-white text-sm py-2 rounded-xl transition font-medium"
                    >
                      Publier
                    </button>
                  )}
                  {!isAuthenticated && (
                    <p className="text-xs text-center text-gray-400">
                      <a href="/login" className="text-blue-600 hover:underline">Connecte-toi</a> pour t'inscrire
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}