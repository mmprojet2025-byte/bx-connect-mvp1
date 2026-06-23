import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
import Alert from '../../components/ui/Alert'
import AppIcon from '../../components/ui/AppIcons'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import LoadingState from '../../components/ui/LoadingState'
import CompactKpiRow from '../../components/dashboard/CompactKpiRow'
import { CollaborativeDashboardLayout } from '../../components/dashboard/CollaborativeDashboard'

const DEFAULT_FILTERS = { group: 'all', period: 'all' }
const PRESENCE_STATUSES = ['PRESENT', 'ABSENT', 'EXCUSE', 'NON_RENSEIGNEE']
const CHART_COLORS = ['#0f766e', '#2563eb', '#d97706', '#7c3aed', '#dc2626', '#64748b']

export default function ReferentImpactDashboard() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState({
    groups: [],
    membersByGroup: {},
    activities: [],
    projects: [],
    presences: [],
  })
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [partialError, setPartialError] = useState('')

  const fetchImpact = useCallback(async () => {
    setLoading(true)
    setError('')
    setPartialError('')

    try {
      const [groupsResult, activitiesResult, projectsResult] = await Promise.allSettled([
        api.get('/referent/groupes'),
        api.get('/referent/mes-activites'),
        api.get('/projets/referent/mes-groupes'),
      ])

      const nextData = {
        groups: readArrayResult(groupsResult),
        activities: readArrayResult(activitiesResult),
        projects: readArrayResult(projectsResult),
        membersByGroup: {},
        presences: [],
      }

      if (groupsResult.status === 'rejected' && activitiesResult.status === 'rejected' && projectsResult.status === 'rejected') {
        throw new Error('referent-impact-load-failed')
      }

      if ([groupsResult, activitiesResult, projectsResult].some(result => result.status === 'rejected')) {
        setPartialError(t('referentImpact.partialError'))
      }

      const memberResults = await Promise.allSettled(
        nextData.groups
          .filter(group => group?.id)
          .map(group => api.get(`/referent/groupes/${group.id}/membres`).then(response => [group.id, response.data]))
      )
      memberResults.forEach(result => {
        if (result.status !== 'fulfilled') return
        const [groupId, members] = result.value
        nextData.membersByGroup[String(groupId)] = Array.isArray(members) ? members : []
      })

      if (memberResults.some(result => result.status === 'rejected')) {
        setPartialError(t('referentImpact.partialError'))
      }

      const presenceResults = await Promise.allSettled(
        nextData.activities
          .filter(activity => activity?.id)
          .map(activity => api.get(`/activites/${activity.id}/presences`)
            .then(response => enrichPresenceRows(response.data, activity)))
      )
      nextData.presences = presenceResults
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value)

      if (presenceResults.some(result => result.status === 'rejected')) {
        setPartialError(t('referentImpact.partialError'))
      }

      setData(nextData)
    } catch {
      setError(t('referentImpact.error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchImpact() }, [fetchImpact])

  const filteredData = useMemo(() => applyFilters(data, filters), [data, filters])
  const impact = useMemo(
    () => buildImpactModel(filteredData, data, filters, t, i18n.language),
    [filteredData, data, filters, t, i18n.language]
  )
  const hasAnyData = data.groups.length > 0
    || data.activities.length > 0
    || data.projects.length > 0
    || data.presences.length > 0

  return (
    <CollaborativeDashboardLayout
      emoji="BarChart3"
      title={t('referentImpact.title')}
      subtitle={t('referentImpact.subtitle')}
      actions={(
        <Link
          to="/referent/rapports"
          className="inline-flex items-center gap-2 rounded-lg border border-teal-100 bg-white px-4 py-2 text-sm font-black text-teal-800 transition hover:bg-teal-50"
        >
          <AppIcon name="FileText" className="h-4 w-4" />
          {t('referentImpact.actions.reports')}
        </Link>
      )}
    >
      {partialError && hasAnyData && <Alert type="warning">{partialError}</Alert>}

      {loading ? (
        <LoadingState label={t('referentImpact.loading')} />
      ) : error && !hasAnyData ? (
        <ErrorState
          title={t('referentImpact.errorTitle')}
          description={error}
          actionLabel={t('common.retry')}
          action={fetchImpact}
        />
      ) : !hasAnyData ? (
        <EmptyState
          icon="BarChart3"
          title={t('referentImpact.empty.title')}
          description={t('referentImpact.empty.description')}
        />
      ) : (
        <div className="space-y-4">
          <ImpactFilters
            filters={filters}
            groups={data.groups}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
            t={t}
          />

          <CompactKpiRow
            accent="teal"
            className="lg:grid-cols-3 xl:grid-cols-4"
            items={[
              { icon: 'Users', label: t('referentImpact.kpis.groups'), value: impact.kpis.groups },
              { icon: 'User', label: t('referentImpact.kpis.members'), value: impact.kpis.members },
              { icon: 'Calendar', label: t('referentImpact.kpis.completedActivities'), value: impact.kpis.completedActivities },
              { icon: 'ClipboardList', label: t('referentImpact.kpis.registered'), value: impact.kpis.registered, tone: 'blue' },
              { icon: 'CheckCircle', label: t('referentImpact.kpis.present'), value: impact.kpis.present, tone: 'green' },
              { icon: 'XCircle', label: t('referentImpact.kpis.absent'), value: impact.kpis.absent, tone: 'red' },
              { icon: 'Clock', label: t('referentImpact.kpis.excused'), value: impact.kpis.excused, tone: 'amber' },
              { icon: 'BarChart3', label: t('referentImpact.kpis.attendanceRate'), value: formatPercent(impact.kpis.attendanceRate, i18n.language), tone: 'violet' },
              { icon: 'Rocket', label: t('referentImpact.kpis.submittedProjects'), value: impact.kpis.submittedProjects, tone: 'blue' },
              { icon: 'CheckCircle', label: t('referentImpact.kpis.validatedByReferent'), value: impact.kpis.validatedByReferent, tone: 'teal' },
              { icon: 'XCircle', label: t('referentImpact.kpis.rejectedByReferent'), value: impact.kpis.rejectedByReferent, tone: 'red' },
              { icon: 'ShieldCheck', label: t('referentImpact.kpis.approvedByAdmin'), value: impact.kpis.approvedByAdmin, tone: 'green' },
            ]}
          />

          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-950/5">
            <SectionHeader
              icon="BarChart3"
              title={t('referentImpact.charts.title')}
              subtitle={t('referentImpact.charts.subtitle')}
            />
            {!impact.hasEncodedPresence && (
              <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                {t('referentImpact.presence.emptyEncoded')}
              </div>
            )}
            <div className="grid gap-4 xl:grid-cols-5">
              <ChartPanel title={t('referentImpact.charts.presenceByStatus')} empty={!impact.presenceStatusData.length} emptyLabel={t('referentImpact.charts.noData')}>
                <StatusPieChart data={impact.presenceStatusData} />
              </ChartPanel>
              <ChartPanel title={t('referentImpact.charts.activitiesByMonth')} empty={!impact.activitiesByMonthData.length} emptyLabel={t('referentImpact.charts.noData')}>
                <StatusBarChart data={impact.activitiesByMonthData} />
              </ChartPanel>
              <ChartPanel title={t('referentImpact.charts.projectsByStatus')} empty={!impact.projectStatusData.length} emptyLabel={t('referentImpact.charts.noData')}>
                <StatusBarChart data={impact.projectStatusData} />
              </ChartPanel>
              <ChartPanel title={t('referentImpact.charts.attendanceRateByActivity')} empty={!impact.attendanceRateByActivityData.length} emptyLabel={t('referentImpact.charts.noData')}>
                <StatusBarChart data={impact.attendanceRateByActivityData} unit="%" />
              </ChartPanel>
              <ChartPanel title={t('referentImpact.charts.topActivities')} empty={!impact.topAttendanceActivitiesData.length} emptyLabel={t('referentImpact.charts.noData')}>
                <StatusBarChart data={impact.topAttendanceActivitiesData} />
              </ChartPanel>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-950/5">
              <SectionHeader
                icon="ClipboardList"
                title={t('referentImpact.quality.title')}
                subtitle={t('referentImpact.quality.subtitle')}
              />
              <div className="grid gap-3 md:grid-cols-3">
                {impact.qualityItems.map(item => (
                  <QualityItem key={item.key} item={item} />
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-teal-100 bg-teal-50 p-5 text-teal-950">
              <SectionHeader
                icon="FileText"
                title={t('referentImpact.reports.title')}
                subtitle={t('referentImpact.reports.subtitle')}
              />
              <Link
                to="/referent/rapports"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-black text-white transition hover:bg-teal-600"
              >
                <AppIcon name="ArrowRight" className="h-4 w-4" />
                {t('referentImpact.actions.reports')}
              </Link>
            </article>
          </section>
        </div>
      )}
    </CollaborativeDashboardLayout>
  )
}

function ImpactFilters({ filters, groups, onChange, onReset, t }) {
  return (
    <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-950/5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          icon="Search"
          title={t('referentImpact.filters.title')}
          subtitle={t('referentImpact.filters.subtitle')}
        />
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
        >
          {t('common.reset')}
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <FilterSelect
          label={t('referentImpact.filters.period')}
          value={filters.period}
          onChange={value => onChange(current => ({ ...current, period: value }))}
          options={[
            { value: 'all', label: t('referentImpact.periods.all') },
            { value: '30', label: t('referentImpact.periods.last30') },
            { value: '90', label: t('referentImpact.periods.last90') },
            { value: 'year', label: t('referentImpact.periods.currentYear') },
          ]}
        />
        <FilterSelect
          label={t('referentImpact.filters.group')}
          value={filters.group}
          onChange={value => onChange(current => ({ ...current, group: value }))}
          options={[
            { value: 'all', label: t('referentImpact.filters.allGroups') },
            ...groups.map(group => ({ value: String(group.id), label: group.nom || t('groups.title') })),
          ]}
        />
      </div>
    </section>
  )
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <header className="mb-4">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
        <AppIcon name={icon} className="h-5 w-5 text-teal-700" />
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>}
    </header>
  )
}

function ChartPanel({ title, empty, emptyLabel, children }) {
  return (
    <article className="min-h-[240px] rounded-lg border border-slate-100 bg-slate-50/70 p-4">
      <h3 className="mb-3 text-sm font-black text-slate-800">{title}</h3>
      {empty ? (
        <div className="grid h-44 place-items-center rounded-lg border border-dashed border-slate-200 bg-white px-4 text-center text-sm font-semibold text-slate-500">
          <span>{emptyLabel}</span>
        </div>
      ) : children}
    </article>
  )
}

function StatusBarChart({ data, unit = '' }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} height={52} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip formatter={value => [`${value}${unit}`, '']} />
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

function StatusPieChart({ data }) {
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

function QualityItem({ item }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-700">{item.label}</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.value > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
          {item.value}
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
    </div>
  )
}

function readArrayResult(result) {
  if (result.status !== 'fulfilled') return []
  return Array.isArray(result.value.data) ? result.value.data : []
}

function enrichPresenceRows(rows, activity) {
  return (Array.isArray(rows) ? rows : []).map(row => ({
    ...row,
    activiteId: row.activiteId || activity.id,
    activiteTitre: row.activiteTitre || activity.titre,
    activiteDateDebut: activity.dateDebut,
    activiteDateFin: activity.dateFin,
    activiteStatut: activity.statut,
    activityGroupId: getGroupId(activity),
  }))
}

function applyFilters(data, filters) {
  const groups = filters.group === 'all'
    ? data.groups
    : data.groups.filter(group => String(group.id) === String(filters.group))

  const members = selectMembers(data.membersByGroup, filters.group)
    .filter(member => matchesPeriod(member, filters.period, ['dateInscription', 'createdAt', 'dateCreation']))
  const activities = data.activities
    .filter(activity => matchesGroup(activity, filters.group, data.groups))
    .filter(activity => matchesPeriod(activity, filters.period, ['dateDebut', 'dateFin', 'dateCreation']))
  const activityIds = new Set(activities.map(activity => String(activity.id)))
  const presences = data.presences
    .filter(presence => activityIds.has(String(presence.activiteId)))
    .filter(presence => matchesPeriod(presence, filters.period, ['activiteDateDebut', 'datePresence', 'dateInscription']))
  const projects = data.projects
    .filter(project => matchesGroup(project, filters.group, data.groups))
    .filter(project => matchesPeriod(project, filters.period, ['dateCreation', 'dateSoumission', 'dateValidation', 'dateModification']))

  return { groups, members, activities, projects, presences }
}

function buildImpactModel(filteredData, rawData, filters, t, language) {
  const presenceTotals = countPresenceStatuses(filteredData.presences)
  const projectTotals = buildProjectStatusTotals(filteredData.projects)
  const activityRows = buildActivityRows(filteredData.activities, filteredData.presences)
  const completedActivities = filteredData.activities.filter(isCompletedActivity)
  const denominator = presenceTotals.PRESENT + presenceTotals.ABSENT + presenceTotals.EXCUSE
  const selectedGroup = filters.group === 'all'
    ? null
    : rawData.groups.find(group => String(group.id) === String(filters.group))
  const activitiesWithoutGroupLink = filters.group !== 'all'
    ? rawData.activities.filter(activity => !getGroupId(activity)).length
    : 0
  const unclosedSheets = completedActivities.filter(activity => {
    const rows = filteredData.presences.filter(presence => String(presence.activiteId) === String(activity.id))
    return rows.length === 0 || rows.some(presence => !presence.presenceValideePar && !presence.dateValidationPresence)
  }).length

  return {
    hasEncodedPresence: denominator > 0,
    kpis: {
      groups: filteredData.groups.length,
      members: filteredData.members.length,
      completedActivities: completedActivities.length,
      registered: filteredData.presences.length,
      present: presenceTotals.PRESENT,
      absent: presenceTotals.ABSENT,
      excused: presenceTotals.EXCUSE,
      attendanceRate: denominator > 0 ? presenceTotals.PRESENT / denominator : 0,
      submittedProjects: projectTotals.submittedToReferent,
      validatedByReferent: projectTotals.validatedByReferent,
      rejectedByReferent: projectTotals.rejectedByReferent,
      approvedByAdmin: projectTotals.approvedByAdmin,
    },
    presenceStatusData: buildPresenceStatusData(presenceTotals, t),
    activitiesByMonthData: buildActivitiesByMonthData(filteredData.activities),
    projectStatusData: buildProjectStatusData(filteredData.projects, t),
    attendanceRateByActivityData: buildAttendanceRateByActivityData(activityRows),
    topAttendanceActivitiesData: buildTopAttendanceActivitiesData(activityRows),
    qualityItems: [
      {
        key: 'unclosedSheets',
        label: t('referentImpact.quality.unclosedSheets'),
        description: t('referentImpact.quality.unclosedSheetsDesc'),
        value: unclosedSheets,
      },
      {
        key: 'notFilled',
        label: t('referentImpact.quality.notFilled'),
        description: t('referentImpact.quality.notFilledDesc'),
        value: presenceTotals.NON_RENSEIGNEE,
      },
      {
        key: 'unlinkedActivities',
        label: t('referentImpact.quality.unlinkedActivities'),
        description: selectedGroup
          ? t('referentImpact.quality.unlinkedActivitiesDesc')
          : t('referentImpact.quality.unlinkedActivitiesAllGroupsDesc'),
        value: activitiesWithoutGroupLink,
      },
    ],
    language,
  }
}

function selectMembers(membersByGroup, groupId) {
  if (groupId !== 'all') return membersByGroup[String(groupId)] || []
  const uniqueMembers = new Map()
  Object.values(membersByGroup).flat().forEach(member => {
    const key = member.id || member.email || `${member.prenom || ''}-${member.nom || ''}`
    if (key) uniqueMembers.set(String(key), member)
  })
  return Array.from(uniqueMembers.values())
}

function matchesGroup(item, groupId, groups) {
  if (groupId === 'all') return true
  const directGroupId = getGroupId(item)
  if (directGroupId) return String(directGroupId) === String(groupId)
  const group = groups.find(candidate => String(candidate.id) === String(groupId))
  if (!group?.nom) return false
  return item.groupeNom === group.nom || item.nomGroupe === group.nom
}

function getGroupId(item) {
  return item?.groupeId
    || item?.groupId
    || item?.groupe?.id
    || item?.groupe?.groupeId
    || item?.activityGroupId
    || null
}

function matchesPeriod(item, period, fields) {
  if (period === 'all') return true
  const threshold = getPeriodThreshold(period)
  if (!threshold) return true
  const value = fields.map(field => item?.[field]).find(Boolean)
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date >= threshold
}

function getPeriodThreshold(period) {
  const now = new Date()
  if (period === '30') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
  if (period === '90') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90)
  if (period === 'year') return new Date(now.getFullYear(), 0, 1)
  return null
}

function countPresenceStatuses(rows) {
  return rows.reduce((acc, row) => {
    const status = PRESENCE_STATUSES.includes(row.statutPresence) ? row.statutPresence : 'NON_RENSEIGNEE'
    acc[status] += 1
    return acc
  }, { PRESENT: 0, ABSENT: 0, EXCUSE: 0, NON_RENSEIGNEE: 0 })
}

function buildProjectStatusTotals(projects) {
  return {
    submittedToReferent: countByStatuses(projects, ['SOUMIS']),
    validatedByReferent: countByStatuses(projects, ['VALIDE_REFERENT']),
    rejectedByReferent: countByStatuses(projects, ['REFUSE_REFERENT']),
    approvedByAdmin: countByStatuses(projects, ['APPROUVE', 'APPROUVÉ']),
  }
}

function countByStatuses(items, statuses) {
  return items.filter(item => statuses.includes(normalizeStatus(item.statut))).length
}

function normalizeStatus(status) {
  return String(status || '').trim().toUpperCase()
}

function buildPresenceStatusData(totals, t) {
  return PRESENCE_STATUSES
    .map(key => ({
      key,
      label: t(`presence.statuses.${key}`, { defaultValue: key }),
      value: totals[key] || 0,
    }))
    .filter(item => item.value > 0)
}

function buildActivitiesByMonthData(activities) {
  const counts = activities.reduce((acc, activity) => {
    const date = firstValidDate(activity, ['dateDebut', 'dateFin', 'dateCreation'])
    if (!date) return acc
    const key = date.toISOString().slice(0, 7)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, label: key, value }))
}

function buildProjectStatusData(projects, t) {
  const order = ['BROUILLON', 'SOUMIS', 'VALIDE_REFERENT', 'REFUSE_REFERENT', 'APPROUVE', 'REJETE', 'EN_COURS', 'TERMINE', 'ARCHIVE']
  const counts = projects.reduce((acc, project) => {
    const key = normalizeStatus(project.statut) || 'UNKNOWN'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return Object.entries(counts)
    .sort(([a], [b]) => {
      const indexA = order.indexOf(a)
      const indexB = order.indexOf(b)
      if (indexA === -1 && indexB === -1) return a.localeCompare(b)
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
    .map(([key, value]) => ({
      key,
      label: t(`statuses.${key}`, { defaultValue: key.replaceAll('_', ' ') }),
      value,
    }))
}

function buildActivityRows(activities, presences) {
  return activities.map(activity => {
    const rows = presences.filter(presence => String(presence.activiteId) === String(activity.id))
    const totals = countPresenceStatuses(rows)
    const denominator = totals.PRESENT + totals.ABSENT + totals.EXCUSE
    return {
      id: activity.id,
      title: activity.titre || '',
      registered: rows.length,
      present: totals.PRESENT,
      attendanceRate: denominator > 0 ? totals.PRESENT / denominator : 0,
    }
  })
}

function buildAttendanceRateByActivityData(activityRows) {
  return activityRows
    .filter(item => item.registered > 0)
    .sort((a, b) => b.attendanceRate - a.attendanceRate)
    .slice(0, 6)
    .map(item => ({ key: item.id, label: truncateLabel(item.title), value: Math.round(item.attendanceRate * 100) }))
}

function buildTopAttendanceActivitiesData(activityRows) {
  return activityRows
    .filter(item => item.present > 0)
    .sort((a, b) => b.present - a.present)
    .slice(0, 6)
    .map(item => ({ key: item.id, label: truncateLabel(item.title), value: item.present }))
}

function firstValidDate(item, fields) {
  for (const field of fields) {
    const value = item?.[field]
    if (!value) continue
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }
  return null
}

function isCompletedActivity(activity) {
  const value = activity.dateFin || activity.dateDebut
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date < new Date()
}

function truncateLabel(value) {
  const text = String(value || '')
  return text.length > 18 ? `${text.slice(0, 16)}...` : text
}

function formatPercent(value, language) {
  return new Intl.NumberFormat(language || 'fr-BE', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value || 0)
}
