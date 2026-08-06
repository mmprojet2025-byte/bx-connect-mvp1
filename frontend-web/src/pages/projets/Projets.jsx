import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import ImageUpload from '../../components/ImageUpload'
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
const PROJECT_STATUSES = ['BROUILLON', 'SOUMIS', 'VALIDE_REFERENT', 'REFUSE_REFERENT', 'APPROUVE', 'EN_COURS', 'TERMINE', 'REJETE', 'REFUSE', 'ARCHIVE']
const PROJECT_VISIBILITIES = ['GROUPE', 'COMMUNAUTE', 'PARTENAIRES', 'PUBLIC']

export default function Projets() {
  const { isAuthenticated, isMembre, isAdmin, isPartenaire } = useAuth()
  const { id: focusedProjectId } = useParams()
  const { t } = useTranslation()
  const [projets, setProjets] = useState([])
  const [adhesions, setAdhesions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
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
    imageUrl: '',
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
      const res = await api.get(endpoint)
      setProjets(res.data)
      setError('')
    } catch {
      setError(t('projects.error_load'))
    } finally {
      setLoading(false)
    }
  }, [isAdmin, isPartenaire, t])

  const fetchAdhesions = useCallback(async () => {
    try {
      const res = await api.get('/groupes/mes-adhesions')
      setAdhesions(res.data)
    } catch {
      setAdhesions([])
    }
  }, [])

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
  const projetsParStatut = useMemo(() => {
    return PROJECT_STATUSES.reduce((acc, statut) => {
      acc[statut] = projets.filter(projet => projet.statut === statut).length
      return acc
    }, {})
  }, [projets])
  const projetsRecents = useMemo(() => {
    return [...projets]
      .sort((a, b) => new Date(b.dateSoumission || b.dateCreation || 0) - new Date(a.dateSoumission || a.dateCreation || 0))
      .slice(0, 3)
  }, [projets])
  const projetsEnAction = (projetsParStatut.SOUMIS || 0) + (projetsParStatut.VALIDE_REFERENT || 0) + (projetsParStatut.APPROUVE || 0) + (projetsParStatut.EN_COURS || 0)
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
      const matchStatut = filtreStatut ? projet.statut === filtreStatut : true
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
      const res = await api.post('/projets', {
        ...form,
        budgetDemande: parseFloat(form.budgetDemande) || 0,
        groupeId: groupeActif?.groupeId,
      })
      await api.patch(`/projets/${res.data.id}/soumettre`)
      setMessage(t('ux.projects.submitted'))
      toast.success(t('ux.projects.submitted'))
      setShowForm(false)
      setForm({ titre: '', description: '', budgetDemande: '', imageUrl: '', visibilite: 'GROUPE' })
      fetchProjets()
    } catch (err) {
      const feedback = userFriendlyError(err, t('projects.error_submit'))
      setError(feedback)
      toast.error(feedback)
    }
  }

  const handleFollow = (projet) => {
    toast(t('projects.followUnavailable', {
      title: projet.titre,
      defaultValue: 'Vous participez déjà à ce projet. Les nouvelles interactions apparaîtront dans vos notifications.',
    }))
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
          action={isMembre && (
            <button
              type="button"
              onClick={() => setShowForm(open => !open)}
              disabled={!peutProposer}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 disabled:text-slate-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              {showForm ? t('common.cancel') : t('ux.projects.propose')}
            </button>
          )}
        />

        {message && <Alert>{message}</Alert>}
        {error && projets.length > 0 && <Alert type="error">{error}</Alert>}

        <section className="mb-5 grid gap-3 sm:grid-cols-4">
          <ProjectStat icon="Rocket" label={t('nav.projects', { defaultValue: 'Projets' })} value={projets.length} />
          <ProjectStat icon="Clock" label={t('statuses.SOUMIS', { defaultValue: 'Soumis' })} value={projetsParStatut.SOUMIS || 0} tone="amber" />
          <ProjectStat icon="CheckCircle" label={t('statuses.APPROUVE', { defaultValue: 'Approuvés' })} value={projetsParStatut.APPROUVE || 0} tone="green" />
          <ProjectStat icon="Activity" label={t('projects.activeProjects', { defaultValue: 'En action' })} value={projetsEnAction} tone="blue" />
        </section>

        <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-5">
          <div>
            <h2 className="font-semibold text-slate-950">{t('projects.workspaceTitle', { defaultValue: 'Projets à suivre' })}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {t('projects.workspaceDesc', {
                count: projets.length,
                defaultValue: `${projets.length} projet(s) visibles avec leur statut, leur groupe et leur besoin de soutien.`,
              })}
            </p>
            {isMembre && !groupeActif && (
              <p className="text-sm text-amber-700 mt-2">{t('ux.projects.needGroup')}</p>
            )}
            {groupeActif && (
              <p className="text-sm text-green-700 mt-2">{t('ux.projects.attachedGroup', { group: groupeActif.groupeNom })}</p>
            )}
          </div>
          {projetsRecents.length > 0 && (
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {projetsRecents.map(projet => (
                <button
                  key={projet.id}
                  type="button"
                  onClick={() => setExpandedProjectId(projet.id)}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <span className="block truncate text-xs font-black text-slate-950">{projet.titre}</span>
                  <span className="mt-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
                    <span className="truncate">{projet.groupeNom || t('projects.typeInstitutional')}</span>
                    <StatusBadge status={projet.statut}>{t(`statuses.${projet.statut}`, { defaultValue: projet.statut })}</StatusBadge>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {focusedProjectId && (
          <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
            <AppIcon name="Search" className="mr-2 inline h-4 w-4" />
            {t('projects.focusedProject', { id: focusedProjectId, defaultValue: `Projet ciblé #${focusedProjectId}` })}
            <Link to="/projets" className="ml-3 underline">{t('common.showAll', { defaultValue: 'Voir tous' })}</Link>
          </div>
        )}

        <WorkflowStepper
          counts={projetsParStatut}
          activeStatus={filtreStatut}
          onSelectStatus={(statut) => setFiltreStatut(current => current === statut ? '' : statut)}
          t={t}
        />

        <section className="mb-5 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
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
          <div className="grid gap-3 md:grid-cols-4">
            <input
              type="search"
              value={recherche}
              onChange={event => setRecherche(event.target.value)}
              placeholder={t('projects.searchPlaceholder', { defaultValue: 'Rechercher un projet...' })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <select value={filtreStatut} onChange={event => setFiltreStatut(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">{t('partnerSupport.admin.allStatuses', { defaultValue: 'Tous les statuts' })}</option>
              {PROJECT_STATUSES.map(statut => <option key={statut} value={statut}>{t(`statuses.${statut}`, { defaultValue: statut })}</option>)}
            </select>
            <select value={filtreGroupe} onChange={event => setFiltreGroupe(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">{t('projects.allGroups', { defaultValue: 'Tous les groupes' })}</option>
              {groupesDisponibles.map(groupe => <option key={groupe} value={groupe}>{groupe}</option>)}
            </select>
            <select value={filtreVisibilite} onChange={event => setFiltreVisibilite(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">{t('projects.allVisibilities', { defaultValue: 'Toutes les visibilités' })}</option>
              {PROJECT_VISIBILITIES.map(visibilite => <option key={visibilite} value={visibilite}>{t(`projectVisibility.${visibilite}`, { defaultValue: visibilite })}</option>)}
            </select>
          </div>
        </section>

        {showForm && peutProposer && (
          <section className="bg-white rounded-xl border border-slate-100 shadow-lg shadow-slate-900/5 p-5 mb-6">
            <h2 className="text-lg font-bold text-slate-950 mb-4">{t('ux.projects.new')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <ImageUpload
                type="projet"
                currentUrl={form.imageUrl || null}
                onUploadSuccess={(url) => setForm({ ...form, imageUrl: url })}
                shape="rectangle"
                label={t('projects.form_image')}
              />
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
                {t('projects.submit_project')}
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
        ) : projets.length === 0 ? (
          <EmptyState
            icon="Rocket"
            title={t('ux.projects.emptyTitle')}
            description={t('ux.projects.emptyDesc')}
            actionLabel={isAuthenticated ? t('groups.view_groups') : t('auth.register_btn')}
            actionTo={isAuthenticated ? '/groupes' : '/register'}
          />
        ) : projetsFiltres.length === 0 ? (
          <EmptyState
            icon="Search"
            title={t('projects.noFilteredProjects', { defaultValue: 'Aucun projet ne correspond aux filtres.' })}
            description={t('projects.noFilteredProjectsDesc', { defaultValue: 'Modifie la recherche, le statut, le groupe ou la visibilité pour retrouver des projets.' })}
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

function WorkflowStepper({ counts, activeStatus, onSelectStatus, t }) {
  const steps = [
    { label: t('projects.workflowSteps.created'), status: 'BROUILLON', icon: 'PlusCircle' },
    { label: t('projects.workflowSteps.submitted'), status: 'SOUMIS', icon: 'Clock' },
    { label: t('projects.workflowSteps.referentValidation'), status: 'VALIDE_REFERENT', icon: 'Shield' },
    { label: t('projects.workflowSteps.referentRejected'), status: 'REFUSE_REFERENT', icon: 'XCircle' },
    { label: t('projects.workflowSteps.adminValidation'), status: 'APPROUVE', icon: 'CheckCircle' },
    { label: t('projects.workflowSteps.adminRejected'), status: 'REJETE', icon: 'XCircle' },
    { label: t('projects.workflowSteps.running'), status: 'EN_COURS', icon: 'Activity' },
    { label: t('projects.workflowSteps.done'), status: 'TERMINE', icon: 'Rocket' },
    { label: t('projects.workflowSteps.archived'), status: 'ARCHIVE', icon: 'Archive' },
  ]

  return (
    <section className="mb-5 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-black text-slate-950">{t('ux.projects.workflow')}</h2>
          <p className="text-xs text-slate-500">{t('projects.workflowFilterHint', { defaultValue: 'Clique sur une étape pour filtrer les projets par statut.' })}</p>
        </div>
        {activeStatus && (
          <button type="button" onClick={() => onSelectStatus(activeStatus)} className="text-xs font-bold text-blue-700 hover:underline">
            {t('activities.reset_filters', { defaultValue: 'Réinitialiser' })}
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {steps.map((step, index) => (
          <button
            key={`${step.label}-${index}`}
            type="button"
            onClick={() => onSelectStatus(step.status)}
            className={`flex min-w-[108px] items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
              activeStatus === step.status
                ? 'border-blue-300 bg-blue-50 shadow-sm'
                : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50'
            }`}
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <AppIcon name={step.icon} className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-black text-slate-700">{step.label}</span>
              <span className="block text-[11px] font-semibold text-slate-400">
                {counts[step.status] ?? 0} {t('nav.projects').toLowerCase()}
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
  onCommentChange,
  onCommentSubmit,
  t,
}) {
  const besoinSoutien = Number(projet.budgetDemande) > 0
  const nextStep = projectNextStep(projet, isPartenaire, isMembre, isParticipant, t)

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

function ProjectStat({ icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
        </div>
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${tones[tone] || tones.slate}`}>
          <AppIcon name={icon} className="h-4 w-4" />
        </span>
      </div>
    </div>
  )
}

function ProjectActions({ projet, isAuthenticated, isMembre, isPartenaire, isParticipant, actionLoading, onToggleDetails, onFollow, onJoin, t }) {
  return (
    <div className="mt-auto flex flex-wrap gap-2 pt-4">
      <button type="button" onClick={onToggleDetails} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200">
        <AppIcon name="Eye" className="h-3.5 w-3.5" />
        {t('common.open', { defaultValue: 'Voir' })}
      </button>
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
    case 'VALIDE_REFERENT':
      return t('projects.workflowReferentApproved', { defaultValue: 'Ce projet a été validé par le référent et attend la décision admin.' })
    case 'REFUSE_REFERENT':
      return t('projects.workflowReferentRejected', { defaultValue: 'Ce projet a été refusé par le référent.' })
    case 'APPROUVE':
      return t('projects.workflowApproved', { defaultValue: 'Ce projet est approuvé et peut être visible ou soutenu selon sa visibilité.' })
    case 'EN_COURS':
      return t('projects.workflowRunning', { defaultValue: 'Ce projet est en cours de réalisation.' })
    case 'TERMINE':
      return t('projects.workflowDone', { defaultValue: 'Ce projet est terminé.' })
    case 'REJETE':
    case 'REFUSE':
      return t('projects.workflowRejected', { defaultValue: 'Ce projet a été refusé.' })
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
  if (['REJETE', 'REFUSE'].includes(projet.statut)) {
    return t('projects.nextRejected', { defaultValue: 'Consulter le motif ou revoir la proposition.' })
  }
  if (projet.statut === 'ARCHIVE') {
    return t('projects.nextArchived', { defaultValue: 'Consulter l’historique du projet.' })
  }
  return t('projects.nextDefault', { defaultValue: 'Suivre l’évolution du projet.' })
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
