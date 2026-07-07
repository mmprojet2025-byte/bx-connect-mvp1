import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../api/axios'
import { userFriendlyError } from '../../utils/userFriendlyError'
import AppIcon from '../../components/ui/AppIcons'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import LoadingState from '../../components/ui/LoadingState'

const emptyForm = {
  prenom: '',
  nom: '',
  email: '',
  motDePasseTemporaire: '',
}

export default function AdminReferents() {
  const { t, i18n } = useTranslation()
  const [referents, setReferents] = useState([])
  const [groupes, setGroupes] = useState([])
  const [activites, setActivites] = useState([])
  const [projets, setProjets] = useState([])
  const [notifications, setNotifications] = useState([])
  const [groupesDisponibles, setGroupesDisponibles] = useState(false)
  const [activitesDisponibles, setActivitesDisponibles] = useState(false)
  const [projetsDisponibles, setProjetsDisponibles] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [recherche, setRecherche] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedReferent, setSelectedReferent] = useState(null)

  const fetchReferents = useCallback(async () => {
    setLoading(true)
    try {
      const [referentsResult, groupesResult, activitesResult, projetsResult, notificationsResult] = await Promise.allSettled([
        api.get('/admin/referents'),
        api.get('/admin/groupes'),
        api.get('/activites/admin/toutes'),
        api.get('/projets/admin/tous'),
        api.get('/notifications'),
      ])
      if (referentsResult.status === 'rejected') throw referentsResult.reason
      setReferents(Array.isArray(referentsResult.value.data) ? referentsResult.value.data : [])
      const groupesOk = groupesResult.status === 'fulfilled' && Array.isArray(groupesResult.value.data)
      setGroupes(groupesOk ? groupesResult.value.data : [])
      setGroupesDisponibles(groupesOk)
      const activitesOk = activitesResult.status === 'fulfilled' && Array.isArray(activitesResult.value.data)
      setActivites(activitesOk ? activitesResult.value.data : [])
      setActivitesDisponibles(activitesOk)
      const projetsOk = projetsResult.status === 'fulfilled' && Array.isArray(projetsResult.value.data)
      setProjets(projetsOk ? projetsResult.value.data : [])
      setProjetsDisponibles(projetsOk)
      setNotifications(notificationsResult.status === 'fulfilled' && Array.isArray(notificationsResult.value.data)
        ? notificationsResult.value.data
        : [])
      setError('')
    } catch {
      setError(t('referent.errorLoad'))
      setGroupes([])
      setActivites([])
      setProjets([])
      setGroupesDisponibles(false)
      setActivitesDisponibles(false)
      setProjetsDisponibles(false)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchReferents() }, [fetchReferents])

  const referentsFiltres = referents.filter(referent => {
    const texte = `${referent.prenom || ''} ${referent.nom || ''} ${referent.email || ''} ${groupNamesForReferent(referent, groupes)}`.toLowerCase()
    return texte.includes(recherche.toLowerCase())
  })
  const groupesSansReferent = groupesDisponibles ? groupes.filter(groupe => !groupe.referentId) : []
  const referentsSansGroupe = groupesDisponibles ? referents.filter(referent => groupNamesForReferent(referent, groupes).length === 0) : []
  const pointsSuivi = groupesDisponibles ? [
    ...groupesSansReferent.slice(0, 3).map(groupe => ({
      id: `groupe-${groupe.id}`,
      icon: 'Users',
      title: groupe.nom || t('referent.groupWithoutReferentFallback'),
      description: t('referent.groupWithoutReferent'),
      actionLabel: t('referent.assignReferent'),
      to: '/admin/groupes',
      tone: 'orange',
    })),
    ...referentsSansGroupe.slice(0, Math.max(0, 4 - Math.min(groupesSansReferent.length, 3))).map(referent => ({
      id: `referent-${referent.id}`,
      icon: 'User',
      title: displayName(referent),
      description: t('referent.referentWithoutGroup'),
      actionLabel: t('referent.manageInUsers'),
      to: '/admin/utilisateurs',
      tone: 'blue',
    })),
  ] : []
  const echangesRecents = notifications
    .filter(isReferentCollaborationNotification)
    .sort((a, b) => new Date(b.dateCreation || 0) - new Date(a.dateCreation || 0))
    .slice(0, 4)
  const tableMinWidth = activitesDisponibles && projetsDisponibles ? '920px' : '760px'
  const creerReferent = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const res = await api.post('/admin/referents', form)
      setReferents(prev => [...prev, res.data])
      setForm(emptyForm)
      setShowCreateForm(false)
      setMessage(t('referent.created'))
    } catch (err) {
      setError(formatCreationError(err, t, t('referent.errorCreate')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-3 py-4 sm:px-4">
        <header className="mb-3 flex flex-col gap-3 rounded-xl border border-white bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">{t('referent.title')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('referent.managementSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(current => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600"
            >
              <AppIcon name={showCreateForm ? 'XCircle' : 'PlusCircle'} className="h-4 w-4" />
              {showCreateForm ? t('common.cancel') : t('referent.createButton')}
            </button>
          </div>
        </header>

        {message && <Alert>{message}</Alert>}
        {error && referents.length > 0 && <Alert type="error">{error}</Alert>}

        {showCreateForm && (
        <form onSubmit={creerReferent} className="mb-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black text-blue-900">{t('referent.create')}</h2>
            <span className="text-xs font-medium text-slate-400">{t('referent.accountCreationHint')}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input label={t('users.firstname')} value={form.prenom} onChange={value => setForm({ ...form, prenom: value })} />
            <Input label={t('users.lastname')} value={form.nom} onChange={value => setForm({ ...form, nom: value })} />
            <Input label={t('users.email')} type="email" value={form.email} onChange={value => setForm({ ...form, email: value })} />
            <Input
              label={t('users.temporaryPassword')}
              type="password"
              value={form.motDePasseTemporaire}
              onChange={value => setForm({ ...form, motDePasseTemporaire: value })}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            <AppIcon name="PlusCircle" className="h-4 w-4" />
            {saving ? t('common.creating') : t('referent.createButton')}
          </button>
        </form>
        )}

        {pointsSuivi.length > 0 && (
          <section className="mb-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-950">{t('referent.followUpTitle')}</h2>
                <p className="text-xs text-slate-500">{t('referent.followUpSubtitle')}</p>
              </div>
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              {pointsSuivi.slice(0, 4).map(item => (
                <FollowUpItem key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {echangesRecents.length > 0 && (
          <section className="mb-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-950">{t('referent.recentFollowUpTitle')}</h2>
                <p className="text-xs text-slate-500">{t('referent.recentFollowUpSubtitle')}</p>
              </div>
              <Link
                to="/notifications"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
              >
                <AppIcon name="Bell" className="h-3.5 w-3.5" />
                {t('referent.viewNotifications')}
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {echangesRecents.map(notification => (
                <RecentExchangeItem
                  key={notification.id}
                  notification={notification}
                  language={i18n.language}
                  t={t}
                />
              ))}
            </div>
          </section>
        )}

        <section className="mb-3 rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
          <label className="relative block">
            <AppIcon name="Search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder={t('referent.searchPlaceholder')}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>
        </section>

        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : error && referents.length === 0 ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error}
            actionLabel={t('common.retry')}
            action={fetchReferents}
          />
        ) : referents.length === 0 ? (
          <EmptyState
            icon="User"
            title={t('referent.none')}
          />
        ) : referentsFiltres.length === 0 ? (
          <EmptyState
            icon="Search"
            title={t('common.noResults', { defaultValue: 'Aucun résultat trouvé.' })}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: tableMinWidth }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('users.name')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('users.email')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('referent.assignedGroups')}</th>
                    {activitesDisponibles && (
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('referent.activitiesColumn')}</th>
                    )}
                    {projetsDisponibles && (
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('referent.projectsColumn')}</th>
                    )}
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('users.status')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('users.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {referentsFiltres.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">{t('referent.none')}</td>
                    </tr>
                  ) : referentsFiltres.map((referent, index) => {
                    const referentGroups = groupsForReferent(referent, groupes)
                    const activityCount = countItemsForGroups(activites, referentGroups)
                    const projectCount = countItemsForGroups(projets, referentGroups)
                    return (
                      <tr key={referent.id} className={`border-b border-gray-50 transition hover:bg-blue-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-3 py-2 font-medium text-blue-900 text-sm">{displayName(referent)}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{referent.email}</td>
                        <td className="px-3 py-2 text-sm font-medium text-slate-600">{formatGroupNames(referent, groupes)}</td>
                        {activitesDisponibles && (
                          <td className="px-3 py-2 text-sm font-bold text-slate-700">{activityCount}</td>
                        )}
                        {projetsDisponibles && (
                          <td className="px-3 py-2 text-sm font-bold text-slate-700">{projectCount}</td>
                        )}
                        <td className="px-3 py-2">
                          <StatusBadge status={referent.actif ? 'VALIDE' : 'ANNULEE'}>
                            {referent.actif ? t('common.active') : t('common.inactive')}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setSelectedReferent(referent)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                          >
                            <AppIcon name="Settings" className="h-3.5 w-3.5" />
                            {t('referent.manage')}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {selectedReferent && (
        <ReferentFollowUpDrawer
          referent={selectedReferent}
          groupes={groupsForReferent(selectedReferent, groupes)}
          activites={activites}
          projets={projets}
          notifications={notificationsForReferent(selectedReferent, notifications, groupes).slice(0, 4)}
          activitesDisponibles={activitesDisponibles}
          projetsDisponibles={projetsDisponibles}
          language={i18n.language}
          t={t}
          onClose={() => setSelectedReferent(null)}
        />
      )}
    </div>
  )
}

function formatCreationError(err, t, fallback) {
  if (err.response?.status === 401) return t('errors.session_expired')
  if (err.response?.status === 403) return t('referent.adminOnly')
  if (err.response?.status === 400) {
    const message = err.response?.data?.message || ''
    if (message.toLowerCase().includes('email')) return t('users.errorEmail')
    if (message.toLowerCase().includes('mot') || message.toLowerCase().includes('password')) {
      return t('users.errorTemporaryPassword')
    }
    return message || t('users.checkFields')
  }
  return userFriendlyError(err, fallback)
}

function displayName(user) {
  return `${user?.prenom || ''} ${user?.nom || ''}`.trim() || user?.email || '—'
}

function groupsForReferent(referent, groupes) {
  return groupes.filter(groupe => Number(groupe.referentId) === Number(referent.id))
}

function groupNamesForReferent(referent, groupes) {
  return groupsForReferent(referent, groupes)
    .map(groupe => groupe.nom)
    .filter(Boolean)
}

function formatGroupNames(referent, groupes) {
  const names = groupNamesForReferent(referent, groupes)
  return names.length > 0 ? names.join(', ') : '—'
}

function countItemsForGroups(items, groupes) {
  if (!Array.isArray(items) || groupes.length === 0) return 0
  return items.filter(item => itemMatchesGroups(item, groupes)).length
}

function itemMatchesGroups(item, groupes) {
  return groupes.some(groupe => {
    const itemGroupId = item.groupeId ?? item.groupId ?? item.groupe?.id ?? item.group?.id
    if (itemGroupId != null && groupe.id != null && Number(itemGroupId) === Number(groupe.id)) return true
    const itemGroupName = normalizeText(item.groupeNom || item.groupName || item.groupe?.nom || item.group?.nom)
    return itemGroupName && itemGroupName === normalizeText(groupe.nom)
  })
}

function itemsForGroups(items, groupes) {
  return Array.isArray(items) ? items.filter(item => itemMatchesGroups(item, groupes)) : []
}

function notificationsForReferent(referent, notifications, groupes) {
  const name = normalizeText(displayName(referent))
  const email = normalizeText(referent?.email)
  const groupNames = groupNamesForReferent(referent, groupes).map(normalizeText)
  return notifications
    .filter(isReferentCollaborationNotification)
    .filter(notification => {
      const text = normalizeText(`${notification?.titre || ''} ${notification?.title || ''} ${notification?.message || ''} ${notification?.description || ''} ${notification?.contenu || ''}`)
      return (name && text.includes(name)) ||
        (email && text.includes(email)) ||
        groupNames.some(groupName => groupName && text.includes(groupName))
    })
    .sort((a, b) => new Date(b.dateCreation || 0) - new Date(a.dateCreation || 0))
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function FollowUpItem({ item }) {
  const toneClass = item.tone === 'orange'
    ? 'border-l-orange-400 bg-orange-50/40 text-orange-700'
    : 'border-l-blue-500 bg-blue-50/40 text-blue-700'

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border border-slate-100 border-l-4 px-3 py-2 ${toneClass}`}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80">
          <AppIcon name={item.icon} className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
          <p className="truncate text-xs text-slate-500">{item.description}</p>
        </div>
      </div>
      <Link
        to={item.to}
        className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-blue-700 hover:text-white"
      >
        {item.actionLabel}
      </Link>
    </div>
  )
}

function ReferentFollowUpDrawer({
  referent,
  groupes,
  activites,
  projets,
  notifications,
  activitesDisponibles,
  projetsDisponibles,
  language,
  t,
  onClose,
}) {
  const referentActivities = itemsForGroups(activites, groupes)
  const referentProjects = itemsForGroups(projets, groupes)
  const status = followUpStatus({
    groupCount: groupes.length,
    activityCount: referentActivities.length,
    projectCount: referentProjects.length,
    activitiesAvailable: activitesDisponibles,
    projectsAvailable: projetsDisponibles,
  })

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 p-3 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-emerald-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">{t('referent.followUpSheet')}</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{displayName(referent)}</h2>
              <p className="mt-1 text-sm text-slate-500">{referent.email}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
              aria-label={t('common.close')}
            >
              <AppIcon name="XCircle" className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <DrawerMetric label={t('referent.assignedGroups')} value={groupes.length} icon="Users" />
            <DrawerMetric label={t('referent.activitiesColumn')} value={activitesDisponibles ? referentActivities.length : '—'} icon="Calendar" />
            <DrawerMetric label={t('referent.projectsColumn')} value={projetsDisponibles ? referentProjects.length : '—'} icon="Rocket" />
            <DrawerMetric label={t('users.status')} value={referent.actif ? t('common.active') : t('common.inactive')} icon="CheckCircle" />
          </div>

          <DrawerSection title={t('referent.currentGroups')} icon="Users">
            {groupes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {groupes.map(groupe => (
                  <span key={groupe.id || groupe.nom} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
                    {groupe.nom}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{t('referent.referentWithoutGroup')}</p>
            )}
          </DrawerSection>

          <DrawerSection title={t('referent.followUpSummary')} icon="ClipboardList">
            <div className="space-y-2 text-sm text-slate-600">
              <SummaryLine>{t('referent.responsibilityGroups', { count: groupes.length })}</SummaryLine>
              {activitesDisponibles && <SummaryLine>{t('referent.responsibilityActivities', { count: referentActivities.length })}</SummaryLine>}
              {projetsDisponibles && <SummaryLine>{t('referent.responsibilityProjects', { count: referentProjects.length })}</SummaryLine>}
              <p className={`rounded-lg px-3 py-2 text-xs font-bold ${followUpToneClass(status)}`}>
                {t(`referent.followUpStatus.${status}`)}
              </p>
            </div>
          </DrawerSection>

          {notifications.length > 0 && (
            <DrawerSection title={t('referent.recentFollowUpTitle')} icon="Bell">
              <div className="divide-y divide-slate-100">
                {notifications.map(notification => (
                  <RecentExchangeItem
                    key={notification.id}
                    notification={notification}
                    language={language}
                    t={t}
                  />
                ))}
              </div>
            </DrawerSection>
          )}

          <DrawerSection title={t('referent.collaborationTitle')} icon="MessageCircle">
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-400">{t('referent.workFollowUp')}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <DrawerAction to="/admin/groupes" icon="Users" label={t('referent.viewGroups')} />
                  <DrawerAction to="/admin/activites" icon="Calendar" label={t('referent.viewActivities')} />
                  <DrawerAction to="/admin/projets" icon="Rocket" label={t('referent.viewProjects')} />
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-400">{t('referent.administrationFollowUp')}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <DrawerAction to="/admin/utilisateurs" icon="User" label={t('referent.manageAccount')} />
                  <DrawerAction to="/notifications" icon="Bell" label={t('referent.viewNotifications')} />
                </div>
              </div>
            </div>
          </DrawerSection>
        </div>
      </aside>
    </div>
  )
}

function DrawerMetric({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <AppIcon name={icon} className="mb-1 h-4 w-4 text-blue-700" />
      <p className="text-lg font-black text-slate-950">{value}</p>
      <p className="truncate text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
  )
}

function DrawerSection({ title, icon, children }) {
  return (
    <section className="mb-4 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-slate-950">
        <AppIcon name={icon} className="h-4 w-4 text-blue-700" />
        {title}
      </h3>
      {children}
    </section>
  )
}

function SummaryLine({ children }) {
  return (
    <p className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
      <span>{children}</span>
    </p>
  )
}

function followUpStatus({ groupCount, activityCount, projectCount, activitiesAvailable, projectsAvailable }) {
  if (groupCount === 0) return 'noGroup'
  if (activitiesAvailable && activityCount === 0) return 'noActivity'
  if (projectsAvailable && projectCount >= 5) return 'highProjectLoad'
  return 'stable'
}

function followUpToneClass(status) {
  if (status === 'stable') return 'bg-emerald-50 text-emerald-700'
  if (status === 'highProjectLoad') return 'bg-orange-50 text-orange-700'
  return 'bg-amber-50 text-amber-700'
}

function DrawerAction({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
    >
      <AppIcon name={icon} className="h-4 w-4" />
      {label}
    </Link>
  )
}

function RecentExchangeItem({ notification, language, t }) {
  const title = notification.titre || notification.title || t('referent.exchangeFallbackTitle')
  const description = notification.message || notification.description || notification.contenu || t('referent.exchangeNoDetails')

  return (
    <Link
      to="/notifications"
      className="flex items-start gap-3 px-1 py-2 transition hover:bg-slate-50"
    >
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        <AppIcon name={iconForNotification(notification.type)} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-900">{title}</span>
        <span className="block truncate text-xs text-slate-500">{description}</span>
      </span>
      <span className="shrink-0 text-xs font-medium text-slate-400">
        {formatShortDate(notification.dateCreation, language)}
      </span>
    </Link>
  )
}

function isReferentCollaborationNotification(notification) {
  const type = String(notification?.type || '').toUpperCase()
  const text = `${notification?.titre || ''} ${notification?.title || ''} ${notification?.message || ''} ${notification?.description || ''}`.toLowerCase()
  return type.includes('MESSAGE') ||
    type.includes('GROUPE') ||
    type.includes('ADHESION') ||
    type.includes('REFERENT') ||
    type.includes('ACTIVITE') ||
    type.includes('PROJET') ||
    text.includes('référent') ||
    text.includes('referent') ||
    text.includes('groupe') ||
    text.includes('group')
}

function iconForNotification(type) {
  const normalized = String(type || '').toUpperCase()
  if (normalized.includes('MESSAGE')) return 'MessageCircle'
  if (normalized.includes('ACTIVITE')) return 'Calendar'
  if (normalized.includes('PROJET')) return 'Rocket'
  return 'Bell'
}

function formatShortDate(value, language) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(language || 'fr-BE', { day: '2-digit', month: 'short' })
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </label>
  )
}

function Alert({ type, children }) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-green-50 border-green-200 text-green-700'

  return <div className={`border px-4 py-3 rounded-xl mb-5 text-sm ${styles}`}>{children}</div>
}
