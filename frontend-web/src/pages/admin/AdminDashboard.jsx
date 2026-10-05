import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import ErrorState from '../../components/ui/ErrorState'
import LoadingState from '../../components/ui/LoadingState'
import AppIcon from '../../components/ui/AppIcons'
import AdminDashboardReports from './AdminDashboardReports.jsx'
import AdminDashboardStatistics from './AdminDashboardStatistics.jsx'
import { buildAdminDashboard } from './adminDashboardModel'
import {
  CollaborativeDashboardLayout,
} from '../../components/dashboard/CollaborativeDashboard'

export default function AdminDashboard() {
  // null means unavailable; an empty array is a successfully loaded, empty source.
  const [groupes, setGroupes] = useState(null)
  const [groupesEnAttente, setGroupesEnAttente] = useState(null)
  const [projets, setProjets] = useState(null)
  const [activites, setActivites] = useState(null)
  const [users, setUsers] = useState(null)
  const [supports, setSupports] = useState(null)
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    const results = await Promise.allSettled([
      api.get('/admin/groupes'),
      api.get('/admin/groupes/en-attente'),
      api.get('/projets/admin/tous'),
      api.get('/activites/admin/toutes'),
      api.get('/admin/utilisateurs'),
      api.get('/partenaire/admin/tous'),
    ])
    const setters = [setGroupes, setGroupesEnAttente, setProjets, setActivites, setUsers, setSupports]
    results.forEach((result, index) => {
      setters[index](result.status === 'fulfilled' && Array.isArray(result.value.data)
        ? result.value.data
        : null)
    })
    setLoading(false)
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const model = buildAdminDashboard({ users, groups: groupes, pendingGroups: groupesEnAttente, projects: projets, activities: activites, supports })
  const sources = [groupes, groupesEnAttente, projets, activites, users, supports]
  const hasError = sources.some(source => source === null)
  const allUnavailable = sources.every(source => source === null)
  const displayCount = value => value == null
    ? <span className="block whitespace-normal text-sm">{t('admin.dashboardReliability.unavailable')}</span>
    : value

  return (
    <CollaborativeDashboardLayout
      emoji="Shield"
      title={t('ux.adminDashboard.title', { defaultValue: 'Centre de pilotage BX-Connect' })}
      subtitle={t('admin.dashboardSummary')}
      accentHeader
      compact
    >
        {loading ? (
          <>
            <LoadingState label={t('admin.loading')} />
            <AdminDashboardStatistics projects={null} activities={null} loading />
            <AdminDashboardReports model={model} projects={null} activities={null} loading />
          </>
        ) : allUnavailable ? (
          <>
            <ErrorState
              title={t('common.loadErrorTitle')}
              description={t('admin.error_load')}
              actionLabel={t('common.retry')}
              action={fetchDashboard}
            />
            <AdminDashboardStatistics projects={null} activities={null} loading={false} />
            <AdminDashboardReports model={model} projects={null} activities={null} loading={false} />
          </>
        ) : (
          <>
            {hasError && (
              <div role="alert" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p>{t('admin.dashboardReliability.partialError')}</p>
                <button type="button" onClick={fetchDashboard} className="mt-2 font-bold underline">
                  {t('common.retry')}
                </button>
              </div>
            )}
            <section aria-labelledby="admin-overview-title" className="mb-4">
              <h2 id="admin-overview-title" className="mb-3 text-base font-black text-slate-950">{t('admin.dashboardOverview.title')}</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  ['users', 'Users', 'admin.dashboardOverview.activeUsers'],
                  ['groups', 'Users', 'admin.dashboardReliability.validatedGroups'],
                  ['activities', 'Calendar', 'admin.dashboardReliability.publishedActivities'],
                  ['projects', 'Rocket', 'admin.dashboardReliability.activeProjects'],
                  ['partners', 'Handshake', 'admin.dashboardOverview.activePartners'],
                ].map(([key, icon, label]) => (
                  <div key={key} data-testid={`dashboard-kpi-${key}`} className="min-w-0 rounded-lg border border-blue-100 bg-white px-3.5 py-2.5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-slate-500">{t(label)}</p>
                      <AppIcon name={icon} className="h-4 w-4 shrink-0 text-blue-700" />
                    </div>
                    <p className="mt-1 text-2xl font-black text-slate-950">{displayCount(model[key])}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">{t('admin.dashboardOverview.activeUsersDefinition')}</p>
              <p className="mt-1 text-xs text-slate-500">{t('admin.dashboardReliability.activeProjectsDefinition')}</p>
            </section>

            <section aria-labelledby="admin-actions-title" className="mb-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 id="admin-actions-title" className="text-base font-black text-slate-950">{t('admin.workFeed.title')}</h2>
              <p data-testid="dashboard-actions-total" className="mb-3 mt-1 text-sm text-slate-600">
                {t('admin.dashboardOverview.totalActions')}: {displayCount(model.total)}
              </p>
              {model.total === null && <p className="mb-3 text-sm text-amber-800">{t('admin.dashboardReliability.actionsUnavailable')}</p>}
              <div className="divide-y divide-slate-100">
                {[
                  ['groups', 'Users', 'admin.dashboardOverview.pendingGroups', '/admin/groupes?vue=en-attente'],
                  ['projects', 'Rocket', 'admin.dashboardOverview.pendingProjects', '/admin/projets?vue=a-valider'],
                  ['supports', 'Handshake', 'admin.dashboardOverview.pendingSupports', '/admin/soutiens'],
                ].map(([key, icon, label, to]) => (
                  <Link key={key} to={to} data-testid={`dashboard-action-${key}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-3 text-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <span className="flex items-center gap-2 font-bold text-slate-800">
                      <AppIcon name={icon} className="h-4 w-4 shrink-0 text-blue-700" />{t(label)}
                    </span>
                    <span className="flex items-center gap-2 font-black text-blue-800">
                      <span>{displayCount(model.actions[key])}</span><AppIcon name="ArrowRight" className="h-4 w-4 shrink-0" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {model.drafts > 0 && (
              <section aria-label={t('admin.dashboardOverview.drafts')} className="rounded-lg border border-slate-100 bg-white p-3 text-sm">
                <Link to="/admin/activites" className="flex items-center justify-between gap-3 text-slate-700 hover:text-blue-700">
                  <span>{t('admin.dashboardOverview.drafts')}</span>
                  <span className="font-bold">{model.drafts} · {t('admin.dashboardReliability.prepare')}</span>
                </Link>
              </section>
            )}
            <AdminDashboardStatistics projects={projets} activities={activites} loading={false} />
            <AdminDashboardReports model={model} projects={projets} activities={activites} loading={false} />
          </>
        )}
    </CollaborativeDashboardLayout>
  )
}
