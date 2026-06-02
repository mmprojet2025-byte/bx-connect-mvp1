import { useEffect, useState } from 'react'
import api from '../../api/axios'
import SuperAdminLayout from '../../layouts/SuperAdminLayout'

const emptyForm = {
  prenom: '',
  nom: '',
  email: '',
  motDePasseTemporaire: '',
}

export default function SuperAdminAdmins() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [resetTarget, setResetTarget] = useState(null)
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => { fetchAdmins() }, [])

  const fetchAdmins = async () => {
    try {
      const res = await api.get('/super-admin/admins')
      setAdmins(res.data)
    } catch {
      setError('Impossible de charger les administrateurs.')
    } finally {
      setLoading(false)
    }
  }

  const clearFeedback = () => {
    setError('')
    setMessage('')
  }

  const createAdmin = async (e) => {
    e.preventDefault()
    clearFeedback()
    setSaving(true)
    try {
      const res = await api.post('/super-admin/admins', form)
      setAdmins(prev => [...prev, res.data])
      setForm(emptyForm)
      setMessage('ADMIN créé avec succès.')
    } catch (err) {
      setError(formatCreationError(err, 'Erreur lors de la création ADMIN.'))
    } finally {
      setSaving(false)
    }
  }

  const disableAdmin = async (admin) => {
    if (!window.confirm(`Désactiver le compte ADMIN de ${admin.email} ?`)) return
    clearFeedback()
    try {
      const res = await api.patch(`/super-admin/admins/${admin.id}/disable`)
      setAdmins(prev => prev.map(item => item.id === admin.id ? res.data : item))
      setMessage('ADMIN désactivé.')
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de désactiver cet ADMIN.')
    }
  }

  const enableAdmin = async (admin) => {
    clearFeedback()
    try {
      const res = await api.patch(`/super-admin/admins/${admin.id}/enable`)
      setAdmins(prev => prev.map(item => item.id === admin.id ? res.data : item))
      setMessage('ADMIN réactivé.')
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de réactiver cet ADMIN.')
    }
  }

  const resetPassword = async (e) => {
    e.preventDefault()
    if (!resetTarget) return
    clearFeedback()
    try {
      await api.patch(`/super-admin/admins/${resetTarget.id}/reset-password`, {
        nouveauMotDePasseTemporaire: newPassword,
      })
      setMessage(`Mot de passe réinitialisé pour ${resetTarget.email}.`)
      setResetTarget(null)
      setNewPassword('')
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de réinitialiser le mot de passe.')
    }
  }

  return (
    <SuperAdminLayout
      title="Gestion des ADMIN"
      subtitle="Création, activation et sécurité des administrateurs de l'association."
    >
      {message && <Alert>{message}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={createAdmin} className="bg-white rounded-2xl shadow p-5 mb-6">
        <h2 className="font-bold text-blue-900 mb-4">Créer un ADMIN</h2>
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
          {saving ? 'Création...' : 'Créer ADMIN'}
        </button>
      </form>

      {loading ? (
        <p className="text-gray-400 text-center py-10">Chargement...</p>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: '760px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nom</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Création</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">Aucun ADMIN.</td>
                  </tr>
                ) : admins.map((admin, index) => (
                  <tr key={admin.id} className={`border-b border-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-3 font-medium text-blue-900 text-sm">{admin.prenom} {admin.nom}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{admin.email}</td>
                    <td className="px-4 py-3">
                      <StatusBadge actif={admin.actif} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(admin.dateInscription)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {admin.actif ? (
                          <button
                            onClick={() => disableAdmin(admin)}
                            className="text-xs px-3 py-1 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-medium transition"
                          >
                            Désactiver
                          </button>
                        ) : (
                          <button
                            onClick={() => enableAdmin(admin)}
                            className="text-xs px-3 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium transition"
                          >
                            Réactiver
                          </button>
                        )}
                        <button
                          onClick={() => { setResetTarget(admin); setNewPassword(''); clearFeedback() }}
                          className="text-xs px-3 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium transition"
                        >
                          Reset mot de passe
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <form onSubmit={resetPassword} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-bold text-blue-900 mb-1">Réinitialiser le mot de passe</h2>
            <p className="text-sm text-gray-500 mb-4">{resetTarget.email}</p>
            <Input
              label="Nouveau mot de passe temporaire"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
            />
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => { setResetTarget(null); setNewPassword('') }}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-900 text-white hover:bg-blue-800 transition"
              >
                Réinitialiser
              </button>
            </div>
          </form>
        </div>
      )}
    </SuperAdminLayout>
  )
}

function formatCreationError(err, fallback) {
  if (err.response?.status === 401) return 'Session expirée. Reconnectez-vous.'
  if (err.response?.status === 403) return 'Action réservée au SUPER_ADMIN.'
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

function StatusBadge({ actif }) {
  const className = actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
  return (
    <span className={`text-xs px-3 py-0.5 rounded-full font-medium ${className}`}>
      {actif ? 'Actif' : 'Inactif'}
    </span>
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
