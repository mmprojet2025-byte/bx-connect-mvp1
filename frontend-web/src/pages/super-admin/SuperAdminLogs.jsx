import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import SuperAdminLayout from '../../layouts/SuperAdminLayout'
import AppIcon from '../../components/ui/AppIcons'
import SectionCard from '../../components/ui/SectionCard'
import ErrorState from '../../components/ui/ErrorState'
import LoadingState from '../../components/ui/LoadingState'

const ACTION_LABEL_KEYS = {
  BOOTSTRAP_SUPER_ADMIN_CREATED: 'bootstrapSuperAdminCreated',
  CREATE_ADMIN: 'createAdmin',
  DISABLE_ADMIN: 'disableAdmin',
  ENABLE_ADMIN: 'enableAdmin',
  RESET_ADMIN_PASSWORD: 'resetAdminPassword',
}

const TECHNICAL_ROLES = ['SUPER_ADMIN', 'SYSTEM']
const TECHNICAL_TARGET_TYPES = ['USER']

export default function SuperAdminLogs() {
  const { t, i18n } = useTranslation()
  const [logs, setLogs] = useState([])
  const [filterOptions, setFilterOptions] = useState({
    actions: [],
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
          })
        }
      })
      .catch(() => setError(t('superAdmin.errorLogsLoad')))
      .finally(() => setLoading(false))
  }, [filters, t])

  const stats = useMemo(() => ({
    total: logs.length,
    actions: new Set(logs.map(log => log.action).filter(Boolean)).size,
  }), [logs])

  const resetFilters = () => setFilters({ action: '', cibleType: '', acteurRole: '' })

  return (
    <SuperAdminLayout
      title={t('superAdmin.logsTitle')}
      subtitle={t('superAdmin.logsSubtitle')}
    >
      {error && logs.length > 0 && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard icon="ClipboardList" label={t('common.total', { defaultValue: 'Total' })} value={stats.total} tone="blue" />
        <StatCard icon="Shield" label={t('audit.action')} value={stats.actions} tone="violet" />
      </div>

      <SectionCard className="mb-5" title={t('common.filters', { defaultValue: 'Filtres' })}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label={t('audit.action')}
            value={filters.action}
            options={filterOptions.actions}
            formatOption={option => formatAction(option, t)}
            onChange={value => setFilters(current => ({ ...current, action: value }))}
            t={t}
          />
          <FilterSelect
            label={t('audit.targetType')}
            value={filters.cibleType}
            options={TECHNICAL_TARGET_TYPES}
            onChange={value => setFilters(current => ({ ...current, cibleType: value }))}
            t={t}
          />
          <FilterSelect
            label={t('audit.actorRole')}
            value={filters.acteurRole}
            options={TECHNICAL_ROLES}
            onChange={value => setFilters(current => ({ ...current, acteurRole: value }))}
            t={t}
          />
          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <AppIcon name="X" className="h-4 w-4" />
              {t('common.reset')}
            </button>
          </div>
        </div>
      </SectionCard>

      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : error && logs.length === 0 ? (
        <ErrorState
          title={t('common.loadErrorTitle')}
          description={error}
        />
      ) : (
        <>
          <div className="space-y-3 xl:hidden">
            {logs.length === 0 ? (
              <ModernEmpty icon="ClipboardList" title={t('audit.noTechnicalLog')} />
            ) : logs.map(log => (
              <LogMobileCard key={log.id} log={log} language={i18n.language} t={t} />
            ))}
          </div>

          <div className="hidden min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm xl:block">
              <table className="w-full table-fixed border-collapse">
                <caption className="sr-only">{t('audit.technicalTableCaption')}</caption>
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <HeaderCell>{t('audit.date')}</HeaderCell>
                    <HeaderCell>{t('audit.role')}</HeaderCell>
                    <HeaderCell>{t('audit.action')}</HeaderCell>
                    <HeaderCell>{t('audit.targetType')}</HeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-sm text-gray-400">
                        {t('audit.noTechnicalLog')}
                      </td>
                    </tr>
                  ) : logs.map((log, index) => (
                    <tr key={log.id} className={`border-b border-gray-50 align-top transition hover:bg-blue-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      <td className="break-words px-4 py-3 text-xs text-gray-500">{formatDate(log.dateAction, i18n.language)}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={log.acteurRole} />
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={log.action} t={t} />
                      </td>
                      <td className="break-words px-4 py-3 text-sm font-medium text-slate-700">{log.cibleType || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

function FilterSelect({ label, value, options, onChange, formatOption = value => value, t }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <option value="">{t('common.all')}</option>
        {options.map(option => (
          <option key={option} value={option}>{formatOption(option)}</option>
        ))}
      </select>
    </label>
  )
}

function LogMobileCard({ log, language, t }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <ActionBadge action={log.action} t={t} />
        <time dateTime={log.dateAction || undefined} className="shrink-0 text-xs text-gray-400">{formatDate(log.dateAction, language)}</time>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <RoleBadge role={log.acteurRole} />
        <span className="inline-flex rounded-lg bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
          {log.cibleType || '-'}
        </span>
      </div>
    </article>
  )
}

function ActionBadge({ action, t }) {
  return (
    <span className="inline-flex max-w-[240px] items-center gap-1.5 rounded-lg bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
      <AppIcon name="Shield" className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{formatAction(action, t)}</span>
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

function formatAction(action, t) {
  const key = ACTION_LABEL_KEYS[action]
  return key ? t(`audit.actions.${key}`) : t('audit.unknownAction', { action: humanize(action) })
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
