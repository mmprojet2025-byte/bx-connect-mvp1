import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import SuperAdminLayout from '../../layouts/SuperAdminLayout'
import AppIcon from '../../components/ui/AppIcons'

export default function SuperAdminDashboard() {
  const { t, i18n } = useTranslation()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/super-admin/dashboard')
      .then(res => setDashboard(res.data))
      .catch(() => setError(t('superAdmin.errorDashboardLoad')))
      .finally(() => setLoading(false))
  }, [t])

  return (
    <SuperAdminLayout
      title={t('superAdmin.dashboardTitle')}
      subtitle={t('superAdmin.dashboardSubtitle')}
    >
      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <p className="text-slate-400 text-center py-10">{t('common.loading')}</p>
      ) : dashboard && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard label={t('superAdmin.activeAdmins')} value={dashboard.adminsActifs} color="#2563eb" icon="Shield" />
            <StatCard label={t('superAdmin.inactiveAdmins')} value={dashboard.adminsInactifs} color="#d97706" icon="Clock" />
            <StatCard label={t('superAdmin.criticalActions')} value={dashboard.totalActionsCritiques} color="#7c3aed" icon="BarChart" />
          </div>

          <SupervisionSection dashboard={dashboard} t={t} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Link to="/super-admin/admins" className="bg-white rounded-[1.75rem] border border-slate-100 shadow-lg shadow-slate-900/5 p-5 hover:-translate-y-1 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <AppIcon name="Shield" className="h-5 w-5" />
              </div>
              <h2 className="font-bold text-slate-950 mb-1">{t('superAdmin.adminsTitle')}</h2>
              <p className="text-sm text-slate-500">{t('superAdmin.adminsDescription')}</p>
            </Link>

            <Link to="/super-admin/logs" className="bg-white rounded-[1.75rem] border border-slate-100 shadow-lg shadow-slate-900/5 p-5 hover:-translate-y-1 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <AppIcon name="BarChart" className="h-5 w-5" />
              </div>
              <h2 className="font-bold text-slate-950 mb-1">{t('superAdmin.logsTitle')}</h2>
              <p className="text-sm text-slate-500">{t('superAdmin.logsDescription')}</p>
            </Link>
          </div>

          <section className="mt-8 bg-white rounded-[1.75rem] border border-slate-100 shadow-lg shadow-slate-900/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-slate-950">{t('superAdmin.latestLogs')}</h2>
            </div>
            <LogPreview logs={dashboard.derniersLogs || []} t={t} language={i18n.language} />
          </section>
        </>
      )}
    </SuperAdminLayout>
  )
}

function SupervisionSection({ dashboard, t }) {
  const logs = dashboard.derniersLogs || []
  const inactiveAdmins = dashboard.adminsInactifs || 0
  const criticalActions = dashboard.totalActionsCritiques || 0

  return (
    <section className="mb-8 rounded-[1.75rem] border border-indigo-100 bg-white p-5 shadow-lg shadow-indigo-950/5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-indigo-700">
            {t('superAdmin.supervisionEyebrow', { defaultValue: 'Contrôle plateforme' })}
          </p>
          <h2 className="text-xl font-black text-slate-950">
            {t('superAdmin.supervisionTitle', { defaultValue: 'Supervision' })}
          </h2>
        </div>
        <Link to="/super-admin/logs" className="text-sm font-bold text-indigo-700 hover:underline">
          {t('superAdmin.logsTitle')}
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-3 md:grid-cols-3">
          <SupervisionCard
            icon="Shield"
            title={t('superAdmin.activeAdmins')}
            value={dashboard.adminsActifs || 0}
            description={t('superAdmin.adminsDescription')}
            to="/super-admin/admins"
          />
          <SupervisionCard
            icon="Clock"
            title={t('superAdmin.inactiveAdmins')}
            value={inactiveAdmins}
            description={inactiveAdmins > 0
              ? t('superAdmin.inactiveAdminsAlert', { defaultValue: 'Comptes administrateurs à contrôler.' })
              : t('superAdmin.noInactiveAdmins', { defaultValue: 'Aucun compte administrateur inactif à signaler.' })}
            to="/super-admin/admins"
            highlight={inactiveAdmins > 0}
          />
          <SupervisionCard
            icon="BarChart"
            title={t('superAdmin.criticalActions')}
            value={criticalActions}
            description={logs.length > 0
              ? t('superAdmin.latestSensitiveActions', { count: logs.length, defaultValue: `${logs.length} action(s) sensible(s) récente(s)` })
              : t('audit.noCriticalLog')}
            to="/super-admin/logs"
            highlight={criticalActions > 0}
          />
        </div>

        <div className="grid content-start gap-3">
          <Link to="/super-admin/admins" className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-700 transition hover:bg-white hover:text-indigo-700 hover:shadow-md">
            {t('superAdmin.adminsTitle')}
          </Link>
          <Link to="/super-admin/logs" className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-700 transition hover:bg-white hover:text-indigo-700 hover:shadow-md">
            {t('superAdmin.logsTitle')}
          </Link>
          <Link to="/super-admin/admins" className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-700 transition hover:bg-white hover:text-indigo-700 hover:shadow-md">
            {t('superAdmin.manageAccess', { defaultValue: 'Gérer les accès' })}
          </Link>
        </div>
      </div>
    </section>
  )
}

function SupervisionCard({ icon, title, value, description, to, highlight = false }) {
  return (
    <Link
      to={to}
      className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
        highlight ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50 hover:bg-white'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${highlight ? 'bg-white text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
          <AppIcon name={icon} className="h-5 w-5" />
        </span>
        <span className={`text-2xl font-black ${highlight ? 'text-amber-800' : 'text-slate-950'}`}>{value}</span>
      </div>
      <h3 className="font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
    </Link>
  )
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="bg-white rounded-[1.75rem] border border-slate-100 shadow-lg shadow-slate-900/5 p-5 transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-3xl font-bold" style={{ color }}>{value}</div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50" style={{ color }}>
          <AppIcon name={icon} className="h-5 w-5" />
        </span>
      </div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  )
}

function LogPreview({ logs, t, language }) {
  if (logs.length === 0) {
    return <p className="text-sm text-slate-400 px-5 py-6">{t('audit.noCriticalLog')}</p>
  }

  return (
    <div className="divide-y divide-gray-100">
      {logs.slice(0, 5).map(log => (
        <div key={log.id} className="px-5 py-3 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-1 transition hover:bg-slate-50">
          <div>
            <span className="font-semibold text-slate-950">{log.action}</span>
            <span className="text-slate-500"> · {log.cibleEmail}</span>
          </div>
          <span className="text-xs text-slate-400">{formatDate(log.dateAction, language)}</span>
        </div>
      ))}
    </div>
  )
}

function Alert({ type, children }) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-green-50 border-green-200 text-green-700'

  return <div className={`border px-4 py-3 rounded-xl mb-5 text-sm ${styles}`}>{children}</div>
}

function formatDate(value, language = 'fr') {
  return value ? new Date(value).toLocaleString(language) : '-'
}
