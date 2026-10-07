import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import AppIcon from '../../components/ui/AppIcons'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import LoadingState from '../../components/ui/LoadingState'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import StatusBadge from '../../components/StatusBadge'
import { userFriendlyError } from '../../utils/userFriendlyError'

const PRESENCE_STATUSES = ['NON_RENSEIGNEE', 'PRESENT', 'ABSENT', 'EXCUSE']

export default function PresenceSheet({ backTo = '/admin/activites', tone = 'blue' }) {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const [presences, setPresences] = useState([])
  const [activite, setActivite] = useState(null)
  const [activityStarted, setActivityStarted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [drafts, setDrafts] = useState({})
  const [presenceFilter, setPresenceFilter] = useState('TOUS')

  const fetchPresences = useCallback(async () => {
    setLoading(true)
    try {
      const [response, activityResponse] = await Promise.all([
        api.get(`/activites/${id}/presences`),
        api.get(`/activites/${id}`),
      ])
      setActivite(activityResponse.data)
      setActivityStarted(Boolean(activityResponse.data.dateDebut)
        && new Date(activityResponse.data.dateDebut).getTime() <= Date.now())
      const data = Array.isArray(response.data) ? response.data : []
      setPresences(data)
      setDrafts(buildDrafts(data))
      setError('')
    } catch (err) {
      setError(userFriendlyError(err, t('presence.errors.load')))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => {
    fetchPresences()
  }, [fetchPresences])

  const sheetClosed = presences.some(p => p.statutInscription !== 'ANNULEE' && Boolean(p.dateValidationPresence))
  const actionablePresences = presences.filter(p => p.statutInscription !== 'ANNULEE')
  const readOnlyReason = sheetClosed ? 'sheetClosed'
    : activite?.statut === 'ANNULEE' ? 'cancelled'
    : activite?.statut === 'TERMINEE' ? 'finished'
    : activite?.statut !== 'PUBLIEE' ? 'draft'
    : !activityStarted ? 'notStarted'
    : null
  const readOnly = Boolean(readOnlyReason)
  const changedPresences = actionablePresences.filter(p => {
    const draft = drafts[p.inscriptionId]
    return draft && (draft.statutPresence !== (p.statutPresence || 'NON_RENSEIGNEE')
      || draft.commentairePresence !== (p.commentairePresence || ''))
  })
  const hasChanges = changedPresences.length > 0
  const incomplete = actionablePresences.some(p => !p.statutPresence || p.statutPresence === 'NON_RENSEIGNEE')

  const stats = useMemo(() => PRESENCE_STATUSES.reduce((acc, status) => {
    acc[status] = presences.filter(p => p.statutInscription !== 'ANNULEE' && (p.statutPresence || 'NON_RENSEIGNEE') === status).length
    return acc
  }, {}), [presences])
  const attendanceRate = useMemo(() => {
    const denominator = (stats.PRESENT || 0) + (stats.ABSENT || 0) + (stats.EXCUSE || 0)
    return denominator > 0 ? Math.round(((stats.PRESENT || 0) / denominator) * 100) : 0
  }, [stats])
  const filteredPresences = useMemo(() => {
    if (presenceFilter === 'TOUS') return presences
    return presences.filter(p => (p.statutPresence || 'NON_RENSEIGNEE') === presenceFilter)
  }, [presenceFilter, presences])

  const updateDraft = (inscriptionId, patch) => {
    setDrafts(current => ({
      ...current,
      [inscriptionId]: {
        ...(current[inscriptionId] || {}),
        ...patch,
      },
    }))
    setMessage('')
  }

  const saveChanges = async () => {
    if (readOnly || !hasChanges || saving) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        presences: changedPresences.map(p => ({
          inscriptionId: p.inscriptionId,
          statutPresence: drafts[p.inscriptionId].statutPresence,
          commentairePresence: drafts[p.inscriptionId].commentairePresence,
        })),
      }
      const response = await api.patch(`/activites/${id}/presences/bulk`, payload)
      const updated = Array.isArray(response.data) ? response.data : []
      setPresences(current => mergePresences(current, updated))
      setDrafts(current => ({ ...current, ...buildDrafts(updated) }))
      setMessage(t('presence.messages.bulkSaved'))
    } catch (err) {
      setError(userFriendlyError(err, t('presence.errors.bulk')))
    } finally {
      setSaving(false)
    }
  }

  const closeSheet = async () => {
    if (readOnly || hasChanges || incomplete || saving || actionablePresences.length === 0) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await api.post(`/activites/${id}/presences/cloturer`)
      await fetchPresences()
      setMessage(t('presence.messages.closed'))
    } catch (err) {
      setError(userFriendlyError(err, t('presence.errors.close')))
    } finally {
      setSaving(false)
    }
  }

  const buttonTone = tone === 'teal'
    ? 'bg-teal-700 hover:bg-teal-600 focus:ring-teal-300'
    : 'bg-blue-700 hover:bg-blue-600 focus:ring-blue-300'

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <PageHeader
          eyebrow={t('presence.eyebrow')}
          title={activite?.titre || t('presence.activityFallback')}
          description={t('presence.description')}
          action={(
            <Link
              to={backTo}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <AppIcon name="ArrowRight" className="h-4 w-4 rotate-180" />
              {t('presence.backToActivities')}
            </Link>
          )}
        />

        {loading ? (
          <LoadingState label={t('presence.loading')} />
        ) : error && presences.length === 0 ? (
          <ErrorState
            title={t('presence.errors.loadTitle')}
            description={error}
            actionLabel={t('common.retry')}
            action={fetchPresences}
          />
        ) : presences.length === 0 ? (
          <EmptyState
            icon="ClipboardList"
            title={t('presence.empty.title')}
            description={t('presence.empty.description')}
            actionLabel={t('presence.backToActivities')}
            actionTo={backTo}
          />
        ) : (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <PresenceStat label={t('presence.statuses.PRESENT')} value={stats.PRESENT || 0} icon="CheckCircle" tone="green" />
              <PresenceStat label={t('presence.statuses.ABSENT')} value={stats.ABSENT || 0} icon="XCircle" tone="red" />
              <PresenceStat label={t('presence.statuses.EXCUSE')} value={stats.EXCUSE || 0} icon="Clock" tone="amber" />
              <PresenceStat label={t('presence.statuses.NON_RENSEIGNEE')} value={stats.NON_RENSEIGNEE || 0} icon="ClipboardList" tone="slate" />
              <PresenceStat label={t('presence.attendanceRate')} value={`${attendanceRate}%`} icon="BarChart3" tone="blue" />
            </div>

            {message && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {message}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
            {readOnlyReason && (
              <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                {t(`presence.${readOnlyReason}`)}
              </div>
            )}

            {!readOnly && (hasChanges || incomplete) && (
              <p role="status" className="mb-4 text-sm text-amber-800">
                {t(hasChanges ? 'presence.unsaved' : 'presence.incomplete')}
              </p>
            )}
            <SectionCard className="mb-6" title={t('presence.bulkActions')}>
              <div className="flex flex-wrap gap-2">
                <ActionButton disabled={saving || readOnly || !hasChanges} onClick={saveChanges}>
                  {t('common.save')}
                </ActionButton>
                <button
                  type="button"
                  disabled={saving || readOnly || hasChanges || incomplete || actionablePresences.length === 0}
                  onClick={closeSheet}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-300 ${buttonTone}`}
                >
                  <AppIcon name="Save" className="h-4 w-4" />
                  {saving ? t('common.saving') : t('presence.actions.closeSheet')}
                </button>
              </div>
            </SectionCard>

            <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
              {['TOUS', ...PRESENCE_STATUSES.filter(status => status !== 'NON_RENSEIGNEE'), 'NON_RENSEIGNEE'].map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setPresenceFilter(status)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    presenceFilter === status
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  {status === 'TOUS' ? t('presence.filters.all') : t(`presence.statuses.${status}`)}
                </button>
              ))}
            </div>

            <div className="space-y-3 md:hidden">
              {filteredPresences.map(presence => (
                <PresenceCard
                  key={presence.inscriptionId}
                  presence={presence}
                  draft={drafts[presence.inscriptionId] || {}}
                  disabled={saving || readOnly || presence.statutInscription === 'ANNULEE'}
                  language={i18n.language}
                  onDraft={patch => updateDraft(presence.inscriptionId, patch)}
                  t={t}
                />
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{t('presence.table.member')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{t('presence.table.registration')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{t('presence.table.presence')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{t('presence.table.comment')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{t('presence.validation')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPresences.map(presence => {
                      const draft = drafts[presence.inscriptionId] || {}
                      const disabled = saving || readOnly || presence.statutInscription === 'ANNULEE'
                      return (
                        <tr key={presence.inscriptionId} className="border-b border-slate-50 transition hover:bg-blue-50/40">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{fullName(presence)}</p>
                            <p className="text-xs text-slate-500">{presence.membreEmail}</p>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={presence.statutInscription}>
                              {t(`statuses.${presence.statutInscription}`, { defaultValue: presence.statutInscription })}
                            </StatusBadge>
                            <p className="mt-1 text-xs text-slate-400">
                              {formatDate(presence.dateInscription, i18n.language)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              aria-label={t('presence.table.presence')}
                              value={draft.statutPresence || 'NON_RENSEIGNEE'}
                              disabled={disabled}
                              onChange={e => updateDraft(presence.inscriptionId, { statutPresence: e.target.value })}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-100"
                            >
                              {PRESENCE_STATUSES.map(status => (
                                <option key={status} value={status}>{t(`presence.statuses.${status}`)}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={draft.commentairePresence || ''}
                              disabled={disabled}
                              onChange={e => updateDraft(presence.inscriptionId, { commentairePresence: e.target.value })}
                              aria-label={t('presence.table.comment')}
                              placeholder={t('presence.commentPlaceholder')}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-4 py-3">
                            {presence.dateValidationPresence && (
                              <p className="mt-2 text-xs text-slate-400">
                                {t('presence.validatedAt', { date: formatDate(presence.dateValidationPresence, i18n.language) })}
                              </p>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

function PresenceCard({ presence, draft, disabled, language, onDraft, t }) {
  return (
    <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">{fullName(presence)}</h2>
          <p className="truncate text-xs text-slate-500">{presence.membreEmail}</p>
        </div>
        <StatusBadge status={presence.statutInscription}>
          {t(`statuses.${presence.statutInscription}`, { defaultValue: presence.statutInscription })}
        </StatusBadge>
      </div>
      <div className="grid gap-3">
        <select
          aria-label={t('presence.table.presence')}
          value={draft.statutPresence || 'NON_RENSEIGNEE'}
          disabled={disabled}
          onChange={e => onDraft({ statutPresence: e.target.value })}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
        >
          {PRESENCE_STATUSES.map(status => (
            <option key={status} value={status}>{t(`presence.statuses.${status}`)}</option>
          ))}
        </select>
        <textarea
          value={draft.commentairePresence || ''}
          disabled={disabled}
          onChange={e => onDraft({ commentairePresence: e.target.value })}
          aria-label={t('presence.table.comment')}
          rows={2}
          placeholder={t('presence.commentPlaceholder')}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
        />
        {presence.dateValidationPresence && (
          <p className="text-xs text-slate-400">
            {t('presence.validatedAt', { date: formatDate(presence.dateValidationPresence, language) })}
          </p>
        )}
      </div>
    </article>
  )
}

function PresenceStat({ label, value, icon, tone }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    red: 'bg-red-50 text-red-700 ring-red-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    slate: 'bg-slate-50 text-slate-700 ring-slate-100',
  }
  return (
    <div role="group" aria-label={label} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${tones[tone] || tones.slate}`}>
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
    </div>
  )
}

function ActionButton({ children, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
    >
      {children}
    </button>
  )
}

function buildDrafts(presences) {
  return presences.reduce((acc, presence) => {
    acc[presence.inscriptionId] = {
      statutPresence: presence.statutPresence || 'NON_RENSEIGNEE',
      commentairePresence: presence.commentairePresence || '',
    }
    return acc
  }, {})
}

function mergePresences(current, updated) {
  const byId = new Map(updated.map(item => [item.inscriptionId, item]))
  return current.map(item => byId.get(item.inscriptionId) || item)
}

function fullName(presence) {
  const name = `${presence.membrePrenom || ''} ${presence.membreNom || ''}`.trim()
  return name || presence.membreEmail || '-'
}

function formatDate(value, language = 'fr') {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(language)
}
