import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import AppIcon from '../../components/ui/AppIcons'
import { CollaborativeDashboardLayout } from '../../components/dashboard/CollaborativeDashboard'

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
    <CollaborativeDashboardLayout
      role="SUPER_ADMIN"
      emoji="Shield"
      title={t('superAdmin.dashboardTitle')}
      subtitle={t('superAdmin.platformWatch', { defaultValue: 'Plateforme sous surveillance' })}
    >
      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <p className="text-slate-400 text-center py-10">{t('common.loading')}</p>
      ) : dashboard && (
        <>
          <SupervisionSection dashboard={dashboard} t={t} />

          <section className="mb-6 rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-lg shadow-slate-900/5">
            <SectionHeader icon="Lock" title={t('superAdmin.securityTitle', { defaultValue: 'Sécurité' })} subtitle={t('superAdmin.securitySubtitle', { defaultValue: 'Accès sensibles et comptes administrateurs.' })} />
            <div className="grid gap-3 md:grid-cols-2">
              <ControlLink to="/super-admin/admins" icon="Shield" title={t('superAdmin.adminsTitle')} description={t('superAdmin.adminsDescription')} />
              <ControlLink to="/super-admin/logs" icon="BarChart" title={t('superAdmin.logsTitle')} description={t('superAdmin.logsDescription')} />
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-100 bg-white shadow-lg shadow-slate-900/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="flex items-center gap-2 font-black text-slate-950">
                <AppIcon name="BarChart" className="h-5 w-5 text-indigo-700" />
                {t('superAdmin.latestLogs')}
              </h2>
            </div>
            <LogPreview logs={dashboard.derniersLogs || []} t={t} language={i18n.language} />
          </section>
        </>
      )}
    </CollaborativeDashboardLayout>
  )
}

function SupervisionSection({ dashboard, t }) {
  const logs = dashboard.derniersLogs || []
  const inactiveAdmins = dashboard.adminsInactifs || 0
  const criticalActions = dashboard.totalActionsCritiques || 0

  return (
    <section className="mb-6 rounded-[1.5rem] border border-indigo-100 bg-white p-5 shadow-lg shadow-indigo-950/5">
      <SectionHeader
        icon="Shield"
        title={t('superAdmin.supervisionTitle', { defaultValue: 'Supervision' })}
        subtitle={t('superAdmin.supervisionEyebrow', { defaultValue: 'Contrôle plateforme' })}
      />

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

function ControlLink({ to, icon, title, description }) {
  return (
    <Link to={to} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-md">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
        <AppIcon name={icon} className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-black text-slate-950">{title}</span>
        <span className="mt-0.5 block text-sm text-slate-500">{description}</span>
      </span>
    </Link>
  )
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
        <AppIcon name={icon} className="h-5 w-5 text-indigo-700" />
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
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
