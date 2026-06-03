import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import ImageUpload from '../../components/ImageUpload'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import { userFriendlyError } from '../../utils/userFriendlyError'

const STATUT_VARIANTS = {
  BROUILLON: 'neutral',
  SOUMIS: 'warning',
  APPROUVE: 'success',
  EN_COURS: 'info',
  TERMINE: 'success',
  REJETE: 'danger',
  ARCHIVE: 'neutral',
}

export default function Projets() {
  const { isAuthenticated, isMembre } = useAuth()
  const { t } = useTranslation()
  const [projets, setProjets] = useState([])
  const [adhesions, setAdhesions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titre: '', description: '', budgetDemande: '', imageUrl: '' })

  useEffect(() => {
    fetchProjets()
  }, [])

  useEffect(() => {
    if (isAuthenticated && isMembre) fetchAdhesions()
  }, [isAuthenticated, isMembre])

  const fetchProjets = async () => {
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
  }

  const fetchAdhesions = async () => {
    try {
      const res = await api.get('/groupes/mes-adhesions')
      setAdhesions(res.data)
    } catch {
      setAdhesions([])
    }
  }

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
      setForm({ titre: '', description: '', budgetDemande: '', imageUrl: '' })
      fetchProjets()
    } catch (err) {
      setError(userFriendlyError(err, t('projects.error_submit')))
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <header className="mb-6">
          <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">{t('ux.projects.eyebrow')}</p>
          <h1 className="text-3xl font-bold text-blue-900 mt-1">{t('ux.projects.title')}</h1>
          <p className="text-gray-500 text-sm mt-2 max-w-2xl">
            {t('ux.projects.intro')}
          </p>
        </header>

        {message && <Alert>{message}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        <section className="bg-white rounded-2xl shadow p-5 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-semibold text-blue-900">{t('ux.projects.workflow')}</h2>
            <p className="text-sm text-gray-500 mt-1">
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
              className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
            >
              {showForm ? t('common.cancel') : t('ux.projects.propose')}
            </button>
          )}
        </section>

        {showForm && peutProposer && (
          <section className="bg-white rounded-2xl shadow p-6 mb-6">
            <h2 className="text-lg font-bold text-blue-900 mb-4">{t('ux.projects.new')}</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.form_description')}</label>
                <textarea
                  required
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-vertical"
                />
              </div>
              <Input label={t('projects.form_budget')} value={form.budgetDemande} onChange={value => setForm({ ...form, budgetDemande: value })} type="number" min="0" />
              <button type="submit" className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
                {t('projects.submit_project')}
              </button>
            </form>
          </section>
        )}

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('projects.loading')}</p>
        ) : projets.length === 0 ? (
          <EmptyState
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
                supportLabel={t('ux.projects.support')}
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
    <article className="bg-white rounded-2xl shadow overflow-hidden">
      {projet.imageUrl ? (
        <img src={projet.imageUrl} alt={projet.titre} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-blue-50 flex items-center justify-center text-blue-800 font-semibold">
          {t('projects.fallback_image')}
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="font-semibold text-blue-900">{projet.titre}</h2>
          <StatusBadge variant={STATUT_VARIANTS[projet.statut] || 'neutral'}>
            {t(`statuses.${projet.statut}`, { defaultValue: projet.statut })}
          </StatusBadge>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
          {projet.description || t('projects.description_soon')}
        </p>
        <div className="text-xs text-gray-400 mt-4 space-y-1">
          {projet.groupeNom && <p>{t('projects.group_label', { group: projet.groupeNom })}</p>}
          {projet.porteurPrenom && <p>{t('projects.owner_label', { owner: `${projet.porteurPrenom} ${projet.porteurNom}` })}</p>}
          <p>{t('projects.participants_count', { count: projet.nombreParticipants ?? 0 })}</p>
        </div>
        {isAuthenticated && projet.statut === 'APPROUVE' && (
          <button type="button" className="w-full mt-4 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold py-2 rounded-xl transition">
            {supportLabel}
          </button>
        )}
      </div>
    </article>
  )
}

function Input({ label, value, onChange, type = 'text', required = false, min }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
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
