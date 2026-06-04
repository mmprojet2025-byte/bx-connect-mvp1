import { useCallback, useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'
import { useTranslation } from 'react-i18next'
import StatusBadge from '../../components/StatusBadge'
import ActivityCover from '../../components/ActivityCover'
import AppIcon from '../../components/ui/AppIcons'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'

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
  const [recherche, setRecherche] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')

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

  const activitesFiltrees = activites.filter(activite => {
    const texte = `${activite.titre || ''} ${activite.description || ''} ${activite.lieu || ''} ${activite.categorie || ''}`.toLowerCase()
    const matchRecherche = texte.includes(recherche.toLowerCase())
    const matchStatut = filtreStatut ? activite.statut === filtreStatut : true
    return matchRecherche && matchStatut
  })
  const statuts = [...new Set(activites.map(activite => activite.statut).filter(Boolean))]
  const stats = {
    total: activites.length,
    publiees: activites.filter(activite => activite.statut === 'PUBLIEE').length,
    brouillons: activites.filter(activite => activite.statut === 'BROUILLON').length,
    gratuites: activites.filter(activite => activite.gratuite).length,
  }

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
        <PageHeader
          eyebrow={t('nav.activities')}
          title={t('referent.activitiesTitle')}
          description={t('referent.activitiesCount', { count: activites.length })}
          action={(
            <button
              onClick={() => {
                if (showForm) {
                  resetForm()
                } else {
                  setShowForm(true)
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600"
            >
              <AppIcon name={showForm ? 'XCircle' : 'PlusCircle'} className="h-4 w-4" />
              {showForm ? t('common.cancel') : t('referent.newActivity')}
            </button>
          )}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon="Calendar" label={t('common.total', { defaultValue: 'Total' })} value={stats.total} tone="blue" />
          <StatCard icon="CheckCircle" label={t('statuses.PUBLIEE', { defaultValue: 'Publiées' })} value={stats.publiees} tone="green" />
          <StatCard icon="Clock" label={t('statuses.BROUILLON', { defaultValue: 'Brouillons' })} value={stats.brouillons} tone="amber" />
          <StatCard icon="Wallet" label={t('activities.free')} value={stats.gratuites} tone="violet" />
        </div>

        {message && <Alert>{message}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 grid rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:grid-cols-2 gap-4">
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
                  className="mr-3 inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <AppIcon name="XCircle" className="h-4 w-4" />
                  {t('common.cancelEdit')}
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:bg-gray-300"
              >
                <AppIcon name={editingActivity ? 'Save' : 'PlusCircle'} className="h-4 w-4" />
                {saving
                  ? t('common.saving')
                  : editingActivity
                    ? t('common.saveChanges')
                    : t('activities.create_btn')}
              </button>
            </div>
          </form>
        )}

        <SectionCard className="mb-6" title={t('common.filters', { defaultValue: 'Filtres' })}>
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <label className="relative block">
              <AppIcon name="Search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                placeholder={t('common.search', { defaultValue: 'Rechercher' })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </label>
            <select
              value={filtreStatut}
              onChange={e => setFiltreStatut(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">{t('common.all_statuses')}</option>
              {statuts.map(statut => <option key={statut} value={statut}>{t(`statuses.${statut}`, statut)}</option>)}
            </select>
          </div>
        </SectionCard>

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : activites.length === 0 ? (
          <EmptyState>{t('referent.noActivityCreated')}</EmptyState>
        ) : activitesFiltrees.length === 0 ? (
          <EmptyState>{t('common.noResults', { defaultValue: 'Aucun résultat trouvé.' })}</EmptyState>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {activitesFiltrees.map(activite => (
              <article key={activite.id} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
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
                      className="inline-flex items-center gap-2 rounded-2xl border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                    >
                      <AppIcon name="Edit" className="h-4 w-4" />
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

function StatCard({ icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  }
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${tones[tone] || tones.blue}`}>
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
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
