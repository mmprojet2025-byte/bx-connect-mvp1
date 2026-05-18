import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'

const STATUT_COLORS = {
  BROUILLON: 'bg-gray-100 text-gray-600',
  SOUMIS: 'bg-yellow-100 text-yellow-700',
  APPROUVE: 'bg-green-100 text-green-700',
  EN_COURS: 'bg-blue-100 text-blue-700',
  TERMINE: 'bg-purple-100 text-purple-700',
  REJETE: 'bg-red-100 text-red-600',
}

const STATUT_LABELS = {
  BROUILLON: 'Brouillon',
  SOUMIS: 'En attente',
  APPROUVE: 'Approuvé',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  REJETE: 'Rejeté',
}

export default function Projets() {
  const { isAuthenticated, isMembre, isAdmin, isReferent } = useAuth()
  const [projets, setProjets] = useState([])
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [message, setMessage] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    titre: '',
    description: '',
    budgetDemande: '',
    objectifs: '',
  })

  const chargerProjets = () => {
    const url = (isAdmin || isReferent) ? '/projets/admin/tous' : '/projets'
    api.get(url)
      .then(res => setProjets(res.data))
      .catch(() => setProjets([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    chargerProjets()
  }, [])

  const rejoindre = (id) => {
    api.post(`/projets/${id}/rejoindre`)
      .then(() => {
        setMessage({ type: 'success', text: '✅ Tu as rejoint ce projet !' })
        setTimeout(() => setMessage(null), 3000)
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'Erreur.'
        setMessage({ type: 'error', text: `❌ ${msg}` })
        setTimeout(() => setMessage(null), 4000)
      })
  }

  const soumettre = (id) => {
    api.patch(`/projets/${id}/soumettre`)
      .then(() => {
        setMessage({ type: 'success', text: '✅ Projet soumis pour validation !' })
        chargerProjets()
        setTimeout(() => setMessage(null), 3000)
      })
      .catch(() => setMessage({ type: 'error', text: '❌ Erreur lors de la soumission.' }))
  }

  const valider = (id, approuver) => {
    api.patch(`/projets/${id}/valider?approuver=${approuver}`)
      .then(() => {
        setMessage({ type: 'success', text: approuver ? '✅ Projet approuvé !' : '✅ Projet rejeté.' })
        chargerProjets()
        setTimeout(() => setMessage(null), 3000)
      })
      .catch(() => setMessage({ type: 'error', text: '❌ Erreur.' }))
  }

  const proposer = (e) => {
    e.preventDefault()
    api.post('/projets', {
      titre: form.titre,
      description: form.description,
      budgetDemande: parseFloat(form.budgetDemande) || 0,
      objectifs: form.objectifs,
    })
      .then(() => {
        setMessage({ type: 'success', text: '✅ Projet proposé avec succès !' })
        setShowForm(false)
        setForm({ titre: '', description: '', budgetDemande: '', objectifs: '' })
        chargerProjets()
        setTimeout(() => setMessage(null), 3000)
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'Erreur lors de la proposition.'
        setMessage({ type: 'error', text: `❌ ${msg}` })
        setTimeout(() => setMessage(null), 4000)
      })
  }

  const filtres = projets.filter(p =>
    p.titre.toLowerCase().includes(recherche.toLowerCase())
  )

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Projets collaboratifs</h1>
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Rechercher un projet..."
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              className="border border-gray-300 rounded-full px-4 py-2 text-sm w-full md:w-60 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {isAuthenticated && (isMembre || isAdmin || isReferent) && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-700 hover:bg-blue-600 text-white text-sm px-5 py-2 rounded-full transition font-medium"
              >
                {showForm ? 'Annuler' : '+ Proposer un projet'}
              </button>
            )}
          </div>
        </div>

        {/* Message flash */}
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Formulaire proposition */}
        {showForm && (
          <form onSubmit={proposer} className="bg-white rounded-2xl shadow p-6 mb-8 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Proposer un nouveau projet</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
              <input
                type="text"
                required
                value={form.titre}
                onChange={e => setForm({ ...form, titre: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Titre du projet"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Décris ton projet..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Objectifs</label>
              <input
                type="text"
                value={form.objectifs}
                onChange={e => setForm({ ...form, objectifs: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Objectifs du projet"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget demandé (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budgetDemande}
                onChange={e => setForm({ ...form, budgetDemande: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="0.00"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-700 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-xl transition"
            >
              Proposer le projet
            </button>
          </form>
        )}

        {/* Liste projets */}
        {loading ? (
          <p className="text-gray-400 text-center py-20">Chargement...</p>
        ) : filtres.length === 0 ? (
          <p className="text-gray-400 text-center py-20">Aucun projet trouvé.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtres.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow hover:shadow-md transition p-5 flex flex-col">
                {/* Statut */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUT_COLORS[p.statut] || 'bg-gray-100 text-gray-500'}`}>
                    {STATUT_LABELS[p.statut] || p.statut}
                  </span>
                  {p.budgetDemande > 0 && (
                    <span className="text-xs text-gray-400">💶 {p.budgetDemande} € demandés</span>
                  )}
                </div>

                {/* Titre & description */}
                <h3 className="font-semibold text-gray-800 mb-1">{p.titre}</h3>
                <p className="text-gray-500 text-sm mb-3 flex-1 line-clamp-3">{p.description}</p>

                {/* Porteur */}
                <p className="text-xs text-gray-400 mb-4">
                  Porteur : {p.porteurPrenom} {p.porteurNom}
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {/* Membre : rejoindre un projet approuvé/en cours */}
                  {isAuthenticated && isMembre && ['APPROUVE', 'EN_COURS'].includes(p.statut) && (
                    <button
                      onClick={() => rejoindre(p.id)}
                      className="bg-blue-700 hover:bg-blue-600 text-white text-sm py-2 rounded-xl transition font-medium"
                    >
                      Rejoindre ce projet
                    </button>
                  )}

                  {/* Porteur : soumettre un brouillon */}
                  {isAuthenticated && p.statut === 'BROUILLON' && (
                    <button
                      onClick={() => soumettre(p.id)}
                      className="bg-yellow-500 hover:bg-yellow-400 text-white text-sm py-2 rounded-xl transition font-medium"
                    >
                      Soumettre pour validation
                    </button>
                  )}

                  {/* Admin/Référent : valider un projet soumis */}
                  {(isAdmin || isReferent) && p.statut === 'SOUMIS' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => valider(p.id, true)}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm py-2 rounded-xl transition font-medium"
                      >
                        ✅ Approuver
                      </button>
                      <button
                        onClick={() => valider(p.id, false)}
                        className="flex-1 bg-red-500 hover:bg-red-400 text-white text-sm py-2 rounded-xl transition font-medium"
                      >
                        ❌ Rejeter
                      </button>
                    </div>
                  )}

                  {!isAuthenticated && (
                    <p className="text-xs text-center text-gray-400">
                      <a href="/login" className="text-blue-600 hover:underline">Connecte-toi</a> pour participer
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