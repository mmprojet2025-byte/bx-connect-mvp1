import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import projectsIllustration from '../../assets/illustrations/projects.png'

const MEMBER_VISIBILITIES = ['GROUPE', 'COMMUNAUTE']

export default function Projets() {
  const { isAuthenticated, isMembre } = useAuth()
  const { t } = useTranslation()
  const [projets, setProjets] = useState([])
  const [adhesions, setAdhesions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
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
      const res = await api.get('/projets')
      setProjets(res.data)
      setError('')
    } catch {
      setError(t('projects.error_load'))
    } finally {
      setLoading(false)
    }
  }, [t])

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
    if (isAuthenticated && isMembre) fetchAdhesions()
  }, [fetchAdhesions, isAuthenticated, isMembre])

  const groupeActif = useMemo(
    () => adhesions.find(adhesion => adhesion.statut === 'ACCEPTE'),
    [adhesions]
  )

  const peutProposer = isAuthenticated && isMembre && !!groupeActif

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
      setShowForm(false)
      setForm({ titre: '', description: '', budgetDemande: '', imageUrl: '', visibilite: 'GROUPE' })
      fetchProjets()
    } catch (err) {
      setError(userFriendlyError(err, t('projects.error_submit')))
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <PageHeader
          eyebrow={t('ux.projects.eyebrow')}
          title={t('ux.projects.title')}
          description={t('ux.projects.intro')}
          action={(
            <img
              src={projectsIllustration}
              alt=""
              className="mx-auto w-[200px] object-contain md:w-[300px]"
            />
          )}
        />

        {message && <Alert>{message}</Alert>}
        {error && projets.length > 0 && <Alert type="error">{error}</Alert>}

        <section className="bg-white rounded-[1.5rem] border border-slate-100 shadow-lg shadow-slate-900/5 p-5 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-950">{t('ux.projects.workflow')}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {t('ux.projects.workflowDesc')}
            </p>
            {isMembre && !groupeActif && (
              <p className="text-sm text-amber-700 mt-2">{t('ux.projects.needGroup')}</p>
            )}
            {groupeActif && (
              <p className="text-sm text-green-700 mt-2">{t('ux.projects.attachedGroup', { group: groupeActif.groupeNom })}</p>
            )}
          </div>
          {isMembre && (
            <button
              type="button"
              onClick={() => setShowForm(open => !open)}
              disabled={!peutProposer}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 disabled:text-slate-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
            >
              {showForm ? t('common.cancel') : t('ux.projects.propose')}
            </button>
          )}
        </section>

        {showForm && peutProposer && (
          <section className="bg-white rounded-[1.5rem] border border-slate-100 shadow-lg shadow-slate-900/5 p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-950 mb-4">{t('ux.projects.new')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <ImageUpload
                type="projet"
                currentUrl={form.imageUrl || null}
                onUploadSuccess={(url) => setForm({ ...form, imageUrl: url })}
                shape="rectangle"
                label={t('projects.form_image')}
              />
              <Input label={t('projects.form_title')} value={form.titre} onChange={value => setForm({ ...form, titre: value })} required />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('projects.form_description')}</label>
                <textarea
                  required
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-vertical"
                />
              </div>
              <Input label={t('projects.form_budget')} value={form.budgetDemande} onChange={value => setForm({ ...form, budgetDemande: value })} type="number" min="0" />
              <VisibilitySelect
                value={form.visibilite}
                options={MEMBER_VISIBILITIES}
                onChange={value => setForm({ ...form, visibilite: value })}
                t={t}
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
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
        ) : projets.length === 0 ? (
          <EmptyState
            icon="Rocket"
            title={t('ux.projects.emptyTitle')}
            description={t('ux.projects.emptyDesc')}
            actionLabel={isAuthenticated ? t('groups.view_groups') : t('auth.register_btn')}
            actionTo={isAuthenticated ? '/groupes' : '/register'}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {projets.map(projet => (
              <ProjectCard
                key={projet.id}
                projet={projet}
                isAuthenticated={isAuthenticated}
                supportLabel={t('projects.participationSoon')}
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

function ProjectCard({ projet, isAuthenticated, supportLabel, t }) {
  return (
    <article className="bg-white rounded-[1.5rem] border border-slate-100 shadow-lg shadow-slate-900/5 overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition flex flex-col">
      <div className="relative">
        <ProjectCover imageUrl={projet.imageUrl} title={projet.titre} className="h-44" />
        <div className="absolute left-4 top-4">
          <StatusBadge status={projet.statut}>
            {t(`statuses.${projet.statut}`, { defaultValue: projet.statut })}
          </StatusBadge>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="mb-3">
          <div className="mb-2 flex flex-wrap gap-2">
            <ProjectTypeBadge groupName={projet.groupeNom} />
            <ProjectVisibilityBadge visibility={projet.visibilite} />
          </div>
          <h2 className="font-bold text-slate-950 text-lg leading-tight">{projet.titre}</h2>
          {projet.groupeNom && (
            <p className="text-xs text-blue-600 font-semibold mt-1">{t('projects.group_label', { group: projet.groupeNom })}</p>
          )}
        </div>
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
          {projet.description || t('projects.description_soon')}
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs mt-4">
          <InfoPill
            label={t('projects.owner')}
            value={formatProjectOwner(projet, t)}
          />
          <InfoPill
            label={t('projects.form_budget')}
            value={projet.budgetDemande ? `${projet.budgetDemande} €` : '—'}
          />
          <InfoPill
            label={t('groups.members')}
            value={t('projects.participants_count', { count: projet.nombreParticipants ?? 0 })}
          />
          <InfoPill
            label={t('projects.createdAt')}
            value={formatProjectDate(projet.dateSoumission || projet.dateCreation)}
          />
        </div>
        {isAuthenticated && projet.statut === 'APPROUVE' && (
          <p className="mt-5 rounded-xl bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-500">
            {supportLabel}
          </p>
        )}
      </div>
    </article>
  )
}

function VisibilitySelect({ value, options, onChange, t }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{t('projects.visibility')}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {options.map(option => (
          <option key={option} value={option}>{t(`projectVisibility.${option}`)}</option>
        ))}
      </select>
    </label>
  )
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-700 truncate">{value}</p>
    </div>
  )
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

function Input({ label, value, onChange, type = 'text', required = false, min }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        required={required}
        type={type}
        min={min}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  )
}
