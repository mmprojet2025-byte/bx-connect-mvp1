import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'

const LANGUES = ['FR', 'NL', 'EN']

export default function Profil() {
  const { user, login } = useAuth()
  const [onglet, setOnglet] = useState('profil')
  const [message, setMessage] = useState(null)

  // Formulaire profil
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    languePreference: 'FR',
  })

  // Formulaire mot de passe
  const [mdp, setMdp] = useState({
    ancienMotDePasse: '',
    nouveauMotDePasse: '',
    confirmation: '',
  })

  // Données activités / projets
  const [inscriptions, setInscriptions] = useState([])
  const [projets, setProjets] = useState([])
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        prenom: user.prenom || '',
        nom: user.nom || '',
        languePreference: user.languePreference || 'FR',
      })
    }
  }, [user])

  useEffect(() => {
    if (onglet === 'activites') {
      setLoadingData(true)
      api.get('/inscriptions/mes-inscriptions')
        .then(res => setInscriptions(res.data))
        .catch(() => setInscriptions([]))
        .finally(() => setLoadingData(false))
    }
    if (onglet === 'projets') {
      setLoadingData(true)
      api.get('/projets/mes-projets')
        .then(res => setProjets(res.data))
        .catch(() => setProjets([]))
        .finally(() => setLoadingData(false))
    }
  }, [onglet])

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const sauvegarderProfil = (e) => {
    e.preventDefault()
    api.put('/users/me', form)
      .then(res => {
        // Mettre à jour le contexte avec les nouvelles infos
        const token = localStorage.getItem('token')
        login(token, res.data)
        showMessage('success', '✅ Profil mis à jour avec succès !')
      })
      .catch(() => showMessage('error', '❌ Erreur lors de la mise à jour.'))
  }

  const changerMotDePasse = (e) => {
    e.preventDefault()
    if (mdp.nouveauMotDePasse !== mdp.confirmation) {
      showMessage('error', '❌ Les mots de passe ne correspondent pas.')
      return
    }
    api.put('/users/me/password', {
      ancienMotDePasse: mdp.ancienMotDePasse,
      nouveauMotDePasse: mdp.nouveauMotDePasse,
    })
      .then(() => {
        showMessage('success', '✅ Mot de passe changé avec succès !')
        setMdp({ ancienMotDePasse: '', nouveauMotDePasse: '', confirmation: '' })
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'Erreur lors du changement.'
        showMessage('error', `❌ ${msg}`)
      })
  }

  const ONGLETS = [
    { id: 'profil', label: '👤 Profil' },
    { id: 'activites', label: '🎯 Mes activités' },
    { id: 'projets', label: '🚀 Mes projets' },
    { id: 'securite', label: '🔒 Sécurité' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        {/* En-tête profil */}
        <div className="bg-blue-800 text-white rounded-2xl p-6 mb-8 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold">
            {user?.prenom?.[0]}{user?.nom?.[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold">{user?.prenom} {user?.nom}</h1>
            <p className="text-blue-200 text-sm">{user?.email}</p>
            <span className="mt-1 inline-block text-xs bg-blue-600 px-2 py-0.5 rounded-full font-medium uppercase">
              {user?.role}
            </span>
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

        {/* Onglets */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {ONGLETS.map(o => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                onglet === o.id
                  ? 'bg-blue-700 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Onglet : Profil */}
        {onglet === 'profil' && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6">Modifier mon profil</h2>
            <form onSubmit={sauvegarderProfil} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    required
                    value={form.prenom}
                    onChange={e => setForm({ ...form, prenom: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    required
                    value={form.nom}
                    onChange={e => setForm({ ...form, nom: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Langue préférée</label>
                <select
                  value={form.languePreference}
                  onChange={e => setForm({ ...form, languePreference: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {LANGUES.map(l => (
                    <option key={l} value={l}>
                      {l === 'FR' ? '🇫🇷 Français' : l === 'NL' ? '🇧🇪 Néerlandais' : '🇬🇧 Anglais'}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="bg-blue-700 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-xl transition"
              >
                Sauvegarder
              </button>
            </form>
          </div>
        )}

        {/* Onglet : Mes activités */}
        {onglet === 'activites' && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6">Mes inscriptions aux activités</h2>
            {loadingData ? (
              <p className="text-gray-400 text-center py-10">Chargement...</p>
            ) : inscriptions.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-400 mb-3">Aucune inscription pour le moment.</p>
                <a href="/activites" className="text-blue-700 text-sm font-medium hover:underline">
                  Découvrir les activités →
                </a>
              </div>
            ) : (
              <ul className="divide-y">
                {inscriptions.map(ins => (
                  <li key={ins.id} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{ins.activiteTitre || 'Activité'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Inscrit le {new Date(ins.dateInscription).toLocaleDateString('fr-BE')}
                      </p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      {ins.statut || 'Inscrit'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Onglet : Mes projets */}
        {onglet === 'projets' && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6">Mes projets</h2>
            {loadingData ? (
              <p className="text-gray-400 text-center py-10">Chargement...</p>
            ) : projets.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-400 mb-3">Aucun projet pour le moment.</p>
                <a href="/projets" className="text-blue-700 text-sm font-medium hover:underline">
                  Voir les projets →
                </a>
              </div>
            ) : (
              <ul className="divide-y">
                {projets.map(p => (
                  <li key={p.id} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{p.titre}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.description}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium ml-4">
                      {p.statut}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Onglet : Sécurité */}
        {onglet === 'securite' && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6">Changer mon mot de passe</h2>
            <form onSubmit={changerMotDePasse} className="space-y-5 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ancien mot de passe</label>
                <input
                  type="password"
                  required
                  value={mdp.ancienMotDePasse}
                  onChange={e => setMdp({ ...mdp, ancienMotDePasse: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={mdp.nouveauMotDePasse}
                  onChange={e => setMdp({ ...mdp, nouveauMotDePasse: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  value={mdp.confirmation}
                  onChange={e => setMdp({ ...mdp, confirmation: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-700 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-xl transition"
              >
                Changer le mot de passe
              </button>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}