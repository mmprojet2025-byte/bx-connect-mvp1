import { activityError as userFriendlyError } from '../../utils/activityError'
import ActivityCancellationDialog from '../../components/ActivityCancellationDialog'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'
import { useTranslation } from 'react-i18next'
import StatusBadge from '../../components/StatusBadge'
import ActivityCover from '../../components/ActivityCover'
import AppIcon from '../../components/ui/AppIcons'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import ActivityFormFields from '../../components/ActivityFormFields'
import ErrorState from '../../components/ui/ErrorState'
import LoadingState from '../../components/ui/LoadingState'

import ActivityPublicationDialog from '../../components/ActivityPublicationDialog'
import ActivityVisibility from '../../components/ActivityVisibility'
import { confirmSensitiveAction } from '../../utils/userFriendlyError'

import { activityToForm, audienceKey } from '../admin/activityForm'
import { ownActivityGroups, newReferentActivity, canManageAssignedActivity, validateReferentActivity, referentActivityPayload } from './referentActivityForm'

const emptyForm = newReferentActivity([])

export default function ReferentActivites() {
  const { t, i18n } = useTranslation()
  const [cancellingActivity, setCancellingActivity] = useState(null)
  const [publishingActivity, setPublishingActivity] = useState(null)
  const [changingStatus, setChangingStatus] = useState(null)
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
  const [groups, setGroups] = useState([])
  const [profile, setProfile] = useState(null)
  const [groupsReady, setGroupsReady] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formErrors, setFormErrors] = useState([])
  const ownGroups = ownActivityGroups(groups, profile)
  const canManage = activity => groupsReady && canManageAssignedActivity(activity, groups, profile)
  const assignmentError = editingActivity && groupsReady && !canManage(editingActivity)

  const fetchActivites = useCallback(async () => {
    setLoading(true)
    try {
      const [res, groupResponse, profileResponse] = await Promise.all([
        api.get('/referent/mes-activites'), api.get('/referent/groupes'), api.get('/users/me'),
      ])
      setActivites(res.data)
      setGroups(groupResponse.data)
      setProfile(profileResponse.data)
      setGroupsReady(true)
      setError('')
    } catch {
      setGroupsReady(false)
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


  const resetForm = () => {
    setForm(newReferentActivity(ownGroups))
    setFormErrors([])
    setEditingActivity(null)
    setShowForm(false)
  }

  const startEdit = (activite) => {
    setEditingActivity(activite)
    setForm(activityToForm(activite))
    setFormErrors([])
    setMessage('')
    setError('')
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving || uploading || !groupsReady) return
    const errors = validateReferentActivity(form, groups, profile, editingActivity)
    setFormErrors(errors)
    if (errors.length) return
    setSaving(true)
    setMessage('')
    setError('')
    const payload = referentActivityPayload(form, editingActivity)

    try {
      if (editingActivity) {
        await api.put(`/activites/${editingActivity.id}`, payload)
        setMessage(t('referent.activityUpdated'))
      } else {
        await api.post('/activites', payload)
        setMessage(t('adminActivity.draftSaved'))
      }
      resetForm()
      await fetchActivites()
    } catch (err) {
      setError(err.response?.status === 403 ? t('referentActivity.assignmentError')
        : userFriendlyError(err, editingActivity ? t('referent.errorActivityUpdate') : t('referent.errorActivityCreate')))
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (activity, statut, confirmed = false) => {
    if (statut === 'ANNULEE' && !confirmed) { setCancellingActivity(activity); return }
    if (!confirmed && !confirmSensitiveAction(t('admin.confirmActivityStatusChange', { status: t(`statuses.${statut}`) }))) return
    setChangingStatus(activity.id)
    setError('')
    setMessage('')
    try {
      const response = await api.patch(`/activites/${activity.id}/statut`, null, { params: { statut } })
      setActivites(current => current.map(item => item.id === activity.id ? response.data : item))
      setMessage(t('admin.statusUpdatedWithValue', { status: t(`statuses.${statut}`) }))
    } catch (err) {
      setError(err.response?.status === 403 ? t('referentActivity.assignmentError') : userFriendlyError(err, t('activities.publication.errorStatus')))
    } finally {
      setChangingStatus(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <PageHeader
          eyebrow={t('nav.activities')}
          title={t('referentActivity.title')}
          description={t('referent.activitiesCount', { count: activites.length })}
          action={(
            <button
              disabled={!groupsReady}
              onClick={() => {
                if (showForm) {
                  resetForm()
                } else {
                  setForm(newReferentActivity(ownGroups))
                  setFormErrors([])
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
          <form noValidate aria-label={t('referent.newActivity')} onSubmit={handleSubmit} className="mb-6 grid rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <h2 className="text-lg font-bold text-blue-900">
                {editingActivity ? t('referent.editActivity') : t('referent.newActivity')}
              </h2>
            </div>
            {formErrors.length > 0 && <ul role="alert" className="md:col-span-2 text-sm text-red-700">
              {formErrors.map(key => <li key={key}>{t(key === 'referent' ? 'referentActivity.assignmentError' : `adminActivity.errors.${key}`)}</li>)}
            </ul>}
            {!groupsReady && <p role="status" className="md:col-span-2">{t('referentActivity.groupsUnavailable')}</p>}
            {groupsReady && !editingActivity && ownGroups.length === 0 && <p role="alert" className="md:col-span-2">{t('referentActivity.noGroups')}</p>}
            {assignmentError && <p role="alert" className="md:col-span-2 text-red-700">{t('referentActivity.assignmentError')}</p>}
            <ActivityFormFields key={editingActivity?.id || 'new'} form={form} setForm={setForm} groups={ownGroups} original={editingActivity} referent ready={groupsReady} onUploading={setUploading} />
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
                disabled={uploading || saving || !groupsReady || Boolean(assignmentError) || (!editingActivity && !ownGroups.length)}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:bg-gray-300"
              >
                <AppIcon name={editingActivity ? 'Save' : 'PlusCircle'} className="h-4 w-4" />
                {saving
                  ? t('common.saving')
                  : editingActivity
                    ? t('common.saveChanges')
                    : t('adminActivity.saveDraft')}
              </button>
            </div>
          </form>
        )}

        <SectionCard className="mb-6" title={t('common.filters', { defaultValue: 'Filtres' })}>
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <label className="relative block">
              <AppIcon name="Search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label={t('common.search')}
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                placeholder={t('common.search', { defaultValue: 'Rechercher' })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </label>
            <select
              aria-label={t('users.status')}
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
        ) : error && activites.length === 0 && !showForm ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error}
            actionLabel={t('common.retry')}
            action={fetchActivites}
          />
        ) : activites.length === 0 ? (
          <EmptyState>{t('referentActivity.empty')}</EmptyState>
        ) : activitesFiltrees.length === 0 ? (
          <EmptyState>{t('common.noResults', { defaultValue: 'Aucun résultat trouvé.' })}</EmptyState>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {activitesFiltrees.map(activite => (
              <article key={activite.id} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative">
                  <ActivityCover
                    imageUrl={activite.imageUrl}
                    title={activite.titre}
                    categorie={activite.categorie}
                    theme={activite.theme}
                    className="h-36"
                  />
                  <div className="absolute left-4 top-4">
                    <StatusBadge status={activite.statut}>{t(`statuses.${activite.statut}`, activite.statut)}</StatusBadge>
                  </div>
                </div>
                <div className="p-5">
                  <h2 className="font-bold text-blue-900 text-lg">{activite.titre}</h2>
                  <ActivityVisibility activity={activite} showDraft />
                  <p className="mt-2 text-sm text-gray-600">{t('adminActivity.groupLabel')}: {activite.groupeNom || t('referentActivity.legacyGroup')}</p>
                  {!canManage(activite) && <p className="mt-2 text-sm text-red-700">{t('referentActivity.assignmentError')}</p>}
                  {activite.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{activite.description}</p>}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-4">
                    <InfoPill label={t('activities.form_place')} value={activite.lieu || '—'} />
                    <InfoPill label={t('activities.start_date')} value={formatDate(activite.dateDebut, i18n.language)} />
                    <InfoPill label={t('activities.end_date')} value={formatDate(activite.dateFin, i18n.language)} />
                    {activite.nombreInscrits != null && <InfoPill label={t('admin.participation')} value={activite.nombreInscrits} />}
                    <InfoPill
                      label={t('activities.form_price')}
                      value={activite.gratuite ? t('activities.free') : `${activite.prix} €`}
                    />
                    <InfoPill
                      label={t('activities.capacity')}
                      value={activite.capaciteMax > 0 ? t('activities.capacity_max', { count: activite.capaciteMax }) : t('activities.unlimited')}
                    />
                  </div>
                  {canManage(activite) && <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {activite.statut === 'BROUILLON' && <button type="button" onClick={() => setPublishingActivity(activite)} className="rounded-2xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white">{t('activities.publication.publish')}</button>}
                    {['BROUILLON', 'PUBLIEE'].includes(activite.statut) && (activite.statut === 'BROUILLON' ? ['ANNULEE'] : ['TERMINEE', 'ANNULEE']).map(statut => <button key={statut} type="button" disabled={changingStatus === activite.id} onClick={() => changeStatus(activite, statut)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50">{t(`activities.publication.${statut === 'TERMINEE' ? 'finish' : 'cancelActivity'}`)}</button>)}
                    <Link
                      to={`/referent/activites/${activite.id}/presences`}
                      className="mr-2 inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <AppIcon name="ClipboardList" className="h-4 w-4" />
                      {t('presence.title')}
                    </Link>
                    {['BROUILLON', 'PUBLIEE'].includes(activite.statut) && <button
                      type="button"
                      onClick={() => startEdit(activite)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                    >
                      <AppIcon name="Edit" className="h-4 w-4" />
                      {t('common.edit')}
                    </button>}
                  </div>}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      {cancellingActivity && <ActivityCancellationDialog onClose={() => setCancellingActivity(null)} onConfirm={() => changeStatus(cancellingActivity, 'ANNULEE', true)} />}
      {publishingActivity && <ActivityPublicationDialog fixedAudience forbiddenMessage={t('referentActivity.assignmentError')} audienceSummary={t(`adminActivity.${audienceKey(publishingActivity)}`, { group: publishingActivity.groupeNom })} activity={publishingActivity} onClose={() => setPublishingActivity(null)} onPublished={updated => {
        setActivites(current => current.map(item => item.id === updated.id ? updated : item))
        setPublishingActivity(null)
        setError('')
        setMessage(t('activities.publication.success'))
      }} />}
      <Footer />
    </div>
  )
}


function Alert({ type, children }) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-green-50 border-green-200 text-green-700'

  return <div className={`border px-4 py-3 rounded-xl mb-5 text-sm ${styles}`}>{children}</div>
}

function EmptyState({ children }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-gray-400 shadow-sm">
      <AppIcon name="Calendar" className="mx-auto mb-3 h-10 w-10 text-teal-200" />
      <p className="text-sm">{children}</p>
    </div>
  )
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
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${tones[tone] || tones.blue}`}>
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  )
}

function formatDate(value, language = 'fr') {
  return value ? new Date(value).toLocaleString(language) : '-'
}
