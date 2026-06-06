import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import QuickActionCard from '../../components/ui/QuickActionCard'
import AppIcon from '../../components/ui/AppIcons'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [groupes, setGroupes] = useState([])
  const [groupesEnAttente, setGroupesEnAttente] = useState([])
  const [referents, setReferents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { t } = useTranslation()

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [statsRes, groupesRes, attenteRes, referentsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/groupes'),
        api.get('/admin/groupes/en-attente'),
        api.get('/admin/referents'),
      ])
      setStats(statsRes.data)
      setGroupes(groupesRes.data)
      setGroupesEnAttente(attenteRes.data)
      setReferents(referentsRes.data)
    } catch {
      setError(t('admin.error_load'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const groupesSansReferent = useMemo(
    () => groupes.filter(groupe => !groupe.referentId),
    [groupes]
  )
  const referentsActifs = referents.filter(referent => referent.actif).length

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <PageHeader
          eyebrow={t('ux.adminDashboard.eyebrow')}
          title={t('ux.adminDashboard.title')}
          description={t('ux.adminDashboard.intro')}
        />

        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-slate-400 text-center py-10">{t('admin.loading')}</p>
        ) : (
          <>
            {stats && (
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard label={t('admin.stats_total_users')} value={stats.totalUtilisateurs} color="#2E86AB" icon="Users" />
                <StatCard label={t('admin.activeReferents')} value={referentsActifs} color="#0d9488" icon="User" />
                <StatCard label={t('admin.groups')} value={groupes.length} color="#7c3aed" icon="Users" />
                <StatCard label={t('admin.stats_activities')} value={stats.totalActivites} color="#F4A261" icon="Calendar" />
              </section>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 mb-8">
	              <div className="bg-white rounded-[1.75rem] border border-slate-100 shadow-lg shadow-slate-900/5 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">{t('ux.adminDashboard.priority')}</h2>
                    <p className="text-sm text-slate-500">{t('ux.adminDashboard.priorityDesc')}</p>
                  </div>
                  <Link to="/admin/groupes" className="text-blue-600 text-sm font-semibold hover:underline">
                    {t('admin.viewGroups')}
                  </Link>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <PriorityCard
                    label={t('ux.adminDashboard.groupsWithoutReferent')}
                    value={groupesSansReferent.length}
                    description={t('admin.assignReferentDesc')}
                    to="/admin/groupes"
                    alert={groupesSansReferent.length > 0}
                  />
                  <PriorityCard
                    label={t('ux.adminDashboard.pendingGroups')}
                    value={groupesEnAttente.length}
                    description={t('admin.pendingGroupsDesc')}
                    to="/admin/groupes"
                    alert={groupesEnAttente.length > 0}
                  />
                  <PriorityCard
                    label={t('ux.adminDashboard.activeReferents')}
                    value={referentsActifs}
                    description={t('admin.activeReferentsDesc')}
                    to="/admin/referents"
                  />
                </div>
              </div>

	              <div className="bg-white rounded-[1.75rem] border border-slate-100 shadow-lg shadow-slate-900/5 p-6">
                <h2 className="text-lg font-bold text-slate-950 mb-4">{t('ux.adminDashboard.quickActions')}</h2>
                <div className="grid gap-3">
	                  <QuickActionCard to="/admin/groupes" title={t('ux.adminDashboard.createGroup')} tone="blue" icon="Users" />
	                  <QuickActionCard to="/admin/referents" title={t('ux.adminDashboard.createReferent')} tone="teal" icon="User" />
	                  <QuickActionCard to="/admin/groupes" title={t('ux.adminDashboard.processRequests')} tone="amber" icon="Clock" />
	                  <QuickActionCard to="/admin/activites" title={t('ux.adminDashboard.createActivity')} tone="violet" icon="PlusCircle" />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 mb-4">{t('admin.manage')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <NavCard to="/admin/utilisateurs" title={t('admin.users_title')} description={t('admin.users_desc')} color="#2E86AB" icon="Users" />
                <NavCard to="/admin/referents" title={t('admin.referents_title')} description={t('admin.referents_desc')} color="#0d9488" icon="User" />
                <NavCard to="/admin/groupes" title={t('admin.groups_title')} description={t('admin.groups_desc')} color="#7c3aed" icon="Folder" />
                <NavCard to="/admin/activites" title={t('admin.activities_title')} description={t('admin.activities_desc')} color="#F4A261" icon="Calendar" />
                <NavCard to="/admin/projets" title={t('admin.projects_title')} description={t('admin.projects_desc')} color="#28a745" icon="Rocket" />
                <NavCard to="/admin/soutiens" title={t('partnerSupport.admin.title')} description={t('partnerSupport.admin.dashboardDescription')} color="#ea580c" icon="Handshake" />
              </div>
            </section>

            {groupes.length === 0 && (
              <div className="mt-8">
                <EmptyState
                  title={t('admin.noGroupsCreated')}
                  description={t('admin.noGroupsCreatedDesc')}
                  actionLabel={t('admin.createGroup')}
                  actionTo="/admin/groupes"
                />
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-2xl font-bold" style={{ color }}>{value ?? 0}</div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50" style={{ color }}>
          <AppIcon name={icon} className="h-5 w-5" />
        </span>
      </div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  )
}

function PriorityCard({ label, value, description, to, alert = false }) {
  return (
    <Link to={to} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 ${alert ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-gray-100'}`}>
      <div className={`text-2xl font-bold ${alert ? 'text-amber-800' : 'text-slate-950'}`}>{value}</div>
      <h3 className="text-sm font-semibold text-slate-950 mt-1">{label}</h3>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </Link>
  )
}

function NavCard({ to, title, description, color, icon }) {
  return (
    <Link to={to} className="bg-white rounded-[1.75rem] border border-slate-100 shadow-lg shadow-slate-900/5 p-6 transition hover:-translate-y-1 hover:shadow-md border-t-4" style={{ borderTopColor: color }}>
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50" style={{ color }}>
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <h3 className="font-semibold text-slate-950 mb-1">{title}</h3>
      <p className="text-slate-500 text-sm">{description}</p>
    </Link>
  )
}
