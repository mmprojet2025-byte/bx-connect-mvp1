import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import SuperAdminLayout from '../../layouts/SuperAdminLayout'
import AppIcon from '../../components/ui/AppIcons'
import SectionCard from '../../components/ui/SectionCard'

const ACTION_LABELS = {
  PROJECT_APPROVED: 'Projet validé',
  GROUP_ADHESION_ACCEPTED: 'Adhésion acceptée',
  SUPPORT_APPROVED: 'Soutien validé',
  OPPORTUNITY_PUBLISHED: 'Opportunité publiée',
  PROJECT_REJECTED: 'Projet refusé',
  GROUP_VALIDATED: 'Groupe validé',
  GROUP_REJECTED: 'Groupe refusé',
  SUPPORT_REJECTED: 'Soutien refusé',
  OPPORTUNITY_REJECTED: 'Opportunité refusée',
  ACTIVITY_PUBLISHED: 'Activité publiée',
}

export default function SuperAdminLogs() {
  const { t, i18n } = useTranslation()
  const [logs, setLogs] = useState([])
  const [filterOptions, setFilterOptions] = useState({
    actions: [],
    cibleTypes: [],
    roles: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    action: '',
    cibleType: '',
    acteurRole: '',
  })

  useEffect(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    params.set('limit', '100')

    setLoading(true)
    setError('')
    api.get(`/super-admin/logs/search?${params.toString()}`)
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : []
        setLogs(data)
        if (!filters.action && !filters.cibleType && !filters.acteurRole) {
          setFilterOptions({
            actions: unique(data.map(log => log.action)),
            cibleTypes: unique(data.map(log => log.cibleType)),
            roles: unique(data.map(log => log.acteurRole)),
          })
        }
      })
      .catch(() => setError(t('superAdmin.errorLogsLoad')))
      .finally(() => setLoading(false))
  }, [filters, t])

  const stats = useMemo(() => ({
    total: logs.length,
    actions: new Set(logs.map(log => log.action).filter(Boolean)).size,
    statuts: logs.filter(log => log.ancienStatut || log.nouveauStatut).length,
  }), [logs])

  const resetFilters = () => setFilters({ action: '', cibleType: '', acteurRole: '' })

  return (
    <SuperAdminLayout
      title={t('superAdmin.logsTitle')}
      subtitle={t('superAdmin.logsSubtitle')}
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon="ClipboardList" label={t('common.total', { defaultValue: 'Total' })} value={stats.total} tone="blue" />
        <StatCard icon="Shield" label={t('audit.action')} value={stats.actions} tone="violet" />
        <StatCard icon="Activity" label="Changements d'état" value={stats.statuts} tone="green" />
      </div>

      <SectionCard className="mb-5" title={t('common.filters', { defaultValue: 'Filtres' })}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FilterSelect
            label={t('audit.action')}
            value={filters.action}
            options={filterOptions.actions}
            formatOption={formatAction}
            onChange={value => setFilters(current => ({ ...current, action: value }))}
          />
          <FilterSelect
            label="Type de cible"
            value={filters.cibleType}
            options={filterOptions.cibleTypes}
            onChange={value => setFilters(current => ({ ...current, cibleType: value }))}
          />
          <FilterSelect
            label="Rôle acteur"
            value={filters.acteurRole}
            options={filterOptions.roles}
            onChange={value => setFilters(current => ({ ...current, acteurRole: value }))}
          />
          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <AppIcon name="X" className="h-4 w-4" />
              Réinitialiser
            </button>
          </div>
        </div>
      </SectionCard>

      {loading ? (
        <p className="py-10 text-center text-gray-400">{t('common.loading')}</p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {logs.length === 0 ? (
              <ModernEmpty icon="ClipboardList" title={t('audit.noCriticalLog')} />
            ) : logs.map(log => (
              <LogMobileCard key={log.id} log={log} language={i18n.language} />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '1080px' }}>
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <HeaderCell>{t('audit.date')}</HeaderCell>
                    <HeaderCell>{t('audit.actor')}</HeaderCell>
                    <HeaderCell>Rôle</HeaderCell>
                    <HeaderCell>{t('audit.action')}</HeaderCell>
                    <HeaderCell>{t('audit.target')}</HeaderCell>
                    <HeaderCell>Ancien statut</HeaderCell>
                    <HeaderCell>Nouveau statut</HeaderCell>
                    <HeaderCell>{t('audit.details')}</HeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-sm text-gray-400">
                        {t('audit.noCriticalLog')}
                      </td>
                    </tr>
                  ) : logs.map((log, index) => (
                    <tr key={log.id} className={`border-b border-gray-50 align-top transition hover:bg-blue-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(log.dateAction, i18n.language)}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-semibold text-slate-900">{log.acteurEmail || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={log.acteurRole} />
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div className="font-medium text-slate-800">{formatTarget(log)}</div>
                        <div className="mt-1 text-xs text-slate-400">{log.cibleType || '-'}</div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge value={log.ancienStatut} /></td>
                      <td className="px-4 py-3"><StatusBadge value={log.nouveauStatut} strong /></td>
                      <td className="px-4 py-3">
                        <LogDetails log={log} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </SuperAdminLayout>
  )
}

function HeaderCell({ children }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
      {children}
    </th>
  )
}

function FilterSelect({ label, value, options, onChange, formatOption = value => value }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <option value="">Tous</option>
        {options.map(option => (
          <option key={option} value={option}>{formatOption(option)}</option>
        ))}
      </select>
    </label>
  )
}

function LogMobileCard({ log, language }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <ActionBadge action={log.action} />
        <span className="text-xs text-gray-400">{formatDate(log.dateAction, language)}</span>
      </div>
      <p className="text-sm font-semibold text-slate-900">{log.acteurEmail || '-'}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <RoleBadge role={log.acteurRole} />
        <StatusBadge value={log.ancienStatut} />
        <StatusBadge value={log.nouveauStatut} strong />
      </div>
      <p className="mt-3 text-sm text-slate-600">{formatTarget(log)}</p>
      <LogDetails log={log} compact />
    </article>
  )
}

function ActionBadge({ action }) {
  return (
    <span className="inline-flex max-w-[240px] items-center gap-1.5 rounded-lg bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
      <AppIcon name="Shield" className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{formatAction(action)}</span>
    </span>
  )
}

function RoleBadge({ role }) {
  return (
    <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
      {role || '-'}
    </span>
  )
}

function StatusBadge({ value, strong = false }) {
  if (!value) {
    return <span className="text-xs text-slate-300">-</span>
  }
  return (
    <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${strong ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      {value}
    </span>
  )
}

function LogDetails({ log, compact = false }) {
  const metadata = parseMetadata(log.metadataJson)
  const entries = Object.entries(metadata)

  if (!log.details && entries.length === 0) {
    return <span className="text-xs text-slate-300">-</span>
  }

  return (
    <details className={compact ? 'mt-3' : ''}>
      <summary className="cursor-pointer text-xs font-semibold text-blue-700 hover:text-blue-900">
        Voir les détails
      </summary>
      <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
        {log.details && <p className="mb-2">{log.details}</p>}
        {entries.length > 0 && (
          <dl className="grid grid-cols-1 gap-1.5">
            {entries.map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <dt className="min-w-24 font-semibold text-slate-500">{formatMetadataKey(key)}</dt>
                <dd className="break-all text-slate-700">{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </details>
  )
}

function StatCard({ icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  }
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${tones[tone] || tones.blue}`}>
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
    </div>
  )
}

function ModernEmpty({ icon, title }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-gray-400 shadow-sm">
      <AppIcon name={icon} className="mx-auto mb-3 h-10 w-10 text-blue-300" />
      <p className="text-sm">{title}</p>
    </div>
  )
}

function formatAction(action) {
  return ACTION_LABELS[action] || humanize(action)
}

function formatTarget(log) {
  return log.cibleNom || log.cibleEmail || (log.cibleId ? `#${log.cibleId}` : '-')
}

function parseMetadata(metadataJson) {
  if (!metadataJson) return {}
  try {
    const parsed = JSON.parse(metadataJson)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function formatMetadataKey(key) {
  return humanize(key).replace('Id', 'ID')
}

function humanize(value) {
  if (!value) return '-'
  return String(value)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/^\p{L}/u, letter => letter.toUpperCase())
}

function formatDate(value, language = 'fr') {
  return value ? new Date(value).toLocaleString(language) : '-'
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort()
}
