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
import ProjectTypeBadge from '../../components/ProjectTypeBadge'
import { userFriendlyError } from '../../utils/userFriendlyError'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import projectsIllustration from '../../assets/illustrations/projects.png'

const emptyForm = {
  titre: '',
  description: '',
  objectifs: '',
  budgetDemande: '',
  groupeId: '',
  visibilite: 'GROUPE',
}

const REVIEW_FILTERS = ['A_RELIRE', 'VALIDES_REFERENT', 'REFUSES_REFERENT', 'TOUS']

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
  const [editingProject, setEditingProject] = useState(null)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [filtreRelecture, setFiltreRelecture] = useState('A_RELIRE')
  const [decisionProject, setDecisionProject] = useState(null)
  const [decisionAction, setDecisionAction] = useState('')
  const [decisionComment, setDecisionComment] = useState('')
  const [decisionLoading, setDecisionLoading] = useState(false)

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

  const resetForm = () => {
    setForm(emptyForm)
    setEditingProject(null)
    setShowForm(false)
  }

  const openCreateForm = () => {
    setMessage('')
    setError('')
    setForm(emptyForm)
    setEditingProject(null)
    setShowForm(true)
  }

  const openEditForm = projet => {
    setMessage('')
    setError('')
    setEditingProject(projet)
    setForm({
      titre: projet.titre || '',
      description: projet.description || '',
      objectifs: projet.objectifs || '',
      budgetDemande: projet.budgetDemande ?? '',
      groupeId: projet.groupeId ?? '',
      visibilite: projet.visibilite || 'GROUPE',
    })
    setShowForm(true)
  }

  const enregistrerProjet = async event => {
    event.preventDefault()
    setCreating(true)
    setError('')
    setMessage('')
    const payload = {
      ...form,
      groupeId: Number(form.groupeId),
      budgetDemande: form.budgetDemande ? Number(form.budgetDemande) : null,
    }
    try {
      if (editingProject) {
        const response = await api.put(`/projets/referent/${editingProject.id}`, payload)
        setProjets(prev => prev.map(projet => projet.id === editingProject.id ? response.data : projet))
        setMessage(t('referent.projectUpdated', { defaultValue: 'Projet mis à jour.' }))
      } else {
        const response = await api.post('/projets', payload)
        await api.patch(`/projets/${response.data.id}/soumettre`)
        setMessage(t('projects.successSubmitted'))
        await fetchProjets()
      }
      resetForm()
    } catch (requestError) {
      const fallback = editingProject
        ? t('referent.errorProjectUpdate', { defaultValue: 'Impossible de modifier ce projet. Vérifiez qu’il appartient bien à l’un de vos groupes.' })
        : t('projects.error_submit')
      setError(requestError?.response?.status === 403
        ? t('referent.errorProjectForbidden', { defaultValue: 'Vous ne pouvez modifier que les projets des groupes que vous encadrez.' })
        : userFriendlyError(requestError, fallback))
    } finally {
      setCreating(false)
    }
  }

  const openDecision = (projet, action) => {
    setMessage('')
    setError('')
    setDecisionProject(projet)
    setDecisionAction(action)
    setDecisionComment(projet.commentaireReferent || '')
  }

  const closeDecision = () => {
    setDecisionProject(null)
    setDecisionAction('')
    setDecisionComment('')
  }

  const submitDecision = async event => {
    event.preventDefault()
    if (!decisionProject || !decisionAction) return
    setDecisionLoading(true)
    setError('')
    setMessage('')
    const encodedComment = encodeURIComponent(decisionComment.trim())
    const endpoint = `/projets/referent/${decisionProject.id}/${decisionAction}${encodedComment ? `?commentaire=${encodedComment}` : ''}`
    try {
      const response = await api.patch(endpoint)
      setProjets(current => current.map(projet => projet.id === decisionProject.id ? response.data : projet))
      setMessage(decisionAction === 'valider'
        ? t('referent.projectValidatedForAdmin')
        : t('referent.projectRejectedByReferent'))
      closeDecision()
    } catch (requestError) {
      setError(requestError?.response?.status === 403
        ? t('referent.errorProjectForbidden')
        : userFriendlyError(requestError, t('referent.errorProjectDecision')))
    } finally {
      setDecisionLoading(false)
    }
  }

  const projetsFiltres = projets.filter(projet => {
    const texte = `${projet.titre || ''} ${projet.description || ''} ${projet.groupeNom || ''} ${projet.porteurPrenom || ''} ${projet.porteurNom || ''}`.toLowerCase()
    const matchRecherche = texte.includes(recherche.toLowerCase())
    const matchStatut = filtreStatut ? projet.statut === filtreStatut : true
    const matchRelecture = matchesReviewFilter(projet, filtreRelecture)
    return matchRecherche && matchStatut && matchRelecture
  })
  const statuts = [...new Set(projets.map(projet => projet.statut).filter(Boolean))]
  const nombreGroupes = new Set(projets.map(projet => projet.groupeNom).filter(Boolean)).size
  const groupesModifiables = new Set(groupes.map(groupe => Number(groupe.id)))
  const reviewCounts = {
    A_RELIRE: projets.filter(projet => projet.statut === 'SOUMIS').length,
    VALIDES_REFERENT: projets.filter(projet => projet.statut === 'VALIDE_REFERENT').length,
    REFUSES_REFERENT: projets.filter(projet => projet.statut === 'REFUSE_REFERENT').length,
    TOUS: projets.length,
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <PageHeader
          eyebrow={t('nav.projects')}
          title={t('referent.projectsTitle')}
          description={t('referent.projectsSubtitle')}
          action={(
            <div className="flex flex-col items-center gap-3">
              <img
                src={projectsIllustration}
                alt=""
                className="w-[200px] object-contain md:w-[300px]"
              />
              <button
                type="button"
                onClick={showForm ? resetForm : openCreateForm}
                disabled={groupes.length === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:bg-slate-300"
              >
                <AppIcon name={showForm ? 'XCircle' : 'PlusCircle'} className="h-4 w-4" />
                {showForm ? t('common.cancel') : t('projects.new_project')}
              </button>
            </div>
          )}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon="Rocket" label={t('common.total', { defaultValue: 'Total' })} value={projets.length} tone="blue" />
          <StatCard icon="Folder" label={t('nav.myGroups')} value={nombreGroupes} tone="green" />
          <StatCard icon="Search" label={t('common.results', { defaultValue: 'Résultats' })} value={projetsFiltres.length} tone="amber" />
        </div>

        {error && projets.length > 0 && <Alert type="error">{error}</Alert>}
        {message && <Alert>{message}</Alert>}

        {showForm && (
          <SectionCard className="mb-6" title={editingProject ? t('referent.editProject', { defaultValue: 'Modifier le projet' }) : t('projects.new_title')}>
            <form onSubmit={enregistrerProjet} className="grid gap-4 md:grid-cols-2">
              {editingProject && (
                <div className="md:col-span-2 flex items-center justify-between gap-3 rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-800">
                  <span className="font-semibold">{editingProject.titre}</span>
                  <button type="button" onClick={resetForm} className="font-bold text-teal-700 hover:text-teal-900">
                    {t('common.cancelEdit', { defaultValue: 'Annuler la modification' })}
                  </button>
                </div>
              )}
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
                  <AppIcon name={editingProject ? 'Save' : 'PlusCircle'} className="h-4 w-4" />
                  {creating
                    ? t('common.saving', { defaultValue: 'Enregistrement...' })
                    : editingProject
                      ? t('common.saveChanges', { defaultValue: 'Enregistrer les modifications' })
                      : t('projects.submit_project')}
                </button>
              </div>
            </form>
          </SectionCard>
        )}

        <SectionCard className="mb-6" title={t('referent.projectReviewTitle')} subtitle={t('referent.projectReviewSubtitle')}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {REVIEW_FILTERS.map(filter => (
              <button
                key={filter}
                type="button"
                onClick={() => setFiltreRelecture(filter)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  filtreRelecture === filter
                    ? 'border-teal-200 bg-teal-50 text-teal-900 shadow-sm'
                    : 'border-slate-100 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="block text-2xl font-black">{reviewCounts[filter]}</span>
                <span className="mt-1 block text-xs font-bold uppercase tracking-wide">
                  {t(`referent.projectReviewFilters.${filter}`)}
                </span>
              </button>
            ))}
          </div>
        </SectionCard>

        {decisionProject && (
          <SectionCard
            className="mb-6 border-teal-100"
            title={decisionAction === 'valider' ? t('referent.validateForAdmin') : t('referent.refuseWithComment')}
            subtitle={decisionProject.titre}
          >
            <form onSubmit={submitDecision} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">{t('referent.referentComment')}</span>
                <textarea
                  value={decisionComment}
                  onChange={event => setDecisionComment(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  placeholder={t('referent.referentCommentPlaceholder')}
                />
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDecision}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={decisionLoading}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${
                    decisionAction === 'valider' ? 'bg-teal-700 hover:bg-teal-600' : 'bg-red-700 hover:bg-red-600'
                  }`}
                >
                  {decisionLoading ? t('common.saving') : decisionAction === 'valider' ? t('referent.validateForAdmin') : t('referent.refuseWithComment')}
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
          <LoadingState label={t('common.loading')} />
        ) : error && projets.length === 0 ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error || t('common.loadErrorDescription')}
            actionLabel={t('common.retry')}
            action={fetchProjets}
          />
        ) : projets.length === 0 ? (
          <EmptyState
            icon="Rocket"
            title={t('referent.noProjects')}
            description={t('projects.no_projects')}
          />
        ) : projetsFiltres.length === 0 ? (
          <EmptyState
            icon="Search"
            title={t('common.noResults', { defaultValue: 'Aucun résultat trouvé.' })}
          />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {projetsFiltres.map(projet => (
              <article key={projet.id} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative">
                  <ProjectCover imageUrl={projet.imageUrl} title={projet.titre} className="h-40" />
                  <div className="absolute left-4 top-4">
                    <StatusBadge status={projet.statut}>
                      {projectStatusLabel(projet.statut, t)}
                    </StatusBadge>
                  </div>
                </div>
                <div className="p-5">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <ProjectTypeBadge groupName={projet.groupeNom} />
                      <ProjectVisibilityBadge visibility={projet.visibilite} />
                    </div>
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
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span className="font-bold text-slate-800">{t('referent.projectWorkflowState')}</span>
                  <span className="mt-1 block">{projectWorkflowHint(projet.statut, t)}</span>
                  {projet.commentaireReferent && (
                    <span className="mt-2 block text-slate-500">
                      <strong>{t('referent.referentComment')} :</strong> {projet.commentaireReferent}
                    </span>
                  )}
                </div>
                {projet.statut === 'SOUMIS' && groupesModifiables.has(Number(projet.groupeId)) && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => openDecision(projet, 'valider')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-teal-600"
                    >
                      <AppIcon name="CheckCircle" className="h-4 w-4" />
                      {t('referent.validateForAdmin')}
                    </button>
                    <button
                      type="button"
                      onClick={() => openDecision(projet, 'refuser')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                    >
                      <AppIcon name="XCircle" className="h-4 w-4" />
                      {t('referent.refuseWithComment')}
                    </button>
                  </div>
                )}
                {groupesModifiables.has(Number(projet.groupeId)) && (
                  <button
                    type="button"
                    onClick={() => openEditForm(projet)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-bold text-teal-800 transition hover:bg-teal-100"
                  >
                    <AppIcon name="Pencil" className="h-4 w-4" />
                    {t('common.edit', { defaultValue: 'Modifier' })}
                  </button>
                )}
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

function formatOwner(projet, t) {
  const owner = [projet.porteurPrenom, projet.porteurNom].filter(Boolean).join(' ')
  return owner || t('referent.projectOwnerUnknown')
}

function formatDate(value, language = 'fr') {
  return value ? new Date(value).toLocaleDateString(language) : '-'
}

function matchesReviewFilter(projet, filter) {
  if (filter === 'A_RELIRE') return projet.statut === 'SOUMIS'
  if (filter === 'VALIDES_REFERENT') return projet.statut === 'VALIDE_REFERENT'
  if (filter === 'REFUSES_REFERENT') return projet.statut === 'REFUSE_REFERENT'
  return true
}

function projectStatusLabel(status, t) {
  if (status === 'SOUMIS') return t('referent.statusSubmittedToReferent')
  if (status === 'VALIDE_REFERENT') return t('referent.statusValidatedByReferent')
  if (status === 'REFUSE_REFERENT') return t('referent.statusRejectedByReferent')
  if (status === 'APPROUVE') return t('referent.statusApprovedByAdmin')
  if (status === 'REJETE') return t('referent.statusRejectedByAdmin')
  return t(`statuses.${status}`, { defaultValue: status })
}

function projectWorkflowHint(status, t) {
  if (status === 'SOUMIS') return t('referent.workflowSubmittedToReferent')
  if (status === 'VALIDE_REFERENT') return t('referent.workflowWaitingAdmin')
  if (status === 'REFUSE_REFERENT') return t('referent.workflowRejectedByReferent')
  if (status === 'APPROUVE') return t('referent.workflowApprovedByAdmin')
  if (status === 'REJETE') return t('referent.workflowRejectedByAdmin')
  return t('referent.workflowGeneric')
}
