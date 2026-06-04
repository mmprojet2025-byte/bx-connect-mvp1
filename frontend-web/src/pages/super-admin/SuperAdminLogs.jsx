import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import SuperAdminLayout from '../../layouts/SuperAdminLayout'
import AppIcon from '../../components/ui/AppIcons'
import SectionCard from '../../components/ui/SectionCard'

export default function SuperAdminLogs() {
  const { t, i18n } = useTranslation()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recherche, setRecherche] = useState('')

  useEffect(() => {
    api.get('/super-admin/logs')
      .then(res => setLogs(res.data))
      .catch(() => setError(t('superAdmin.errorLogsLoad')))
      .finally(() => setLoading(false))
  }, [t])

  const logsFiltres = logs.filter(log => {
    const texte = `${log.action || ''} ${log.acteurEmail || ''} ${log.acteurRole || ''} ${log.cibleEmail || ''} ${log.details || ''}`.toLowerCase()
    return texte.includes(recherche.toLowerCase())
  })

  return (
    <SuperAdminLayout
      title={t('superAdmin.logsTitle')}
      subtitle={t('superAdmin.logsSubtitle')}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
      ) : (
        <>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon="BarChart" label={t('common.total', { defaultValue: 'Total' })} value={logs.length} tone="blue" />
          <StatCard icon="Search" label={t('common.results', { defaultValue: 'Résultats' })} value={logsFiltres.length} tone="green" />
          <StatCard icon="Shield" label={t('audit.action')} value={new Set(logs.map(log => log.action)).size} tone="violet" />
        </div>

        <SectionCard className="mb-6" title={t('common.filters', { defaultValue: 'Filtres' })}>
          <label className="relative block">
            <AppIcon name="Search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder={t('common.search', { defaultValue: 'Rechercher' })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>
        </SectionCard>

        <div className="space-y-4 md:hidden">
          {logsFiltres.length === 0 ? (
            <ModernEmpty icon="BarChart" title={t('audit.noCriticalLog')} />
          ) : logsFiltres.map(log => (
            <article key={log.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                  <AppIcon name="Shield" className="h-3.5 w-3.5" />
                  {log.action}
                </span>
                <span className="text-xs text-gray-400">{formatDate(log.dateAction, i18n.language)}</span>
              </div>
              <p className="text-sm font-semibold text-blue-900">{log.acteurEmail}</p>
              <p className="text-xs text-gray-400">{log.acteurRole}</p>
              {log.cibleEmail && <p className="mt-3 text-sm text-gray-600">{log.cibleEmail}</p>}
              {log.details && <p className="mt-2 text-xs text-gray-500">{log.details}</p>}
            </article>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: '900px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('audit.date')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('audit.action')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('audit.actor')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('audit.target')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('audit.details')}</th>
                </tr>
              </thead>
              <tbody>
                {logsFiltres.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">{t('audit.noCriticalLog')}</td>
                  </tr>
                ) : logsFiltres.map((log, index) => (
                  <tr key={log.id} className={`border-b border-gray-50 transition hover:bg-blue-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(log.dateAction, i18n.language)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                        <AppIcon name="Shield" className="h-3.5 w-3.5" />
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-blue-900">{log.acteurEmail}</div>
                      <div className="text-xs text-gray-400">{log.acteurRole}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.cibleEmail || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{log.details || '-'}</td>
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

function StatCard({ icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  }
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${tones[tone] || tones.blue}`}>
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
    </div>
  )
}

function ModernEmpty({ icon, title }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-gray-400 shadow-sm">
      <AppIcon name={icon} className="mx-auto mb-3 h-10 w-10 text-blue-300" />
      <p className="text-sm">{title}</p>
    </div>
  )
}

function formatDate(value, language = 'fr') {
  return value ? new Date(value).toLocaleString(language) : '-'
}
