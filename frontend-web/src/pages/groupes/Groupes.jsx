import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

export default function Groupes() {
  const { isAuthenticated, isMembre, isReferent, isAdmin, user } = useAuth()
  const navigate = useNavigate()

  const [groupes, setGroupes] = useState([])
  const [mesGroupes, setMesGroupes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recherche, setRecherche] = useState('')
  const [onglet, setOnglet] = useState('tous') // 'tous' | 'mes-groupes' | 'creer'

  // Formulaire création groupe
  const [formGroupe, setFormGroupe] = useState({
    nom: '',
    description: '',
    categorie: '',
    public: true
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formSuccess, setFormSuccess] = useState('')
  const [formError, setFormError] = useState('')

  // Demandes en attente (référent/admin)
  const [demandesGroupe, setDemandesGroupe] = useState({}) // { groupeId: [demandes] }

  // ─── Chargement initial ───────────────────────────────────────────────────

  useEffect(() => {
    chargerGroupes()
    if (isAuthenticated) {
      chargerMesGroupes()
    }
  }, [isAuthenticated])

  const chargerGroupes = async () => {
    try {
      setLoading(true)
      const url = recherche.trim()
        ? `/api/groupes/recherche?q=${encodeURIComponent(recherche)}`
        : '/api/groupes'
      const res = await api.get(url)
      setGroupes(res.data)
    } catch (err) {
      setError('Impossible de charger les groupes.')
    } finally {
      setLoading(false)
    }
  }

  const chargerMesGroupes = async () => {
    try {
      const res = await api.get('/api/groupes/mes-groupes')
      setMesGroupes(res.data)
    } catch (err) {
      // silencieux
    }
  }

  const handleRecherche = (e) => {
    e.preventDefault()
    chargerGroupes()
  }

  // ─── Actions membres ──────────────────────────────────────────────────────

  const rejoindreGroupe = async (groupeId) => {
    if (!isAuthenticated) { navigate('/login'); return }
    try {
      await api.post(`/api/groupes/${groupeId}/rejoindre`)
      chargerGroupes()
      chargerMesGroupes()
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la demande.')
    }
  }

  const quitterGroupe = async (groupeId) => {
    if (!window.confirm('Quitter ce groupe ?')) return
    try {
      await api.delete(`/api/groupes/${groupeId}/quitter`)
      chargerGroupes()
      chargerMesGroupes()
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la sortie.')
    }
  }

  // ─── Création groupe (référent/admin) ─────────────────────────────────────

  const handleCreerGroupe = async (e) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')
    setFormSuccess('')
    try {
      await api.post('/api/groupes', formGroupe)
      setFormSuccess('✅ Groupe créé avec succès !')
      setFormGroupe({ nom: '', description: '', categorie: '', public: true })
      chargerGroupes()
      chargerMesGroupes()
      setTimeout(() => setOnglet('mes-groupes'), 1500)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Erreur lors de la création.')
    } finally {
      setFormLoading(false)
    }
  }

  // ─── Demandes en attente ──────────────────────────────────────────────────

  const chargerDemandes = async (groupeId) => {
    try {
      const res = await api.get(`/api/groupes/${groupeId}/demandes`)
      setDemandesGroupe(prev => ({ ...prev, [groupeId]: res.data }))
    } catch (err) {
      // silencieux
    }
  }

  const traiterDemande = async (membreGroupeId, accepter, groupeId) => {
    try {
      await api.patch(`/api/groupes/demandes/${membreGroupeId}?accepter=${accepter}`)
      chargerDemandes(groupeId)
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur.')
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const estMembre = (groupe) => {
    return mesGroupes.some(mg => mg.id === groupe.id)
  }

  const statutBadge = (statut) => {
    const map = {
      ACTIF: 'bg-green-100 text-green-800',
      INACTIF: 'bg-gray-100 text-gray-600',
      ARCHIVE: 'bg-red-100 text-red-700'
    }
    return map[statut] || 'bg-gray-100 text-gray-600'
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">

        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">🤝 Groupes</h1>
          <p className="text-gray-600">
            Rejoins des groupes thématiques, échange avec d'autres membres et partenaires.
          </p>
        </div>

        {/* Barre de recherche */}
        <form onSubmit={handleRecherche} className="flex gap-2 mb-6">
          <input
            type="text"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher un groupe..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            className="bg-blue-800 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            🔍 Rechercher
          </button>
        </form>

        {/* Onglets */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setOnglet('tous')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
              onglet === 'tous'
                ? 'border-blue-700 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-blue-600'
            }`}
          >
            Tous les groupes
          </button>
          {isAuthenticated && (
            <button
              onClick={() => { setOnglet('mes-groupes'); chargerMesGroupes() }}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
                onglet === 'mes-groupes'
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-blue-600'
              }`}
            >
              Mes groupes {mesGroupes.length > 0 && `(${mesGroupes.length})`}
            </button>
          )}
          {(isReferent || isAdmin) && (
            <button
              onClick={() => setOnglet('creer')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
                onglet === 'creer'
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-blue-600'
              }`}
            >
              ➕ Créer un groupe
            </button>
          )}
        </div>

        {/* ── Onglet : Tous les groupes ── */}
        {onglet === 'tous' && (
          <>
            {loading ? (
              <div className="text-center py-12 text-gray-500">Chargement des groupes...</div>
            ) : error ? (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
            ) : groupes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-3">🤝</p>
                <p className="font-medium">Aucun groupe disponible pour le moment.</p>
                {(isReferent || isAdmin) && (
                  <button
                    onClick={() => setOnglet('creer')}
                    className="mt-4 bg-blue-800 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Créer le premier groupe
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {groupes.map(groupe => (
                  <CarteGroupe
                    key={groupe.id}
                    groupe={groupe}
                    estMembre={estMembre(groupe)}
                    isAuthenticated={isAuthenticated}
                    isReferent={isReferent}
                    isAdmin={isAdmin}
                    onRejoindre={() => rejoindreGroupe(groupe.id)}
                    onQuitter={() => quitterGroupe(groupe.id)}
                    onChargerDemandes={() => chargerDemandes(groupe.id)}
                    demandes={demandesGroupe[groupe.id] || []}
                    onTraiterDemande={(membreGroupeId, accepter) =>
                      traiterDemande(membreGroupeId, accepter, groupe.id)
                    }
                    statutBadge={statutBadge}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Onglet : Mes groupes ── */}
        {onglet === 'mes-groupes' && isAuthenticated && (
          <>
            {mesGroupes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-medium">Tu n'as rejoint aucun groupe pour l'instant.</p>
                <button
                  onClick={() => setOnglet('tous')}
                  className="mt-4 bg-blue-800 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Découvrir les groupes
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {mesGroupes.map(groupe => (
                  <CarteGroupe
                    key={groupe.id}
                    groupe={groupe}
                    estMembre={true}
                    isAuthenticated={isAuthenticated}
                    isReferent={isReferent}
                    isAdmin={isAdmin}
                    onRejoindre={() => rejoindreGroupe(groupe.id)}
                    onQuitter={() => quitterGroupe(groupe.id)}
                    onChargerDemandes={() => chargerDemandes(groupe.id)}
                    demandes={demandesGroupe[groupe.id] || []}
                    onTraiterDemande={(membreGroupeId, accepter) =>
                      traiterDemande(membreGroupeId, accepter, groupe.id)
                    }
                    statutBadge={statutBadge}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Onglet : Créer un groupe ── */}
        {onglet === 'creer' && (isReferent || isAdmin) && (
          <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-blue-900 mb-5">Créer un nouveau groupe</h2>

            {formSuccess && (
              <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4">{formSuccess}</div>
            )}
            {formError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">{formError}</div>
            )}

            <form onSubmit={handleCreerGroupe} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du groupe <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formGroupe.nom}
                  onChange={e => setFormGroupe({ ...formGroupe, nom: e.target.value })}
                  placeholder="Ex: Groupe Coding Jeunes"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formGroupe.description}
                  onChange={e => setFormGroupe({ ...formGroupe, description: e.target.value })}
                  placeholder="Décris l'objectif et les activités du groupe..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie
                </label>
                <select
                  value={formGroupe.categorie}
                  onChange={e => setFormGroupe({ ...formGroupe, categorie: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">-- Choisir une catégorie --</option>
                  <option value="Formation">Formation</option>
                  <option value="Projet">Projet</option>
                  <option value="Loisirs">Loisirs</option>
                  <option value="Bénévolat">Bénévolat</option>
                  <option value="Numérique">Numérique</option>
                  <option value="Culture">Culture</option>
                  <option value="Sport">Sport</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="public"
                  checked={formGroupe.public}
                  onChange={e => setFormGroupe({ ...formGroupe, public: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="public" className="text-sm text-gray-700">
                  Groupe public (visible par tous)
                </label>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-blue-800 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
              >
                {formLoading ? 'Création en cours...' : '✅ Créer le groupe'}
              </button>
            </form>
          </div>
        )}

      </main>

      <Footer />
    </div>
  )
}

// ─── Composant carte groupe ────────────────────────────────────────────────────

function CarteGroupe({
  groupe,
  estMembre,
  isAuthenticated,
  isReferent,
  isAdmin,
  onRejoindre,
  onQuitter,
  onChargerDemandes,
  demandes,
  onTraiterDemande,
  statutBadge
}) {
  const [showDemandes, setShowDemandes] = useState(false)

  const toggleDemandes = () => {
    if (!showDemandes) onChargerDemandes()
    setShowDemandes(!showDemandes)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition">

      {/* En-tête carte */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-blue-900 text-lg leading-tight">{groupe.nom}</h3>
          {groupe.categorie && (
            <span className="text-xs text-blue-600 font-medium">{groupe.categorie}</span>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statutBadge(groupe.statut)}`}>
          {groupe.statut}
        </span>
      </div>

      {/* Description */}
      {groupe.description && (
        <p className="text-sm text-gray-600 line-clamp-2">{groupe.description}</p>
      )}

      {/* Infos */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>👥 {groupe.nombreMembres ?? 0} membre{(groupe.nombreMembres ?? 0) !== 1 ? 's' : ''}</span>
        {groupe.referentPrenom && (
          <span>👤 {groupe.referentPrenom} {groupe.referentNom}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-gray-100">
        {isAuthenticated ? (
          estMembre ? (
            <button
              onClick={onQuitter}
              className="w-full text-sm bg-red-50 text-red-700 hover:bg-red-100 py-1.5 rounded-lg transition font-medium"
            >
              Quitter le groupe
            </button>
          ) : (
            <button
              onClick={onRejoindre}
              className="w-full text-sm bg-blue-800 text-white hover:bg-blue-700 py-1.5 rounded-lg transition font-medium"
            >
              Rejoindre
            </button>
          )
        ) : (
          <p className="text-xs text-gray-400 text-center">
            <a href="/login" className="text-blue-600 hover:underline">Connecte-toi</a> pour rejoindre ce groupe
          </p>
        )}

        {/* Demandes en attente (référent/admin) */}
        {(isReferent || isAdmin) && (
          <button
            onClick={toggleDemandes}
            className="w-full text-xs text-gray-500 hover:text-blue-700 py-1 transition"
          >
            {showDemandes ? '▲ Masquer les demandes' : '▼ Voir les demandes en attente'}
          </button>
        )}
      </div>

      {/* Liste des demandes */}
      {showDemandes && (isReferent || isAdmin) && (
        <div className="border-t border-gray-100 pt-3">
          {demandes.length === 0 ? (
            <p className="text-xs text-gray-400 text-center">Aucune demande en attente</p>
          ) : (
            <ul className="space-y-2">
              {demandes.map(d => (
                <li key={d.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 font-medium">
                    {d.membrePrenom} {d.membreNom}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onTraiterDemande(d.id, true)}
                      className="bg-green-100 text-green-700 hover:bg-green-200 px-2 py-0.5 rounded transition"
                    >
                      ✓ Accepter
                    </button>
                    <button
                      onClick={() => onTraiterDemande(d.id, false)}
                      className="bg-red-100 text-red-700 hover:bg-red-200 px-2 py-0.5 rounded transition"
                    >
                      ✗ Refuser
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}