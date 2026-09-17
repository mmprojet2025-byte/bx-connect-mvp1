import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/StatusBadge'
import ProjectCover from '../../components/ProjectCover'
import { userFriendlyError } from '../../utils/userFriendlyError'
import PageHeader from '../../components/ui/PageHeader'
import ProjectVisibilityBadge from '../../components/ProjectVisibilityBadge'
import ProjectTypeBadge from '../../components/ProjectTypeBadge'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import AppIcon from '../../components/ui/AppIcons'

const MEMBER_VISIBILITIES = ['GROUPE', 'COMMUNAUTE']
const PROJECT_VISIBILITIES = ['GROUPE', 'COMMUNAUTE', 'PARTENAIRES', 'PUBLIC']
const PROJECT_STAGES = [
  { id: 'PREPARATION', statuses: ['BROUILLON'], icon: 'PlusCircle' },
  { id: 'REFERENT_REVIEW', statuses: ['SOUMIS'], icon: 'Shield' },
  { id: 'ASSOCIATION_DECISION', statuses: ['VALIDE_REFERENT'], icon: 'CheckCircle' },
  { id: 'DELIVERY', statuses: ['APPROUVE', 'EN_COURS'], icon: 'Activity' },
  { id: 'COMPLETED', statuses: ['TERMINE'], icon: 'Rocket' },
]

export default function Projets() {
  const { isAuthenticated, isMembre, isAdmin, isPartenaire } = useAuth()
  const { id: focusedProjectId } = useParams()
  const { t } = useTranslation()
  const [projets, setProjets] = useState([])
  const [adhesions, setAdhesions] = useState([])
  const [adhesionsLoading, setAdhesionsLoading] = useState(isAuthenticated && isMembre)
  const [adhesionsError, setAdhesionsError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [filtreGroupe, setFiltreGroupe] = useState('')
  const [filtreVisibilite, setFiltreVisibilite] = useState('')
  const [expandedProjectId, setExpandedProjectId] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [participationIds, setParticipationIds] = useState([])
  const [commentsByProject, setCommentsByProject] = useState({})
  const [commentsLoading, setCommentsLoading] = useState(null)
  const [commentDrafts, setCommentDrafts] = useState({})
  const [form, setForm] = useState({
    titre: '',
    description: '',
    budgetDemande: '',
    visibilite: 'GROUPE',
  })

  const fetchProjets = useCallback(async () => {
    setLoading(true)
    try {
      const endpoint = isAdmin
        ? '/projets/admin/tous'
        : isPartenaire
          ? '/partenaire/projets-ouverts'
          : '/projets'
      const [res, ownRes] = await Promise.all([
        api.get(endpoint),
        isAuthenticated && !isPartenaire ? api.get('/projets/mes-projets') : Promise.resolve({ data: [] }),
      ])
      const ownIds = new Set((ownRes.data || []).map(projet => String(projet.id)))
      setProjets((res.data || []).map(projet => ({
        ...projet,
        estPorteurConnecte: ownIds.has(String(projet.id)),
      })))
      setError('')
    } catch {
      setError(t('projects.error_load'))
    } finally {
      setLoading(false)
    }
  }, [isAdmin, isAuthenticated, isPartenaire, t])

  const fetchAdhesions = useCallback(async () => {
    setAdhesionsLoading(true)
    try {
      const res = await api.get('/groupes/mes-adhesions')
      setAdhesions(res.data)
      setAdhesionsError('')
    } catch {
      setAdhesions([])
      setAdhesionsError(t('groups.error_load'))
    } finally {
      setAdhesionsLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchProjets()
  }, [fetchProjets])

  useEffect(() => {
    if (!isAuthenticated || !isMembre) return
    api.get('/projets/mes-participations')
      .then(res => setParticipationIds((res.data || []).map(projet => projet.id)))
      .catch(() => setParticipationIds([]))
  }, [isAuthenticated, isMembre])

  useEffect(() => {
    if (isAuthenticated && isMembre) fetchAdhesions()
  }, [fetchAdhesions, isAuthenticated, isMembre])

  const groupeActif = useMemo(
    () => adhesions.find(adhesion => adhesion.statut === 'ACCEPTE'),
    [adhesions]
  )

  const peutProposer = isAuthenticated && isMembre && !!groupeActif
  const groupesDisponibles = useMemo(
    () => [...new Set(projets.map(projet => projet.groupeNom).filter(Boolean))],
    [projets]
  )
  const afficherFiltres = !isMembre || !!groupeActif
  const projetsFiltres = useMemo(() => {
    return projets.filter(projet => {
      if (focusedProjectId && String(projet.id) !== String(focusedProjectId)) return false
      const texte = [
        projet.titre,
        projet.description,
        projet.groupeNom,
        projet.porteurPrenom,
        projet.porteurNom,
      ].filter(Boolean).join(' ').toLowerCase()
      const matchRecherche = texte.includes(recherche.trim().toLowerCase())
      const etapeSelectionnee = PROJECT_STAGES.find(etape => etape.id === filtreStatut)
      const matchStatut = etapeSelectionnee ? etapeSelectionnee.statuses.includes(projet.statut) : true
      const matchGroupe = filtreGroupe ? projet.groupeNom === filtreGroupe : true
      const matchVisibilite = filtreVisibilite ? projet.visibilite === filtreVisibilite : true
      return matchRecherche && matchStatut && matchGroupe && matchVisibilite
    })
  }, [filtreGroupe, filtreStatut, filtreVisibilite, focusedProjectId, projets, recherche])

  useEffect(() => {
    if (focusedProjectId) setExpandedProjectId(Number(focusedProjectId))
  }, [focusedProjectId])

  useEffect(() => {
    if (!expandedProjectId || commentsByProject[expandedProjectId]) return
    fetchProjectComments(expandedProjectId)
  }, [commentsByProject, expandedProjectId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    try {
      const payload = {
        ...form,
        budgetDemande: parseFloat(form.budgetDemande) || 0,
        groupeId: groupeActif?.groupeId,
      }
      if (editingProject) {
        await api.put(`/projets/${editingProject.id}`, payload)
      } else {
        await api.post('/projets', payload)
      }
      const feedback = editingProject
        ? t('projects.projectUpdated', { defaultValue: 'Projet mis à jour.' })
        : t('projects.draftCreated')
      setMessage(feedback)
      toast.success(feedback)
      setShowForm(false)
      setEditingProject(null)
      setForm({ titre: '', description: '', budgetDemande: '', visibilite: 'GROUPE' })
      await fetchProjets()
    } catch (err) {
      const feedback = userFriendlyError(err, t('projects.error_submit'))
      setError(feedback)
      toast.error(feedback)
    }
  }

  const openProjectForm = (projet = null) => {
    setEditingProject(projet)
    setForm(projet ? {
      titre: projet.titre || '',
      description: projet.description || '',
      budgetDemande: projet.budgetDemande ?? '',
      visibilite: projet.visibilite || 'GROUPE',
    } : { titre: '', description: '', budgetDemande: '', visibilite: 'GROUPE' })
    setShowForm(true)
  }

  const closeProjectForm = () => {
    setShowForm(false)
    setEditingProject(null)
    setForm({ titre: '', description: '', budgetDemande: '', visibilite: 'GROUPE' })
  }

  const handleFollow = (projet) => {
    toast(t('projects.followUnavailable', {
      title: projet.titre,
      defaultValue: 'Vous participez déjà à ce projet. Les nouvelles interactions apparaîtront dans vos notifications.',
    }))
  }

  const handleSubmitDraft = async projet => {
    setActionLoading(`${projet.id}-SUBMIT`)
    setError('')
    try {
      const response = await api.patch(`/projets/${projet.id}/soumettre`)
      const feedback = t(`projects.submissionResult.${response.data.statut}`)
      setMessage(feedback)
      toast.success(feedback)
      await fetchProjets()
    } catch (err) {
      const feedback = userFriendlyError(err, t('projects.error_submit'))
      setError(feedback)
      toast.error(feedback)
    } finally {
      setActionLoading(null)
    }
  }

  const handleJoinProject = async (projet) => {
    setActionLoading(`${projet.id}-JOIN`)
    setError('')
    setMessage('')
    try {
      await api.post(`/projets/${projet.id}/rejoindre`)
      setParticipationIds(current => current.includes(projet.id) ? current : [...current, projet.id])
      setProjets(current => current.map(item => item.id === projet.id
        ? { ...item, nombreParticipants: Number(item.nombreParticipants || 0) + 1 }
        : item
      ))
      const feedback = t('projects.joined', { defaultValue: 'Vous participez maintenant à ce projet.' })
      setMessage(feedback)
      toast.success(feedback)
    } catch (err) {
      const feedback = userFriendlyError(err, t('projects.joinError', { defaultValue: 'Impossible de rejoindre ce projet.' }))
      setError(feedback)
      toast.error(feedback)
    } finally {
      setActionLoading(null)
    }
  }

  const fetchProjectComments = async (projectId) => {
    setCommentsLoading(projectId)
    try {
      const res = await api.get(`/projets/${projectId}/commentaires`)
      setCommentsByProject(current => ({ ...current, [projectId]: res.data || [] }))
    } catch {
      setCommentsByProject(current => ({ ...current, [projectId]: [] }))
    } finally {
      setCommentsLoading(null)
    }
  }

  const handleCommentSubmit = async (projet) => {
    const contenu = (commentDrafts[projet.id] || '').trim()
    if (!contenu) return
    setActionLoading(`${projet.id}-COMMENT`)
    try {
      const res = await api.post(`/projets/${projet.id}/commentaires`, { contenu })
      setCommentsByProject(current => ({
        ...current,
        [projet.id]: [...(current[projet.id] || []), res.data],
      }))
      setCommentDrafts(current => ({ ...current, [projet.id]: '' }))
      setProjets(current => current.map(item => item.id === projet.id
        ? { ...item, nombreCommentaires: Number(item.nombreCommentaires || 0) + 1 }
        : item
      ))
      toast.success(t('projects.commentAdded', { defaultValue: 'Commentaire ajouté.' }))
    } catch (err) {
      toast.error(userFriendlyError(err, t('projects.commentError', { defaultValue: 'Impossible d’ajouter le commentaire.' })))
    } finally {
      setActionLoading(null)
    }
  }

  const resetFilters = () => {
    setRecherche('')
    setFiltreStatut('')
    setFiltreGroupe('')
    setFiltreVisibilite('')
  }

  const focusedProjectMissing = focusedProjectId && !loading && !error && !projets.some(projet => String(projet.id) === String(focusedProjectId))

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <PageHeader
          eyebrow={t('ux.projects.eyebrow')}
          title={t('ux.projects.title')}
          description={t('ux.projects.intro')}
          action={isMembre && peutProposer && (
            <button
              type="button"
              onClick={() => showForm ? closeProjectForm() : openProjectForm()}
              disabled={!peutProposer}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 disabled:text-slate-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              {showForm ? t('common.cancel') : t('ux.projects.propose')}
            </button>
          )}
        />

        {message && <Alert>{message}</Alert>}
        {error && projets.length > 0 && (
          <Alert type="error">
            <span>{error}</span>{' '}
            <button type="button" onClick={fetchProjets} className="font-black underline">
              {t('common.retry')}
            </button>
          </Alert>
        )}
        {adhesionsError && isMembre && projets.length > 0 && (
          <Alert type="error">
            <span>{adhesionsError}</span>{' '}
            <button type="button" onClick={fetchAdhesions} className="font-black underline">
              {t('common.retry')}
            </button>
          </Alert>
        )}

        {focusedProjectId && (
          <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
            <AppIcon name="Search" className="mr-2 inline h-4 w-4" />
            {t('projects.focusedProject', { id: focusedProjectId, defaultValue: `Projet ciblé #${focusedProjectId}` })}
            <Link to="/projets" className="ml-3 underline">{t('common.showAll', { defaultValue: 'Voir tous' })}</Link>
          </div>
        )}

        <WorkflowStepper
          projets={projets}
          activeStatus={filtreStatut}
          onSelectStatus={setFiltreStatut}
          t={t}
        />

        {afficherFiltres && <section className="mb-5 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-950">{t('common.filters', { defaultValue: 'Filtres' })}</h2>
              <p className="text-xs text-slate-500">
                {t('projects.filteredCount', { count: projetsFiltres.length, total: projets.length, defaultValue: `${projetsFiltres.length}/${projets.length} projet(s) affiché(s)` })}
              </p>
            </div>
            <button type="button" onClick={resetFilters} className="text-xs font-bold text-blue-700 hover:underline">
              {t('activities.reset_filters', { defaultValue: 'Réinitialiser' })}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="search"
              value={recherche}
              onChange={event => setRecherche(event.target.value)}
              placeholder={t('projects.searchPlaceholder', { defaultValue: 'Rechercher un projet...' })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <select value={filtreGroupe} onChange={event => setFiltreGroupe(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">{t('projects.allGroups', { defaultValue: 'Tous les groupes' })}</option>
              {groupesDisponibles.map(groupe => <option key={groupe} value={groupe}>{groupe}</option>)}
            </select>
            <select value={filtreVisibilite} onChange={event => setFiltreVisibilite(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">{t('projects.allVisibilities', { defaultValue: 'Toutes les visibilités' })}</option>
              {PROJECT_VISIBILITIES.map(visibilite => <option key={visibilite} value={visibilite}>{t(`projectVisibility.${visibilite}`, { defaultValue: visibilite })}</option>)}
            </select>
          </div>
        </section>}

        {showForm && (peutProposer || editingProject) && (
          <section className="bg-white rounded-xl border border-slate-100 shadow-lg shadow-slate-900/5 p-5 mb-6">
            <h2 className="text-lg font-bold text-slate-950 mb-4">
              {editingProject ? t('common.edit') : t('ux.projects.new')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input id="project-title" label={t('projects.form_title')} value={form.titre} onChange={value => setForm({ ...form, titre: value })} required />
              <div>
                <label htmlFor="project-description" className="block text-sm font-medium text-slate-700 mb-1">{t('projects.form_description')}</label>
                <textarea
                  id="project-description"
                  required
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-vertical"
                />
              </div>
              <Input id="project-budget" label={t('projects.form_budget')} value={form.budgetDemande} onChange={value => setForm({ ...form, budgetDemande: value })} type="number" min="0" />
              <VisibilitySelect
                value={form.visibilite}
                options={MEMBER_VISIBILITIES}
                onChange={value => setForm({ ...form, visibilite: value })}
                t={t}
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition">
                {editingProject ? t('common.save', { defaultValue: 'Enregistrer' }) : t('projects.submit_project')}
              </button>
            </form>
          </section>
        )}

        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : error && projets.length === 0 ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error || t('common.loadErrorDescription')}
            actionLabel={t('common.retry')}
            action={fetchProjets}
          />
        ) : focusedProjectMissing ? (
          <EmptyState
            icon="Search"
            title={t('projects.projectNotFoundTitle')}
            description={t('projects.projectNotFoundDesc')}
            actionLabel={t('common.showAll', { defaultValue: 'Voir tous' })}
            actionTo="/projets"
          />
        ) : projets.length === 0 && isMembre && adhesionsLoading ? (
          <LoadingState label={t('common.loading')} />
        ) : projets.length === 0 && isMembre && adhesionsError ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={adhesionsError}
            actionLabel={t('common.retry')}
            action={fetchAdhesions}
          />
        ) : projets.length === 0 && isMembre && !groupeActif ? (
          <EmptyState
            icon="Users"
            title={t('projects.emptyNoGroupTitle')}
            description={t('projects.emptyNoGroupDescription')}
            actionLabel={t('groups.view_groups')}
            actionTo="/groupes"
          />
        ) : projets.length === 0 ? (
          <EmptyState
            icon="Rocket"
            title={t('projects.emptyWithGroupTitle')}
            description={t('projects.emptyWithGroupDescription')}
            actionLabel={peutProposer ? t('ux.projects.propose') : undefined}
            action={peutProposer ? () => openProjectForm() : undefined}
          />
        ) : projetsFiltres.length === 0 ? (
          <EmptyState
            icon="Search"
            title={t('projects.noFilteredProjects')}
            description={t('projects.noFilteredProjectsDesc')}
            actionLabel={t('activities.reset_filters', { defaultValue: 'Réinitialiser' })}
            action={resetFilters}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projetsFiltres.map(projet => (
              <ProjectCard
                key={projet.id}
                projet={projet}
                isAuthenticated={isAuthenticated}
                isMembre={isMembre}
                isPartenaire={isPartenaire}
                expanded={expandedProjectId === projet.id}
                actionLoading={actionLoading}
                isParticipant={participationIds.includes(projet.id)}
                comments={commentsByProject[projet.id] || []}
                commentsLoading={commentsLoading === projet.id}
                commentDraft={commentDrafts[projet.id] || ''}
                onToggleDetails={() => setExpandedProjectId(current => current === projet.id ? null : projet.id)}
                onFollow={() => handleFollow(projet)}
                onJoin={() => handleJoinProject(projet)}
                canSubmit={['BROUILLON', 'A_CORRIGER_REFERENT', 'A_CORRIGER_ADMIN'].includes(projet.statut) && projet.estPorteurConnecte}
                onSubmit={() => handleSubmitDraft(projet)}
                canEdit={['BROUILLON', 'A_CORRIGER_REFERENT', 'A_CORRIGER_ADMIN'].includes(projet.statut) && projet.estPorteurConnecte}
                onEdit={() => openProjectForm(projet)}
                onCommentChange={(value) => setCommentDrafts(current => ({ ...current, [projet.id]: value }))}
                onCommentSubmit={() => handleCommentSubmit(projet)}
                t={t}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function WorkflowStepper({ projets, activeStatus, onSelectStatus, t }) {
  return (
    <section className="mb-5 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-black text-slate-950">{t('projects.mainStepsTitle')}</h2>
          <p className="text-xs text-slate-500">{t('projects.mainStepsDescription')}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <button
          type="button"
          aria-pressed={!activeStatus}
          onClick={() => onSelectStatus('')}
          className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 ${
            !activeStatus ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50'
          }`}
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <AppIcon name="ClipboardList" className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-black text-slate-700">{t('projects.allProjects')}</span>
            <span className="block text-[11px] font-semibold text-slate-400">{projets.length} {t('nav.projects').toLowerCase()}</span>
          </span>
        </button>
        {PROJECT_STAGES.map((step) => (
          <button
            key={step.id}
            type="button"
            aria-pressed={activeStatus === step.id}
            onClick={() => onSelectStatus(step.id)}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 ${
              activeStatus === step.id
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50'
            }`}
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <AppIcon name={step.icon} className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-black text-slate-700">{t(`projects.mainSteps.${step.id}`)}</span>
              <span className="block text-[11px] font-semibold text-slate-400">
                {projets.filter(projet => step.statuses.includes(projet.statut)).length} {t('nav.projects').toLowerCase()}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function ProjectCard({
  projet,
  isAuthenticated,
  isMembre,
  isPartenaire,
  expanded,
  actionLoading,
  isParticipant,
  comments,
  commentsLoading,
  commentDraft,
  onToggleDetails,
  onFollow,
  onJoin,
  canSubmit,
  onSubmit,
  canEdit,
  onEdit,
  onCommentChange,
  onCommentSubmit,
  t,
}) {
  const besoinSoutien = Number(projet.budgetDemande) > 0
  const nextStep = projectNextStep(projet, isPartenaire, isMembre, isParticipant, t)
  const actor = projectCurrentActor(projet, t)

  return (
    <article className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition flex flex-col">
      <div className="relative">
        <ProjectCover imageUrl={projet.imageUrl} title={projet.titre} className="h-28" />
        <div className="absolute left-4 top-4">
          <StatusBadge status={projet.statut}>
            {t(`statuses.${projet.statut}`, { defaultValue: projet.statut })}
          </StatusBadge>
        </div>
      </div>
      <div className="p-3.5 flex flex-col flex-1">
        <div className="mb-2">
          <div className="mb-2 flex flex-wrap gap-2">
            <ProjectTypeBadge groupName={projet.groupeNom} />
            <ProjectVisibilityBadge visibility={projet.visibilite} />
          </div>
          <h2 className="font-black text-slate-950 text-base leading-tight">{projet.titre}</h2>
          {projet.groupeNom && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
              <AppIcon name="Users" className="h-3.5 w-3.5" />
              {t('projects.group_label', { group: projet.groupeNom })}
            </p>
          )}
        </div>
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
          {projet.description || t('projects.description_soon')}
        </p>
        {projet.motifCorrection && (
          <Alert type="warning" className="mt-3">
            {projet.motifCorrection}
          </Alert>
        )}
        <dl className="mt-3 grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-black text-slate-700">{t('projects.whoActs')}</dt>
            <dd className="mt-1 text-slate-600">{actor}</dd>
          </div>
          <div>
            <dt className="font-black text-slate-700">{t('projects.nextStep')}</dt>
            <dd className="mt-1 text-slate-600">{nextStep}</dd>
          </div>
        </dl>
        <div className="grid grid-cols-2 gap-2 text-xs mt-3">
          <InfoPill
            label={t('projects.owner')}
            value={formatProjectOwner(projet, t)}
          />
          <InfoPill
            label={t('projects.form_budget')}
            value={projet.budgetDemande ? `${projet.budgetDemande} €` : '—'}
            highlight={besoinSoutien}
          />
          <InfoPill
            label={t('groups.members')}
            value={t('projects.participants_count', { count: projet.nombreParticipants ?? 0 })}
            highlight={isParticipant}
          />
          <InfoPill
            label={t('projects.comments', { defaultValue: 'Commentaires' })}
            value={projet.nombreCommentaires ?? comments.length}
          />
        </div>
        {expanded && (
          <ProjectAlivePanel
            projet={projet}
            nextStep={nextStep}
            comments={comments}
            commentsLoading={commentsLoading}
            commentDraft={commentDraft}
            canComment={isAuthenticated}
            onCommentChange={onCommentChange}
            onCommentSubmit={onCommentSubmit}
            commentLoading={actionLoading === `${projet.id}-COMMENT`}
            t={t}
          />
        )}
        <ProjectActions
          projet={projet}
          isAuthenticated={isAuthenticated}
          isMembre={isMembre}
          isPartenaire={isPartenaire}
          isParticipant={isParticipant}
          actionLoading={actionLoading}
          onToggleDetails={onToggleDetails}
          onFollow={onFollow}
          onJoin={onJoin}
          canSubmit={canSubmit}
          onSubmit={onSubmit}
          canEdit={canEdit}
          onEdit={onEdit}
          t={t}
        />
      </div>
    </article>
  )
}

function ProjectAlivePanel({ projet, nextStep, comments, commentsLoading, commentDraft, canComment, onCommentChange, onCommentSubmit, commentLoading, t }) {
  const recentEvents = buildProjectRecentEvents(projet, comments, t)

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg bg-white p-3">
          <p className="font-black text-slate-800">{t('projects.currentState', { defaultValue: 'État actuel' })}</p>
          <p className="mt-1">{projectWorkflowText(projet, t)}</p>
        </div>
        <div className="rounded-lg bg-white p-3">
          <p className="font-black text-slate-800">{t('projects.nextStep', { defaultValue: 'Prochaine étape' })}</p>
          <p className="mt-1">{nextStep}</p>
        </div>
      </div>

      <div className="rounded-lg bg-white p-3">
        <p className="mb-2 font-black text-slate-800">{t('activityFeed.title', { defaultValue: 'Activité récente' })}</p>
        <div className="space-y-2">
          {recentEvents.map(event => (
            <div key={event.key} className="flex items-start gap-2">
              <AppIcon name={event.icon} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-700" />
              <span>
                <span className="font-semibold text-slate-700">{event.title}</span>
                {event.date && <span className="ml-1 text-slate-400">{formatProjectDate(event.date)}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-black text-slate-800">{t('projects.discussion', { defaultValue: 'Discussion du projet' })}</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{comments.length}</span>
        </div>
        {commentsLoading ? (
          <p className="text-slate-400">{t('common.loading')}</p>
        ) : comments.length === 0 ? (
          <p className="text-slate-400">{t('projects.noComments', { defaultValue: 'Aucun commentaire pour le moment.' })}</p>
        ) : (
          <div className="max-h-32 space-y-2 overflow-y-auto pr-1">
            {comments.slice(-4).map(comment => (
              <div key={comment.id} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="font-black text-slate-700">
                  {[comment.auteurPrenom, comment.auteurNom].filter(Boolean).join(' ') || t('users.user', { defaultValue: 'Utilisateur' })}
                </p>
                <p className="text-slate-600">{comment.contenu}</p>
              </div>
            ))}
          </div>
        )}
        {canComment && (
          <div className="mt-3 flex gap-2">
            <input
              value={commentDraft}
              onChange={event => onCommentChange(event.target.value)}
              placeholder={t('projects.commentPlaceholder', { defaultValue: 'Ajouter une note de suivi...' })}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="button"
              onClick={onCommentSubmit}
              disabled={commentLoading || !commentDraft.trim()}
              className="rounded-lg bg-blue-600 px-3 py-2 font-black text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {t('common.send', { defaultValue: 'Envoyer' })}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ProjectActions({ projet, isAuthenticated, isMembre, isPartenaire, isParticipant, actionLoading, onToggleDetails, onFollow, onJoin, canSubmit, onSubmit, canEdit, onEdit, t }) {
  return (
    <div className="mt-auto flex flex-wrap gap-2 pt-4">
      <button type="button" onClick={onToggleDetails} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200">
        <AppIcon name="Eye" className="h-3.5 w-3.5" />
        {t('common.open', { defaultValue: 'Voir' })}
      </button>
      {canSubmit && (
        <button type="button" onClick={onSubmit} disabled={actionLoading === `${projet.id}-SUBMIT`} className="inline-flex flex-1 items-center justify-center rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white disabled:opacity-60">
          {t('projects.submit_draft')}
        </button>
      )}
      {canEdit && (
        <button type="button" onClick={onEdit} className="inline-flex flex-1 items-center justify-center rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">
          {t('common.edit')}
        </button>
      )}
      {isMembre && (
        <button
          type="button"
          onClick={isParticipant ? onFollow : onJoin}
          disabled={actionLoading === `${projet.id}-JOIN`}
          className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition disabled:opacity-60 ${
            isParticipant
              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          <AppIcon name={isParticipant ? 'CheckCircle' : 'PlusCircle'} className="h-3.5 w-3.5" />
          {isParticipant ? t('projects.joinedLabel', { defaultValue: 'Participant' }) : t('projects.join', { defaultValue: 'Rejoindre' })}
        </button>
      )}
      {isPartenaire && projet.statut === 'APPROUVE' && (
        <Link to="/partenaire?tab=projets-activites" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-black text-white transition hover:bg-orange-500">
          <AppIcon name="Handshake" className="h-3.5 w-3.5" />
          {t('partnerSpace.proposeSupport')}
        </Link>
      )}
      {!isAuthenticated && (
        <Link to="/login" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-500">
          <AppIcon name="User" className="h-3.5 w-3.5" />
          {t('nav.login')}
        </Link>
      )}
    </div>
  )
}

function VisibilitySelect({ value, options, onChange, t }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{t('projects.visibility')}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {options.map(option => (
          <option key={option} value={option}>{t(`projectVisibility.${option}`)}</option>
        ))}
      </select>
    </label>
  )
}

function InfoPill({ label, value, highlight = false }) {
  return (
    <div className={`rounded-lg px-2.5 py-1.5 ${highlight ? 'bg-orange-50' : 'bg-slate-50'}`}>
      <p className={`text-[10px] font-semibold uppercase ${highlight ? 'text-orange-500' : 'text-slate-400'}`}>{label}</p>
      <p className={`mt-0.5 font-semibold truncate ${highlight ? 'text-orange-700' : 'text-slate-700'}`}>{value}</p>
    </div>
  )
}

function projectWorkflowText(projet, t) {
  switch (projet.statut) {
    case 'BROUILLON':
      return t('projects.workflowDraft', { defaultValue: 'Ce projet est encore en préparation.' })
    case 'SOUMIS':
      return t('projects.workflowSubmitted', { defaultValue: 'Ce projet attend la relecture du référent.' })
    case 'A_CORRIGER_REFERENT':
      return t('statuses.A_CORRIGER_REFERENT')
    case 'VALIDE_REFERENT':
      return t('projects.workflowReferentApproved', { defaultValue: 'Ce projet a été validé par le référent et attend la décision admin.' })
    case 'A_CORRIGER_ADMIN':
      return t('statuses.A_CORRIGER_ADMIN')
    case 'REFUSE_REFERENT':
      return t('projects.workflowReferentRejected', { defaultValue: 'Ce projet a été refusé par le référent.' })
    case 'APPROUVE':
      return t('projects.workflowApproved', { defaultValue: 'Ce projet est approuvé et peut être visible ou soutenu selon sa visibilité.' })
    case 'EN_COURS':
      return t('projects.workflowRunning', { defaultValue: 'Ce projet est en cours de réalisation.' })
    case 'TERMINE':
      return t('projects.workflowDone', { defaultValue: 'Ce projet est terminé.' })
    case 'REJETE':
      return t('projects.workflowRejected', { defaultValue: 'Ce projet a été refusé.' })
    case 'ANNULE':
      return t('statuses.ANNULE')
    case 'ARCHIVE':
      return t('projects.workflowArchived', { defaultValue: 'Ce projet est archivé.' })
    default:
      return t('projects.workflowUnknown', { defaultValue: 'Statut du projet à vérifier.' })
  }
}

function projectNextStep(projet, isPartenaire, isMembre, isParticipant, t) {
  if (projet.statut === 'VALIDE_REFERENT') {
    return t('projects.nextAdminValidation', { defaultValue: 'Validation finale par l’administration dans l’espace admin.' })
  }
  if (isPartenaire && projet.statut === 'APPROUVE') {
    return t('projects.nextPartnerSupport', { defaultValue: 'Évaluer le besoin et proposer un soutien si le projet correspond à vos priorités.' })
  }
  if (isMembre && !isParticipant && ['APPROUVE', 'EN_COURS'].includes(projet.statut)) {
    return t('projects.nextMemberJoin', { defaultValue: 'Rejoindre le projet pour suivre son avancement.' })
  }
  if (isParticipant) {
    return t('projects.nextParticipant', { defaultValue: 'Suivre la discussion et contribuer aux prochaines étapes.' })
  }
  if (projet.statut === 'BROUILLON') {
    return t('projects.nextDraft', { defaultValue: 'Compléter le projet avant soumission.' })
  }
  if (projet.statut === 'SOUMIS') {
    return t('projects.nextSubmitted', { defaultValue: 'Attendre la relecture du référent.' })
  }
  if (projet.statut === 'REFUSE_REFERENT') {
    return t('projects.nextReferentRejected', { defaultValue: 'Consulter le commentaire du référent et revoir la proposition.' })
  }
  if (projet.statut === 'TERMINE') {
    return t('projects.nextDone', { defaultValue: 'Consulter le bilan et les contributions.' })
  }
  if (projet.statut === 'REJETE') {
    return t('projects.nextRejected', { defaultValue: 'Consulter le motif ou revoir la proposition.' })
  }
  if (projet.statut === 'ARCHIVE') {
    return t('projects.nextArchived', { defaultValue: 'Consulter l’historique du projet.' })
  }
  if (projet.statut === 'A_CORRIGER_REFERENT' || projet.statut === 'A_CORRIGER_ADMIN') {
    return t(`statuses.${projet.statut}`)
  }
  if (projet.statut === 'ANNULE') return t('statuses.ANNULE')
  return t('projects.nextDefault', { defaultValue: 'Suivre l’évolution du projet.' })
}

function projectCurrentActor(projet, t) {
  if (['BROUILLON', 'A_CORRIGER_REFERENT', 'A_CORRIGER_ADMIN'].includes(projet.statut)) {
    return t('projects.actors.owner')
  }
  if (projet.statut === 'SOUMIS') return t('projects.actors.referent')
  if (['VALIDE_REFERENT', 'APPROUVE', 'EN_COURS'].includes(projet.statut)) {
    return t('projects.actors.association')
  }
  return t('projects.actors.none')
}

function buildProjectRecentEvents(projet, comments, t) {
  const events = [
    projet.dateCreation && {
      key: 'created',
      icon: 'PlusCircle',
      title: t('projects.eventCreated', { defaultValue: 'Projet créé' }),
      date: projet.dateCreation,
    },
    projet.dateSoumission && {
      key: 'submitted',
      icon: 'Clock',
      title: t('projects.eventSubmitted', { defaultValue: 'Soumis pour validation' }),
      date: projet.dateSoumission,
    },
    projet.dateValidation && {
      key: 'validated',
      icon: projet.statut === 'REJETE' ? 'XCircle' : 'CheckCircle',
      title: projet.statut === 'REJETE'
        ? t('projects.eventRejected', { defaultValue: 'Projet refusé' })
        : t('projects.eventValidated', { defaultValue: 'Projet validé' }),
      date: projet.dateValidation,
    },
    projet.dateCloture && {
      key: 'closed',
      icon: 'Archive',
      title: t('projects.eventClosed', { defaultValue: 'Projet clôturé' }),
      date: projet.dateCloture,
    },
    ...comments.slice(-2).map(comment => ({
      key: `comment-${comment.id}`,
      icon: 'MessageCircle',
      title: t('projects.eventComment', {
        author: [comment.auteurPrenom, comment.auteurNom].filter(Boolean).join(' '),
        defaultValue: 'Nouveau commentaire',
      }),
      date: comment.dateCommentaire,
    })),
  ].filter(Boolean)

  return events
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 4)
}

function formatProjectDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—'
}

function formatProjectOwner(projet, t) {
  if (projet.groupeNom) return projet.groupeNom
  if (projet.porteurPrenom || projet.porteurNom) {
    return `${projet.porteurPrenom || ''} ${projet.porteurNom || ''}`.trim()
  }
  return t('projects.typeInstitutional')
}

function Input({ id, label, value, onChange, type = 'text', required = false, min }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        id={id}
        required={required}
        type={type}
        min={min}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  )
}
