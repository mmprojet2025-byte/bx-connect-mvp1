import { useCallback, useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'
import { useTranslation } from 'react-i18next'
import StatusBadge from '../../components/StatusBadge'
import ActivityCover from '../../components/ActivityCover'

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
  const { t, i18n } = useTranslation()
  const [activites, setActivites] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingActivity, setEditingActivity] = useState(null)
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
      setError(t('referent.errorActivitiesLoad'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchActivites() }, [fetchActivites])

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingActivity(null)
    setShowForm(false)
  }

  const startEdit = (activite) => {
    setEditingActivity(activite)
    setForm({
      titre: activite.titre || '',
      description: activite.description || '',
      dateDebut: toDateTimeInput(activite.dateDebut),
      dateFin: toDateTimeInput(activite.dateFin),
      lieu: activite.lieu || '',
      gratuite: activite.gratuite ?? true,
      prix: activite.prix ?? '',
      capaciteMax: activite.capaciteMax ?? 0,
      categorie: activite.categorie || '',
      theme: activite.theme || '',
    })
    setMessage('')
    setError('')
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    const payload = {
      ...form,
      prix: form.gratuite ? null : Number(form.prix),
      capaciteMax: Number(form.capaciteMax) || 0,
    }

    try {
      if (editingActivity) {
        await api.put(`/activites/${editingActivity.id}`, payload)
        setMessage(t('referent.activityUpdated'))
      } else {
        await api.post('/activites', payload)
        setMessage(t('referent.activityCreated'))
      }
      resetForm()
      await fetchActivites()
    } catch {
      setError(editingActivity ? t('referent.errorActivityUpdate') : t('referent.errorActivityCreate'))
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
            <h1 className="text-2xl font-bold text-blue-900">{t('referent.activitiesTitle')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('referent.activitiesCount', { count: activites.length })}</p>
          </div>
          <button
            onClick={() => {
              if (showForm) {
                resetForm()
              } else {
                setShowForm(true)
              }
            }}
            className="bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
          >
            {showForm ? t('common.cancel') : t('referent.newActivity')}
          </button>
        </div>

        {message && <Alert>{message}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-5 mb-6 grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <h2 className="text-lg font-bold text-blue-900">
                {editingActivity ? t('referent.editActivity') : t('referent.newActivity')}
              </h2>
            </div>
            <Input label={t('activities.form_title')} value={form.titre} onChange={value => updateForm('titre', value)} required />
            <Input label={t('activities.form_place')} value={form.lieu} onChange={value => updateForm('lieu', value)} />
            <Input label={t('activities.start_date')} type="datetime-local" value={form.dateDebut} onChange={value => updateForm('dateDebut', value)} required />
            <Input label={t('activities.end_date')} type="datetime-local" value={form.dateFin} onChange={value => updateForm('dateFin', value)} required />
            <Input label={t('activities.form_category')} value={form.categorie} onChange={value => updateForm('categorie', value)} />
            <Input label={t('activities.form_theme')} value={form.theme} onChange={value => updateForm('theme', value)} />
            <Input label={t('activities.form_capacity')} type="number" min="0" value={form.capaciteMax} onChange={value => updateForm('capaciteMax', value)} />
            <label className="flex items-center gap-2 text-sm text-gray-700 pt-7">
              <input type="checkbox" checked={form.gratuite} onChange={e => updateForm('gratuite', e.target.checked)} />
              {t('activities.form_free')}
            </label>
            {!form.gratuite && (
              <Input label={t('activities.form_price')} type="number" min="0" value={form.prix} onChange={value => updateForm('prix', value)} />
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('activities.form_description')}</label>
              <textarea
                value={form.description}
                onChange={e => updateForm('description', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              {editingActivity && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="mr-3 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl transition"
                >
                  {t('common.cancelEdit')}
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="bg-teal-700 hover:bg-teal-600 disabled:bg-gray-300 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
              >
                {saving
                  ? t('common.saving')
                  : editingActivity
                    ? t('common.saveChanges')
                    : t('activities.create_btn')}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : activites.length === 0 ? (
          <EmptyState>{t('referent.noActivityCreated')}</EmptyState>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {activites.map(activite => (
              <article key={activite.id} className="bg-white rounded-2xl shadow overflow-hidden">
                <div className="relative">
                  <ActivityCover imageUrl={activite.imageUrl} title={activite.titre} className="h-36" />
                  <div className="absolute left-4 top-4">
                    <StatusBadge status={activite.statut}>{t(`statuses.${activite.statut}`, activite.statut)}</StatusBadge>
                  </div>
                </div>
                <div className="p-5">
                  <h2 className="font-bold text-blue-900 text-lg">{activite.titre}</h2>
                  {activite.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{activite.description}</p>}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-4">
                    <InfoPill label={t('activities.form_place')} value={activite.lieu || '—'} />
                    <InfoPill label={t('activities.start_date')} value={formatDate(activite.dateDebut, i18n.language)} />
                    <InfoPill
                      label={t('activities.form_price')}
                      value={activite.gratuite ? t('activities.free') : `${activite.prix} €`}
                    />
                    <InfoPill
                      label={t('activities.capacity')}
                      value={activite.capaciteMax > 0 ? t('activities.capacity_max', { count: activite.capaciteMax }) : t('activities.unlimited')}
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => startEdit(activite)}
                      className="border border-teal-200 text-teal-700 hover:bg-teal-50 text-sm font-semibold px-4 py-2 rounded-xl transition"
                    >
                      {t('common.edit')}
                    </button>
                  </div>
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

function InfoPill({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase text-gray-400">{label}</p>
      <p className="mt-0.5 font-semibold text-gray-700 truncate">{value}</p>
    </div>
  )
}

function formatDate(value, language = 'fr') {
  return value ? new Date(value).toLocaleDateString(language) : '-'
}

function toDateTimeInput(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 16)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}
