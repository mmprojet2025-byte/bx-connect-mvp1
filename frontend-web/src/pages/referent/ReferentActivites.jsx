import { useCallback, useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'

const emptyForm = {
  titre: '',
  description: '',
  dateDebut: '',
  dateFin: '',
  lieu: '',
  gratuite: true,
  prix: '',
  capaciteMax: 0,
  categorie: '',
  theme: '',
}

export default function ReferentActivites() {
  const [activites, setActivites] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchActivites = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/referent/mes-activites')
      setActivites(res.data)
      setError('')
    } catch {
      setError('Impossible de charger vos activités.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchActivites() }, [fetchActivites])

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await api.post('/activites', {
        ...form,
        prix: form.gratuite ? null : Number(form.prix),
        capaciteMax: Number(form.capaciteMax) || 0,
      })
      setForm(emptyForm)
      setShowForm(false)
      setMessage('Activité créée.')
      await fetchActivites()
    } catch {
      setError('Impossible de créer cette activité.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Activités de mes groupes</h1>
            <p className="text-sm text-gray-500 mt-1">{activites.length} activité(s)</p>
          </div>
          <button
            onClick={() => setShowForm(prev => !prev)}
            className="bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
          >
            {showForm ? 'Annuler' : 'Nouvelle activité'}
          </button>
        </div>

        {message && <Alert>{message}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow p-5 mb-6 grid md:grid-cols-2 gap-4">
            <Input label="Titre" value={form.titre} onChange={value => updateForm('titre', value)} required />
            <Input label="Lieu" value={form.lieu} onChange={value => updateForm('lieu', value)} />
            <Input label="Date début" type="datetime-local" value={form.dateDebut} onChange={value => updateForm('dateDebut', value)} required />
            <Input label="Date fin" type="datetime-local" value={form.dateFin} onChange={value => updateForm('dateFin', value)} required />
            <Input label="Catégorie" value={form.categorie} onChange={value => updateForm('categorie', value)} />
            <Input label="Thème" value={form.theme} onChange={value => updateForm('theme', value)} />
            <Input label="Capacité maximale" type="number" min="0" value={form.capaciteMax} onChange={value => updateForm('capaciteMax', value)} />
            <label className="flex items-center gap-2 text-sm text-gray-700 pt-7">
              <input type="checkbox" checked={form.gratuite} onChange={e => updateForm('gratuite', e.target.checked)} />
              Activité gratuite
            </label>
            {!form.gratuite && (
              <Input label="Prix" type="number" min="0" value={form.prix} onChange={value => updateForm('prix', value)} />
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => updateForm('description', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-teal-700 hover:bg-teal-600 disabled:bg-gray-300 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
              >
                {saving ? 'Création...' : 'Créer l’activité'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-400 text-center py-10">Chargement...</p>
        ) : activites.length === 0 ? (
          <EmptyState>Aucune activité créée.</EmptyState>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {activites.map(activite => (
              <article key={activite.id} className="bg-white rounded-2xl shadow p-5">
                <div className="flex justify-between gap-3">
                  <h2 className="font-bold text-blue-900">{activite.titre}</h2>
                  <span className="text-xs bg-teal-100 text-teal-700 rounded-full px-2 py-0.5 h-fit">{activite.statut}</span>
                </div>
                {activite.description && <p className="text-sm text-gray-500 mt-2">{activite.description}</p>}
                <div className="text-xs text-gray-400 mt-4 space-y-1">
                  {activite.lieu && <p>{activite.lieu}</p>}
                  {activite.dateDebut && <p>{formatDate(activite.dateDebut)}</p>}
                  <p>{activite.gratuite ? 'Gratuite' : `${activite.prix} €`}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', required = false, min }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-700 mb-1">{label}</span>
      <input
        type={type}
        min={min}
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
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

function EmptyState({ children }) {
  return <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400 text-sm">{children}</div>
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-BE') : '-'
}
