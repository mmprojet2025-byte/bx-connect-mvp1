import { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'

const ONGLETS = [
  { id: 'stats', label: '📊 Statistiques' },
  { id: 'utilisateurs', label: '👥 Utilisateurs' },
  { id: 'activites', label: '🎯 Activités' },
  { id: 'projets', label: '🚀 Projets' },
]

export default function AdminDashboard() {
  const [onglet, setOnglet] = useState('stats')
  const [utilisateurs, setUtilisateurs] = useState([])
  const [activites, setActivites] = useState([])
  const [projets, setProjets] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  useEffect(() => {
    if (onglet === 'utilisateurs') {
      setLoading(true)
      api.get('/users/admin/tous').catch(() => ({ data: [] }))
        .then(res => setUtilisateurs(res.data || []))
        .finally(() => setLoading(false))
    }
    if (onglet === 'activites') {
      setLoading(true)
      api.get('/activites/admin/toutes').catch(() => ({ data: [] }))
        .then(res => setActivites(res.data || []))
        .finally(() => setLoading(false))
    }
    if (onglet === 'projets') {
      setLoading(true)
      api.get('/projets/admin/tous').catch(() => ({ data: [] }))
        .then(res => setProjets(res.data || []))
        .finally(() => setLoading(false))
    }
    if (onglet === 'stats') {
      setLoading(true)
      Promise.all([
        api.get('/users/admin/tous').catch(() => ({ data: [] })),
        api.get('/activites/admin/toutes').catch(() => ({ data: [] })),
        api.get('/projets/admin/tous').catch(() => ({ data: [] })),
      ]).then(([u, a, p]) => {
        setUtilisateurs(u.data || [])
        setActivites(a.data || [])
        setProjets(p.data || [])
      }).finally(() => setLoading(false))
    }
  }, [onglet])

  const publierActivite = (id) => {
    api.patch(`/activites/${id}/statut?statut=PUBLIEE`)
      .then(() => {
        showMessage('success', '✅ Activité publiée !')
        api.get('/activites/admin/toutes').then(res => setActivites(res.data))
      })
      .catch(() => showMessage('error', '❌ Erreur.'))
  }

  const validerProjet = (id, approuver) => {
    api.patch(`/projets/${id}/valider?approuver=${approuver}`)
      .then(() => {
        showMessage('success', approuver ? '✅ Projet approuvé !' : '✅ Projet rejeté.')
        api.get('/projets/admin/tous').then(res => setProjets(res.data))
      })
      .catch(() => showMessage('error', '❌ Erreur.'))
  }

  const stats = {
    membres: utilisateurs.filter(u => u.role === 'MEMBRE').length,
    partenaires: utilisateurs.filter(u => u.role === 'PARTENAIRE').length,
    activitesPubliees: activites.filter(a => a.statut === 'PUBLIEE').length,
    projetsSoumis: projets.filter(p => p.statut === 'SOUMIS').length,
    projetsEnCours: projets.filter(p => p.statut === 'EN_COURS').length,
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">⚙️ Back-office Administrateur</h1>

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

        {loading && <p className="text-gray-400 text-center py-10">Chargement...</p>}

        {/* Statistiques */}
        {onglet === 'stats' && !loading && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
              {[
                { label: 'Membres', value: stats.membres, color: 'bg-blue-50 text-blue-700', icon: '👤' },
                { label: 'Partenaires', value: stats.partenaires, color: 'bg-purple-50 text-purple-700', icon: '🤝' },
                { label: 'Activités publiées', value: stats.activitesPubliees, color: 'bg-green-50 text-green-700', icon: '🎯' },
                { label: 'Projets soumis', value: stats.projetsSoumis, color: 'bg-yellow-50 text-yellow-700', icon: '⏳' },
                { label: 'Projets en cours', value: stats.projetsEnCours, color: 'bg-orange-50 text-orange-700', icon: '🚀' },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl p-5 text-center ${s.color} shadow-sm`}>
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs font-medium mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Projets en attente */}
            {stats.projetsSoumis > 0 && (
              <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">⏳ Projets en attente de validation</h2>
                <ul className="divide-y">
                  {projets.filter(p => p.statut === 'SOUMIS').map(p => (
                    <li key={p.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{p.titre}</p>
                        <p className="text-xs text-gray-400">Par {p.porteurPrenom} {p.porteurNom}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => validerProjet(p.id, true)}
                          className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg transition"
                        >
                          ✅ Approuver
                        </button>
                        <button
                          onClick={() => validerProjet(p.id, false)}
                          className="bg-red-500 hover:bg-red-400 text-white text-xs px-3 py-1.5 rounded-lg transition"
                        >
                          ❌ Rejeter
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Utilisateurs */}
        {onglet === 'utilisateurs' && !loading && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Nom</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Rôle</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Inscription</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {utilisateurs.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.prenom} {u.nom}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {u.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {u.dateInscription ? new Date(u.dateInscription).toLocaleDateString('fr-BE') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {utilisateurs.length === 0 && (
              <p className="text-gray-400 text-center py-10">Aucun utilisateur trouvé.</p>
            )}
          </div>
        )}

        {/* Activités */}
        {onglet === 'activites' && !loading && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Titre</th>
                  <th className="px-4 py-3 text-left">Catégorie</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Date début</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activites.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{a.titre}</td>
                    <td className="px-4 py-3 text-gray-500">{a.categorie || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.statut === 'PUBLIEE' ? 'bg-green-100 text-green-700' :
                        a.statut === 'BROUILLON' ? 'bg-gray-100 text-gray-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {a.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {a.dateDebut ? new Date(a.dateDebut).toLocaleDateString('fr-BE') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {a.statut === 'BROUILLON' && (
                        <button
                          onClick={() => publierActivite(a.id)}
                          className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg transition"
                        >
                          Publier
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activites.length === 0 && (
              <p className="text-gray-400 text-center py-10">Aucune activité trouvée.</p>
            )}
          </div>
        )}

        {/* Projets */}
        {onglet === 'projets' && !loading && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Titre</th>
                  <th className="px-4 py-3 text-left">Porteur</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Budget</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {projets.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.titre}</td>
                    <td className="px-4 py-3 text-gray-500">{p.porteurPrenom} {p.porteurNom}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.statut === 'APPROUVE' || p.statut === 'EN_COURS' ? 'bg-green-100 text-green-700' :
                        p.statut === 'SOUMIS' ? 'bg-yellow-100 text-yellow-700' :
                        p.statut === 'REJETE' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {p.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {p.budgetDemande ? `${p.budgetDemande} €` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {p.statut === 'SOUMIS' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => validerProjet(p.id, true)}
                            className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg transition"
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => validerProjet(p.id, false)}
                            className="bg-red-500 hover:bg-red-400 text-white text-xs px-3 py-1.5 rounded-lg transition"
                          >
                            ❌
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {projets.length === 0 && (
              <p className="text-gray-400 text-center py-10">Aucun projet trouvé.</p>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}