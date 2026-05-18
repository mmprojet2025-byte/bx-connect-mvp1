import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const ROLES = [
  { value: 'MEMBRE', label: '👤 Membre — Je suis un jeune ou un bénévole' },
  { value: 'PARTENAIRE', label: '🤝 Partenaire — Je représente une organisation' },
]

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    motDePasse: '',
    confirmation: '',
    role: 'MEMBRE',
  })
  const [erreur, setErreur] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreur(null)

    if (form.motDePasse !== form.confirmation) {
      setErreur('Les mots de passe ne correspondent pas.')
      return
    }
    if (form.motDePasse.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        prenom: form.prenom,
        nom: form.nom,
        email: form.email,
        motDePasse: form.motDePasse,
        role: form.role,
      })
      const { token, prenom, nom, email, role } = res.data
      login(token, { prenom, nom, email, role })
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de l\'inscription.'
      setErreur(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-blue-800">BX-CONNECT</Link>
          <p className="text-gray-500 text-sm mt-1">Crée ton compte gratuitement</p>
        </div>

        {/* Erreur */}
        {erreur && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
            ❌ {erreur}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Prénom + Nom */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <input
                type="text"
                required
                value={form.prenom}
                onChange={e => setForm({ ...form, prenom: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Jean"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                required
                value={form.nom}
                onChange={e => setForm({ ...form, nom: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Dupont"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse e-mail *</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="ton@email.com"
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={form.motDePasse}
              onChange={e => setForm({ ...form, motDePasse: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Minimum 6 caractères"
            />
          </div>

          {/* Confirmation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe *</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={form.confirmation}
              onChange={e => setForm({ ...form, confirmation: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="••••••••"
            />
          </div>

          {/* Rôle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Je suis... *</label>
            <div className="space-y-2">
              {ROLES.map(r => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition ${
                    form.role === r.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={form.role === r.value}
                    onChange={() => setForm({ ...form, role: r.value })}
                    className="accent-blue-700"
                  />
                  <span className="text-sm text-gray-700">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-xl transition mt-2"
          >
            {loading ? 'Création du compte...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà inscrit ?{' '}
          <Link to="/login" className="text-blue-700 font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}