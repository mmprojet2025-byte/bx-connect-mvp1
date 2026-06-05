import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'
import StatusBadge from '../../components/StatusBadge'
import ProjectCover from '../../components/ProjectCover'
import AppIcon from '../../components/ui/AppIcons'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import ProjectVisibilityBadge from '../../components/ProjectVisibilityBadge'
import { userFriendlyError } from '../../utils/userFriendlyError'

const emptyForm = {
  titre: '',
  description: '',
  objectifs: '',
  budgetDemande: '',
  groupeId: '',
  visibilite: 'GROUPE',
}

export default function ReferentProjets() {
  const { t, i18n } = useTranslation()
  const [projets, setProjets] = useState([])
  const [groupes, setGroupes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recherche, setRecherche] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(emptyForm)

  const fetchProjets = useCallback(async () => {
    setLoading(true)
    try {
      const [projetsRes, groupesRes] = await Promise.all([
        api.get('/projets/referent/mes-groupes'),
        api.get('/referent/groupes'),
      ])
      setProjets(Array.isArray(projetsRes.data) ? projetsRes.data : [])
      setGroupes(Array.isArray(groupesRes.data) ? groupesRes.data : [])
      setError('')
    } catch {
      setError(t('referent.errorProjectsLoad'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchProjets() }, [fetchProjets])

  const creerProjet = async event => {
    event.preventDefault()
    setCreating(true)
    setError('')
    setMessage('')
    try {
      const response = await api.post('/projets', {
        ...form,
        groupeId: Number(form.groupeId),
        budgetDemande: form.budgetDemande ? Number(form.budgetDemande) : null,
      })
      await api.patch(`/projets/${response.data.id}/soumettre`)
      setMessage(t('projects.successSubmitted'))
      setForm(emptyForm)
      setShowForm(false)
      await fetchProjets()
    } catch (requestError) {
      setError(userFriendlyError(requestError, t('projects.error_submit')))
    } finally {
      setCreating(false)
    }
  }

  const projetsFiltres = projets.filter(projet => {
    const texte = `${projet.titre || ''} ${projet.description || ''} ${projet.groupeNom || ''} ${projet.porteurPrenom || ''} ${projet.porteurNom || ''}`.toLowerCase()
    const matchRecherche = texte.includes(recherche.toLowerCase())
    const matchStatut = filtreStatut ? projet.statut === filtreStatut : true
    return matchRecherche && matchStatut
  })
  const statuts = [...new Set(projets.map(projet => projet.statut).filter(Boolean))]
  const nombreGroupes = new Set(projets.map(projet => projet.groupeNom).filter(Boolean)).size

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <PageHeader
          eyebrow={t('nav.projects')}
          title={t('referent.projectsTitle')}
          description={t('referent.projectsSubtitle')}
          action={(
            <button
              type="button"
              onClick={() => setShowForm(value => !value)}
              disabled={groupes.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:bg-slate-300"
            >
              <AppIcon name={showForm ? 'XCircle' : 'PlusCircle'} className="h-4 w-4" />
              {showForm ? t('common.cancel') : t('projects.new_project')}
            </button>
          )}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon="Rocket" label={t('common.total', { defaultValue: 'Total' })} value={projets.length} tone="blue" />
          <StatCard icon="Folder" label={t('nav.myGroups')} value={nombreGroupes} tone="green" />
          <StatCard icon="Search" label={t('common.results', { defaultValue: 'Résultats' })} value={projetsFiltres.length} tone="amber" />
        </div>

        {error && <Alert type="error">{error}</Alert>}
        {message && <Alert>{message}</Alert>}

        {showForm && (
          <SectionCard className="mb-6" title={t('projects.new_title')}>
            <form onSubmit={creerProjet} className="grid gap-4 md:grid-cols-2">
              <Input label={t('projects.form_title')} value={form.titre} onChange={value => setForm({ ...form, titre: value })} required />
              <Input label={t('projects.form_budget')} value={form.budgetDemande} onChange={value => setForm({ ...form, budgetDemande: value })} type="number" min="0" />
              <Select
                label={t('projects.group')}
                value={form.groupeId}
                onChange={value => setForm({ ...form, groupeId: value })}
                options={groupes.map(groupe => ({ value: groupe.id, label: groupe.nom }))}
                required
              />
              <Select
                label={t('projects.visibility')}
                value={form.visibilite}
                onChange={value => setForm({ ...form, visibilite: value })}
                options={['GROUPE', 'COMMUNAUTE'].map(value => ({
                  value,
                  label: t(`projectVisibility.${value}`),
                }))}
                required
              />
              <label className="md:col-span-2">
                <span className="block text-sm font-semibold text-gray-700 mb-1">{t('projects.form_description')}</span>
                <textarea
                  value={form.description}
                  onChange={event => setForm({ ...form, description: event.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </label>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={creating || !form.groupeId}
                  className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:bg-slate-300"
                >
                  <AppIcon name="PlusCircle" className="h-4 w-4" />
                  {creating ? t('common.creating') : t('projects.submit_project')}
                </button>
              </div>
            </form>
          </SectionCard>
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
        ) : projets.length === 0 ? (
          <EmptyState>{t('referent.noProjects')}</EmptyState>
        ) : projetsFiltres.length === 0 ? (
          <EmptyState>{t('common.noResults', { defaultValue: 'Aucun résultat trouvé.' })}</EmptyState>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {projetsFiltres.map(projet => (
              <article key={projet.id} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative">
                  <ProjectCover imageUrl={projet.imageUrl} title={projet.titre} className="h-40" />
                  <div className="absolute left-4 top-4">
                    <StatusBadge status={projet.statut}>
                      {t(`statuses.${projet.statut}`, projet.statut)}
                    </StatusBadge>
                  </div>
                </div>
                <div className="p-5">
                  <div>
                    <ProjectVisibilityBadge visibility={projet.visibilite} className="mb-2" />
                    <h2 className="font-bold text-blue-900 text-lg leading-tight">{projet.titre}</h2>
                    {projet.groupeNom && (
                      <p className="text-xs text-blue-700 font-semibold mt-1">{t('referent.projectGroup', { group: projet.groupeNom })}</p>
                    )}
                  </div>

                  {projet.description && <p className="text-sm text-gray-500 mt-3 line-clamp-3">{projet.description}</p>}

                <dl className="text-xs text-gray-500 mt-4 grid gap-2">
                  <InfoLine label={t('referent.projectOwner')} value={formatOwner(projet, t)} />
                  <InfoLine label={t('referent.projectDate')} value={formatDate(projet.dateSoumission || projet.dateCreation, i18n.language)} />
                  {projet.budgetDemande != null && (
                    <InfoLine label={t('projects.form_budget')} value={`${projet.budgetDemande} €`} />
                  )}
                </dl>
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

function InfoLine({ label, value }) {
  if (!value) return null
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <dt className="text-[10px] font-semibold uppercase text-gray-400">{label}</dt>
      <dd className="mt-0.5 font-semibold text-gray-700 truncate">{value}</dd>
    </div>
  )
}

function StatCard({ icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  }
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${tones[tone] || tones.blue}`}>
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  )
}

function Alert({ type, children }) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-green-50 border-green-200 text-green-700'

  return <div className={`border px-4 py-3 rounded-xl mb-5 text-sm ${styles}`}>{children}</div>
}

function Input({ label, value, onChange, type = 'text', required = false, min }) {
  return (
    <label>
      <span className="block text-sm font-semibold text-gray-700 mb-1">{label}</span>
      <input
        type={type}
        min={min}
        required={required}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
      />
    </label>
  )
}

function Select({ label, value, onChange, options, required = false }) {
  return (
    <label>
      <span className="block text-sm font-semibold text-gray-700 mb-1">{label}</span>
      <select
        value={value}
        required={required}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
      >
        <option value="">{label}</option>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function EmptyState({ children }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-gray-400 shadow-sm">
      <AppIcon name="Rocket" className="mx-auto mb-3 h-10 w-10 text-teal-200" />
      <p className="text-sm">{children}</p>
    </div>
  )
}

function formatOwner(projet, t) {
  const owner = [projet.porteurPrenom, projet.porteurNom].filter(Boolean).join(' ')
  return owner || t('referent.projectOwnerUnknown')
}

function formatDate(value, language = 'fr') {
  return value ? new Date(value).toLocaleDateString(language) : '-'
}
