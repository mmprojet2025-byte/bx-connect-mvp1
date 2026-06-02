import { useCallback, useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'

const emptyForm = {
  prenom: '',
  nom: '',
  email: '',
  motDePasseTemporaire: '',
}

export default function AdminReferents() {
  const [referents, setReferents] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)

  const fetchReferents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/referents')
      setReferents(res.data)
      setError('')
    } catch {
      setError('Impossible de charger les référents.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReferents() }, [fetchReferents])

  const creerReferent = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const res = await api.post('/admin/referents', form)
      setReferents(prev => [...prev, res.data])
      setForm(emptyForm)
      setMessage('Référent créé avec succès.')
    } catch (err) {
      setError(formatCreationError(err, 'Erreur lors de la création du référent.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-blue-900">Référents</h1>
          <p className="text-sm text-gray-500 mt-1">Créer et suivre les référents de BX-Jeunes Impact.</p>
        </div>

        {message && <Alert>{message}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={creerReferent} className="bg-white rounded-2xl shadow p-5 mb-6">
          <h2 className="font-bold text-blue-900 mb-4">Créer un référent</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Prénom" value={form.prenom} onChange={value => setForm({ ...form, prenom: value })} />
            <Input label="Nom" value={form.nom} onChange={value => setForm({ ...form, nom: value })} />
            <Input label="Email" type="email" value={form.email} onChange={value => setForm({ ...form, email: value })} />
            <Input
              label="Mot de passe temporaire"
              type="password"
              value={form.motDePasseTemporaire}
              onChange={value => setForm({ ...form, motDePasseTemporaire: value })}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 bg-blue-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 transition"
          >
            {saving ? 'Création...' : 'Créer REFERENT'}
          </button>
        </form>

        {loading ? (
          <p className="text-gray-400 text-center py-10">Chargement...</p>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '700px' }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nom</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Inscription</th>
                  </tr>
                </thead>
                <tbody>
                  {referents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-gray-400 text-sm">Aucun référent.</td>
                    </tr>
                  ) : referents.map((referent, index) => (
                    <tr key={referent.id} className={`border-b border-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3 font-medium text-blue-900 text-sm">{referent.prenom} {referent.nom}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{referent.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-3 py-0.5 rounded-full font-medium ${referent.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {referent.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(referent.dateInscription)}</td>
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

function formatCreationError(err, fallback) {
  if (err.response?.status === 401) return 'Session expirée. Reconnectez-vous.'
  if (err.response?.status === 403) return 'Action réservée à un ADMIN.'
  if (err.response?.status === 400) {
    const message = err.response?.data?.message || ''
    if (message.toLowerCase().includes('email')) return 'Email invalide ou déjà utilisé.'
    if (message.toLowerCase().includes('mot') || message.toLowerCase().includes('password')) {
      return 'Le mot de passe temporaire doit contenir au moins 8 caractères.'
    }
    return message || 'Vérifiez les champs du formulaire.'
  }
  return err.response?.data?.message || fallback
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </label>
  )
}

function Alert({ type, children }) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-green-50 border-green-200 text-green-700'

  return <div className={`border px-4 py-3 rounded-xl mb-5 text-sm ${styles}`}>{children}</div>
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-BE') : '-'
}
