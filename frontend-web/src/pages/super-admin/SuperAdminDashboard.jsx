import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '../../api/axios'
import { CollaborativeDashboardLayout } from '../../components/dashboard/CollaborativeDashboard'
import ActivityFeed from '../../components/dashboard/ActivityFeed'
import CompactKpiRow from '../../components/dashboard/CompactKpiRow'
import ErrorState from '../../components/ui/ErrorState'
import LoadingState from '../../components/ui/LoadingState'

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
      emoji="Shield"
      title={t('superAdmin.dashboardTitle')}
      subtitle={t('superAdmin.platformWatch', { defaultValue: 'Plateforme sous surveillance' })}
    >
      {error && dashboard && <Alert type="error">{error}</Alert>}

      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : error && !dashboard ? (
        <ErrorState
          title={t('common.loadErrorTitle')}
          description={error}
        />
      ) : dashboard && (
        <>
          <CompactKpiRow
            accent="indigo"
            className="mb-4"
            items={[
              { icon: 'Shield', label: t('superAdmin.activeAdmins'), value: dashboard.adminsActifs || 0 },
              { icon: 'Clock', label: t('superAdmin.inactiveAdmins'), value: dashboard.adminsInactifs || 0, tone: dashboard.adminsInactifs > 0 ? 'amber' : 'green' },
              { icon: 'BarChart', label: t('superAdmin.criticalActions'), value: dashboard.totalActionsCritiques || 0, tone: dashboard.totalActionsCritiques > 0 ? 'amber' : 'green' },
              { icon: 'FileText', label: t('superAdmin.latestLogs'), value: (dashboard.derniersLogs || []).length },
            ]}
          />

          <SuperAdminCharts dashboard={dashboard} t={t} />

          {(dashboard.derniersLogs || []).length > 0 && (
            <ActivityFeed
              title={t('activityFeed.title', { defaultValue: 'Mon fil d’activité' })}
              subtitle={t('activityFeed.superAdminSubtitle', { defaultValue: 'Actions sensibles, sécurité et activité administrative.' })}
              emptyLabel={t('audit.noCriticalLog')}
              items={buildSuperAdminActivityItems({ logs: dashboard.derniersLogs || [], t })}
              language={i18n.language}
              accent="indigo"
              limit={3}
            />
          )}
        </>
      )}
    </CollaborativeDashboardLayout>
  )
}

const CHART_COLORS = ['#4f46e5', '#0f766e', '#d97706', '#dc2626', '#64748b']

function SuperAdminCharts({ dashboard, t }) {
  const adminStatusData = [
    { key: 'active', label: t('superAdmin.activeAdmins'), value: dashboard.adminsActifs || 0 },
    { key: 'inactive', label: t('superAdmin.inactiveAdmins'), value: dashboard.adminsInactifs || 0 },
  ].filter(item => item.value > 0)

  const auditOverviewData = [
    { key: 'critical', label: t('superAdmin.criticalActions'), value: dashboard.totalActionsCritiques || 0 },
    { key: 'latest', label: t('superAdmin.latestLogs'), value: (dashboard.derniersLogs || []).length },
  ].filter(item => item.value > 0)

  if (adminStatusData.length === 0 && auditOverviewData.length === 0) return null

  return (
    <section className="mb-6 rounded-[1.5rem] border border-indigo-100 bg-white p-5 shadow-lg shadow-indigo-950/5">
      <div className="mb-4">
        <h2 className="text-lg font-black text-slate-950">{t('dashboardCharts.title')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('dashboardCharts.superAdminSubtitle')}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {adminStatusData.length > 0 && (
          <ChartPanel title={t('dashboardCharts.adminsByStatus')}>
            <SimplePieChart data={adminStatusData} />
          </ChartPanel>
        )}
        {auditOverviewData.length > 0 && (
          <ChartPanel title={t('dashboardCharts.auditOverview')}>
            <SimpleBarChart data={auditOverviewData} />
          </ChartPanel>
        )}
      </div>
    </section>
  )
}

function ChartPanel({ title, children }) {
  return (
    <article className="min-h-[240px] rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <h3 className="mb-3 text-sm font-black text-slate-800">{title}</h3>
      {children}
    </article>
  )
}

function SimplePieChart({ data }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={42} outerRadius={72} paddingAngle={3}>
            {data.map((entry, index) => (
              <Cell key={entry.key} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function SimpleBarChart({ data }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} height={44} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.key} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function buildSuperAdminActivityItems({ logs, t }) {
  return logs.map(log => ({
    key: `log-${log.id}`,
    icon: 'Shield',
    title: log.action || t('superAdmin.latestLogs'),
    description: log.cibleEmail,
    date: log.dateAction,
    to: '/super-admin/logs',
  }))
}

function Alert({ type, children }) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-green-50 border-green-200 text-green-700'

  return <div className={`border px-4 py-3 rounded-xl mb-5 text-sm ${styles}`}>{children}</div>
}
