import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import { CollaborativeDashboardLayout } from '../../components/dashboard/CollaborativeDashboard'
import ActivityFeed from '../../components/dashboard/ActivityFeed'
import CompactKpiRow from '../../components/dashboard/CompactKpiRow'

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
