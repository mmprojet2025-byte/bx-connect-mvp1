import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import SuperAdminLayout from '../../layouts/SuperAdminLayout'

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
        <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
      ) : dashboard && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard label={t('superAdmin.activeAdmins')} value={dashboard.adminsActifs} color="#2563eb" />
            <StatCard label={t('superAdmin.inactiveAdmins')} value={dashboard.adminsInactifs} color="#d97706" />
            <StatCard label={t('superAdmin.criticalActions')} value={dashboard.totalActionsCritiques} color="#7c3aed" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Link to="/super-admin/admins" className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 hover:-translate-y-1 hover:shadow-md transition">
              <h2 className="font-bold text-blue-900 mb-1">{t('superAdmin.adminsTitle')}</h2>
              <p className="text-sm text-gray-500">{t('superAdmin.adminsDescription')}</p>
            </Link>

            <Link to="/super-admin/logs" className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 hover:-translate-y-1 hover:shadow-md transition">
              <h2 className="font-bold text-blue-900 mb-1">{t('superAdmin.logsTitle')}</h2>
              <p className="text-sm text-gray-500">{t('superAdmin.logsDescription')}</p>
            </Link>
          </div>

          <section className="mt-8 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-blue-900">{t('superAdmin.latestLogs')}</h2>
            </div>
            <LogPreview logs={dashboard.derniersLogs || []} t={t} language={i18n.language} />
          </section>
        </>
      )}
    </SuperAdminLayout>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="text-3xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}

function LogPreview({ logs, t, language }) {
  if (logs.length === 0) {
    return <p className="text-sm text-gray-400 px-5 py-6">{t('audit.noCriticalLog')}</p>
  }

  return (
    <div className="divide-y divide-gray-100">
      {logs.slice(0, 5).map(log => (
        <div key={log.id} className="px-5 py-3 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-1">
          <div>
            <span className="font-semibold text-blue-900">{log.action}</span>
            <span className="text-gray-500"> · {log.cibleEmail}</span>
          </div>
          <span className="text-xs text-gray-400">{formatDate(log.dateAction, language)}</span>
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
