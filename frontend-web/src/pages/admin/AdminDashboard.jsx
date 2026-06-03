import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'

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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <header className="mb-8">
          <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">{t('ux.adminDashboard.eyebrow')}</p>
          <h1 className="text-3xl font-bold text-blue-900 mt-1">{t('ux.adminDashboard.title')}</h1>
          <p className="text-gray-500 mt-2 text-sm">
            {t('ux.adminDashboard.intro')}
          </p>
        </header>

        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('admin.loading')}</p>
        ) : (
          <>
            {stats && (
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard label={t('admin.stats_total_users')} value={stats.totalUtilisateurs} color="#2E86AB" />
                <StatCard label={t('admin.activeReferents')} value={referentsActifs} color="#0d9488" />
                <StatCard label={t('admin.groups')} value={groupes.length} color="#7c3aed" />
                <StatCard label={t('admin.stats_activities')} value={stats.totalActivites} color="#F4A261" />
              </section>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-blue-900">{t('ux.adminDashboard.priority')}</h2>
                    <p className="text-sm text-gray-500">{t('ux.adminDashboard.priorityDesc')}</p>
                  </div>
                  <Link to="/admin/groupes" className="text-blue-700 text-sm font-semibold hover:underline">
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

              <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-lg font-bold text-blue-900 mb-4">{t('ux.adminDashboard.quickActions')}</h2>
                <div className="grid gap-3">
                  <QuickAction to="/admin/groupes" label={t('ux.adminDashboard.createGroup')} />
                  <QuickAction to="/admin/referents" label={t('ux.adminDashboard.createReferent')} />
                  <QuickAction to="/admin/groupes" label={t('ux.adminDashboard.processRequests')} />
                  <QuickAction to="/admin/activites" label={t('ux.adminDashboard.createActivity')} />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-blue-900 mb-4">{t('admin.manage')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <NavCard to="/admin/utilisateurs" title={t('admin.users_title')} description={t('admin.users_desc')} color="#2E86AB" />
                <NavCard to="/admin/referents" title={t('admin.referents_title')} description={t('admin.referents_desc')} color="#0d9488" />
                <NavCard to="/admin/groupes" title={t('admin.groups_title')} description={t('admin.groups_desc')} color="#7c3aed" />
                <NavCard to="/admin/activites" title={t('admin.activities_title')} description={t('admin.activities_desc')} color="#F4A261" />
                <NavCard to="/admin/projets" title={t('admin.projects_title')} description={t('admin.projects_desc')} color="#28a745" />
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

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 border-l-4" style={{ borderLeftColor: color }}>
      <div className="text-2xl font-bold" style={{ color }}>{value ?? 0}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}

function PriorityCard({ label, value, description, to, alert = false }) {
  return (
    <Link to={to} className={`rounded-2xl border p-4 transition hover:shadow-sm ${alert ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
      <div className={`text-2xl font-bold ${alert ? 'text-amber-800' : 'text-blue-900'}`}>{value}</div>
      <h3 className="text-sm font-semibold text-blue-900 mt-1">{label}</h3>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </Link>
  )
}

function QuickAction({ to, label }) {
  return (
    <Link to={to} className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition text-center">
      {label}
    </Link>
  )
}

function NavCard({ to, title, description, color }) {
  return (
    <Link to={to} className="bg-white rounded-2xl shadow p-6 transition hover:-translate-y-1 border-t-4" style={{ borderTopColor: color }}>
      <h3 className="font-semibold text-blue-900 mb-1">{title}</h3>
      <p className="text-gray-500 text-sm">{description}</p>
    </Link>
  )
}
