import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
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
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import api from '../../api/axios'
import AppIcon from '../../components/ui/AppIcons'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import LoadingState from '../../components/ui/LoadingState'
import CompactKpiRow from '../../components/dashboard/CompactKpiRow'
import { CollaborativeDashboardLayout } from '../../components/dashboard/CollaborativeDashboard'

const CHART_COLORS = ['#2563eb', '#0f766e', '#d97706', '#7c3aed', '#dc2626', '#64748b']
const DEFAULT_FILTERS = { period: 'all', commune: 'all', group: 'all' }

export default function ImpactDashboard() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState({
    users: [],
    activities: [],
    groups: [],
    projects: [],
    supports: [],
    publicPartners: [],
    partnerAssignments: { referents: [], groupes: [] },
    presences: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [partialError, setPartialError] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)

  const fetchImpact = useCallback(async () => {
    setLoading(true)
    setError('')
    setPartialError('')

    const requests = [
      ['users', api.get('/admin/utilisateurs')],
      ['activities', api.get('/activites/admin/toutes')],
      ['groups', api.get('/admin/groupes')],
      ['projects', api.get('/projets/admin/tous')],
      ['supports', api.get('/partenaire/admin/tous')],
      ['publicPartners', api.get('/partenaire/publics')],
      ['partnerAssignments', api.get('/admin/partenaires/affectations')],
    ]

    try {
      const results = await Promise.allSettled(requests.map(([, request]) => request))
      const nextData = {
        users: [],
        activities: [],
        groups: [],
        projects: [],
        supports: [],
        publicPartners: [],
        partnerAssignments: { referents: [], groupes: [] },
        presences: [],
      }
      let fulfilled = 0

      results.forEach((result, index) => {
        const key = requests[index][0]
        if (result.status === 'fulfilled') {
          fulfilled += 1
          if (key === 'partnerAssignments') {
            nextData[key] = normalizePartnerAssignments(result.value.data)
          } else {
            nextData[key] = Array.isArray(result.value.data) ? result.value.data : []
          }
        }
      })

      if (nextData.activities.length > 0) {
        const presenceResults = await Promise.allSettled(
          nextData.activities
            .filter(activity => activity.id)
            .map(activity => api.get(`/activites/${activity.id}/presences`)
              .then(response => enrichPresenceRows(response.data, activity)))
        )
        nextData.presences = presenceResults
          .filter(result => result.status === 'fulfilled')
          .flatMap(result => result.value)

        if (presenceResults.some(result => result.status === 'rejected')) {
          setPartialError(t('impact.partialError'))
        }
      }

      if (fulfilled === 0) {
        throw new Error('impact-load-failed')
      }

      if (fulfilled < requests.length) {
        setPartialError(t('impact.partialError'))
      }
      setData(nextData)
    } catch {
      setError(t('impact.error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchImpact() }, [fetchImpact])

  const filterOptions = useMemo(() => buildFilterOptions(data), [data])
  const filteredData = useMemo(() => applyImpactFilters(data, filters), [data, filters])
  const selectedGroup = useMemo(
    () => filteredData.groups.find(group => String(group.id) === String(filters.group)) || null,
    [filteredData.groups, filters.group]
  )
  const impact = useMemo(
    () => buildImpactModel(filteredData, t, { selectedGroup }),
    [filteredData, selectedGroup, t]
  )
  const filterSummary = useMemo(
    () => buildFilterSummary(filters, filterOptions, t),
    [filters, filterOptions, t]
  )

  useEffect(() => {
    if (!mapContainerRef.current || impact.mapPoints.length === 0) return undefined

    const firstPoint = impact.mapPoints[0]
    const map = L.map(mapContainerRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView([firstPoint.latitude, firstPoint.longitude], 11)
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const bounds = []
    impact.mapPoints.forEach(point => {
      const coordinates = [point.latitude, point.longitude]
      bounds.push(coordinates)
      L.marker(coordinates, {
        icon: L.divIcon({
          className: '',
          html: `<span style="display:grid;place-items:center;width:24px;height:24px;border-radius:999px;background:${point.kind === 'activity' ? '#2563eb' : '#0f766e'};border:3px solid white;box-shadow:0 8px 20px rgba(15,23,42,.25);color:white;font-size:11px;font-weight:900">${point.kind === 'activity' ? 'A' : 'G'}</span>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      }).addTo(map).bindPopup(point.label)
    })

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 })
    }
    setTimeout(() => map.invalidateSize(), 0)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [impact.mapPoints])

  const hasAnyData = hasImpactData(data)
  const hasFilteredData = hasImpactData(filteredData)
  const hasEncodedPresence = impact.presence.hasEncoded
  const generatedAt = useMemo(() => new Date(), [])
  const exportProps = { data: filteredData, impact, filterSummary, t, language: i18n.language }
  const participationCharts = [
    { key: 'presenceByStatus', title: t('impact.charts.presenceByStatus'), data: impact.presenceStatusData, type: 'pie' },
    { key: 'presenceEvolution', title: t('impact.charts.presenceEvolution'), data: impact.presenceEvolutionData, type: 'bar' },
    { key: 'topActivitiesByAttendance', title: t('impact.charts.topActivitiesByAttendance'), data: impact.topAttendanceActivitiesData, type: 'bar' },
    { key: 'attendanceRateByActivity', title: t('impact.charts.attendanceRateByActivity'), data: impact.attendanceRateByActivityData, type: 'bar', unit: '%' },
    { key: 'activitiesByStatus', title: t('impact.charts.activitiesByStatus'), data: impact.activityStatusData, type: 'pie' },
    { key: 'activitiesByCommune', title: t('impact.charts.activitiesByCommune'), data: impact.activityCommuneData, type: 'bar' },
    { key: 'projectsByStatus', title: t('impact.charts.projectsByStatus'), data: impact.projectStatusData, type: 'bar' },
  ].filter(chart => chart.data.length > 0)

  return (
    <CollaborativeDashboardLayout
      emoji="BarChart3"
      title={t('impact.title')}
      subtitle={t('impact.subtitle')}
    >
      {partialError && hasAnyData && <Alert type="warning">{partialError}</Alert>}

      {loading ? (
        <LoadingState label={t('impact.loading')} />
      ) : error && !hasAnyData ? (
        <ErrorState
          title={t('common.loadErrorTitle')}
          description={error}
          actionLabel={t('common.retry')}
          action={fetchImpact}
        />
      ) : !hasAnyData ? (
        <EmptyState
          icon="BarChart"
          title={t('impact.emptyTitle')}
          description={t('impact.emptyDescription')}
        />
      ) : (
        <>
          <ImpactFilters
            filters={filters}
            options={filterOptions}
            summary={filterSummary}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
            t={t}
          />

          {!hasFilteredData && (
            <div className="mb-4">
              <EmptyState
                icon="Search"
                title={t('impact.filters.emptyTitle')}
                description={t('impact.filters.emptyDescription')}
              />
            </div>
          )}

          <ImpactSection
            icon="BarChart3"
            title={t('impact.sections.summary.title')}
            description={t('impact.sections.summary.description')}
          >
            <CompactKpiRow
              accent="blue"
              className="lg:grid-cols-3 xl:grid-cols-6"
              items={[
                { icon: 'Users', label: t('impact.kpis.realParticipants'), value: impact.kpis.realParticipants, tone: 'blue' },
                { icon: 'BarChart', label: t('impact.kpis.attendanceRate'), value: formatPercent(impact.kpis.attendanceRate, i18n.language), tone: 'teal' },
                { icon: 'Rocket', label: t('impact.kpis.approvedProjects'), value: impact.kpis.approvedProjects, tone: 'violet' },
                { icon: 'Handshake', label: t('impact.kpis.activePartners'), value: impact.partnerImpact.kpis.activePartners, tone: 'green' },
                { icon: 'DollarSign', label: t('impact.partners.kpis.supportedAmount'), value: formatCurrency(impact.partnerImpact.kpis.supportedAmount, i18n.language), tone: 'amber' },
                { icon: 'Building', label: t('impact.kpis.activeGroups'), value: impact.kpis.activeGroups, tone: 'indigo' },
              ]}
            />
          </ImpactSection>

          <ImpactSection
            icon="Users"
            title={t('impact.sections.participation.title')}
            description={t('impact.sections.participation.description')}
          >
            <div className="mb-4">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${hasEncodedPresence ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                <AppIcon name={hasEncodedPresence ? 'CheckCircle' : 'ClipboardList'} className="h-4 w-4" />
                {hasEncodedPresence ? t('impact.presence.badgeAvailable') : t('impact.presence.badgeEmpty')}
              </span>
            </div>
            <CompactKpiRow
              accent="teal"
              className="mb-4 lg:grid-cols-3 xl:grid-cols-6"
              items={[
                { icon: 'Calendar', label: t('impact.kpis.completedActivities'), value: impact.kpis.completedActivities, tone: 'teal' },
                { icon: 'CheckCircle', label: t('impact.kpis.present'), value: impact.kpis.present, tone: 'green' },
                { icon: 'XCircle', label: t('impact.kpis.absent'), value: impact.kpis.absent, tone: 'red' },
                { icon: 'Clock', label: t('impact.kpis.excused'), value: impact.kpis.excused, tone: 'amber' },
                { icon: 'Clock', label: t('impact.kpis.submittedToReferent'), value: impact.kpis.submittedToReferent, tone: 'blue' },
                { icon: 'CheckCircle', label: t('impact.kpis.validatedByReferent'), value: impact.kpis.validatedByReferent, tone: 'teal' },
                { icon: 'XCircle', label: t('impact.kpis.rejectedByReferent'), value: impact.kpis.rejectedByReferent, tone: 'red' },
                { icon: 'ShieldX', label: t('impact.kpis.finalRejectedProjects'), value: impact.kpis.rejectedProjects, tone: 'amber' },
              ]}
            />
            <ChartGrid charts={participationCharts} t={t} />
          </ImpactSection>

          <PartnerImpactSection
            impact={impact.partnerImpact}
            supportStatusData={impact.supportStatusData}
            t={t}
            language={i18n.language}
          />

          <ImpactSection
            icon="ClipboardList"
            title={t('impact.sections.qualityExports.title')}
            description={t('impact.sections.qualityExports.description')}
          >
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
              <article className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <SectionHeader
                  icon="ClipboardList"
                  title={t('impact.quality.title')}
                  description={t('impact.quality.description')}
                />
                <div className="grid gap-3">
                  {impact.qualityItems.map(item => (
                    <QualityItem key={item.label} item={item} />
                  ))}
                </div>
              </article>

              <div className="grid gap-4">
                <article className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                  <SectionHeader
                    icon="MapPin"
                    title={t('impact.map.title')}
                    description={t('impact.map.description')}
                  />
                  {impact.mapPoints.length > 0 ? (
                    <>
                      <div
                        ref={mapContainerRef}
                        className="h-[320px] overflow-hidden rounded-lg border border-slate-100"
                        aria-label={t('impact.map.aria')}
                      />
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                        <LegendDot color="bg-blue-700" label={t('impact.map.activities')} />
                        <LegendDot color="bg-teal-700" label={t('impact.map.groups')} />
                      </div>
                    </>
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-500">
                      {t('impact.map.emptyDescription')}
                    </p>
                  )}
                </article>

                <article className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-blue-700">{t('impact.limits.eyebrow')}</p>
                      <h2 className="mt-1 text-lg font-black text-blue-950">{t('impact.limits.title')}</h2>
                      <p className="mt-2 text-sm leading-6 text-blue-900/70">{t('impact.limits.description')}</p>
                      <p className="mt-2 text-xs font-bold text-blue-900/60">
                        {t('impact.exports.generatedAt', { date: formatDateTime(generatedAt, i18n.language) })}
                      </p>
                    </div>
                    <ExportActions
                      onPdf={() => exportImpactPdf({ ...exportProps, generatedAt: new Date() })}
                      onExcel={() => exportImpactExcel({ ...exportProps, generatedAt: new Date() })}
                      t={t}
                    />
                  </div>
                </article>
              </div>
            </div>
          </ImpactSection>
        </>
      )}
    </CollaborativeDashboardLayout>
  )
}

function PartnerImpactSection({ impact, supportStatusData, t, language }) {
  const charts = [
    { key: 'partnerTypes', title: t('impact.partners.charts.byType'), data: impact.partnerTypeData, type: 'pie' },
    { key: 'linkTypes', title: t('impact.partners.charts.linkTypes'), data: impact.linkTypeData, type: 'pie' },
    { key: 'supportTargets', title: t('impact.partners.charts.supportsByTarget'), data: impact.supportTargetData, type: 'bar' },
    { key: 'supportStatuses', title: t('impact.charts.supportsByStatus'), data: supportStatusData, type: 'pie' },
  ].filter(chart => chart.data.length > 0)

  return (
    <ImpactSection
      icon="Handshake"
      title={t('impact.sections.partners.title')}
      description={t('impact.sections.partners.description')}
    >
      <SectionHeader
        icon="Handshake"
        title={t('impact.partners.title')}
        description={t('impact.partners.description')}
      />

      <CompactKpiRow
        accent="green"
        className="mb-4 lg:grid-cols-3 xl:grid-cols-5"
        items={[
          { icon: 'Handshake', label: t('impact.partners.kpis.active'), value: impact.kpis.activePartners, tone: 'green' },
          { icon: 'XCircle', label: t('impact.partners.kpis.inactive'), value: impact.kpis.inactivePartners, tone: 'slate' },
          { icon: 'User', label: t('impact.partners.kpis.withReferent'), value: impact.kpis.withReferent, tone: 'blue' },
          { icon: 'AlertTriangle', label: t('impact.partners.kpis.withoutReferent'), value: impact.kpis.withoutReferent, tone: impact.kpis.withoutReferent > 0 ? 'amber' : 'green' },
          { icon: 'Users', label: t('impact.partners.kpis.withGroup'), value: impact.kpis.withGroup, tone: 'teal' },
          { icon: 'AlertTriangle', label: t('impact.partners.kpis.withoutGroup'), value: impact.kpis.withoutGroup, tone: impact.kpis.withoutGroup > 0 ? 'amber' : 'green' },
          { icon: 'DollarSign', label: t('impact.partners.kpis.supportedAmount'), value: formatCurrency(impact.kpis.supportedAmount, language), tone: 'amber' },
          { icon: 'Rocket', label: t('impact.partners.kpis.supportedProjects'), value: impact.kpis.supportedProjects, tone: 'violet' },
          { icon: 'Calendar', label: t('impact.partners.kpis.supportedActivities'), value: impact.kpis.supportedActivities, tone: 'blue' },
          { icon: 'Megaphone', label: t('impact.partners.kpis.publishedOpportunities'), value: impact.kpis.publishedOpportunities, tone: 'green' },
        ]}
      />

      {impact.hasData ? (
        <ChartGrid charts={charts} t={t} />
      ) : (
        <EmptyState
          icon="Handshake"
          title={t('impact.partners.emptyTitle')}
          description={t('impact.partners.emptyDescription')}
        />
      )}
    </ImpactSection>
  )
}

function ImpactSection({ icon, title, description, children }) {
  return (
    <section className="mb-4 rounded-xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-950/5">
      <SectionHeader icon={icon} title={title} description={description} />
      {children}
    </section>
  )
}

function ChartGrid({ charts, t }) {
  if (!charts.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">
        {t('impact.charts.emptySection')}
      </p>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {charts.map(chart => (
        <ChartPanel key={chart.key} title={chart.title}>
          {chart.type === 'pie'
            ? <StatusPieChart data={chart.data} />
            : <StatusBarChart data={chart.data} unit={chart.unit} />}
        </ChartPanel>
      ))}
    </div>
  )
}

function ExportActions({ onPdf, onExcel, t }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onPdf}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-600"
      >
        <AppIcon name="FileText" className="h-4 w-4" />
        {t('impact.exports.pdf')}
      </button>
      <button
        type="button"
        onClick={onExcel}
        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-800 transition hover:bg-blue-100"
      >
        <AppIcon name="Archive" className="h-4 w-4" />
        {t('impact.exports.excel')}
      </button>
    </div>
  )
}

function SectionHeader({ icon, title, description }) {
  return (
    <header className="mb-4">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
        <AppIcon name={icon} className="h-5 w-5 text-blue-700" />
        {title}
      </h2>
      {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
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

function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  )
}

function ImpactFilters({ filters, options, summary, onChange, onReset, t }) {
  return (
    <section className="mb-4 rounded-xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-950/5">
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeader
          icon="Search"
          title={t('impact.filters.title')}
          description={t('impact.filters.description')}
        />
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
        >
          <AppIcon name="XCircle" className="h-4 w-4" />
          {t('impact.filters.reset')}
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <FilterSelect
          label={t('impact.filters.period')}
          value={filters.period}
          onChange={value => onChange(current => ({ ...current, period: value }))}
          options={buildPeriodOptions(t)}
        />
        <FilterSelect
          label={t('impact.filters.commune')}
          value={filters.commune}
          onChange={value => onChange(current => ({ ...current, commune: value }))}
          options={[
            { value: 'all', label: t('impact.filters.allCommunes') },
            ...options.communes.map(commune => ({ value: commune, label: commune })),
          ]}
        />
        <FilterSelect
          label={t('impact.filters.group')}
          value={filters.group}
          onChange={value => onChange(current => ({ ...current, group: value }))}
          options={[
            { value: 'all', label: t('impact.filters.allGroups') },
            ...options.groups.map(group => ({ value: String(group.id), label: group.nom })),
          ]}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
        {summary.map(item => (
          <span key={item.label} className="rounded-full bg-slate-100 px-3 py-1">
            {item.label}: <span className="text-slate-800">{item.value}</span>
          </span>
        ))}
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
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function buildFilterOptions(data) {
  const communes = Array.from(new Set([
    ...data.activities.map(item => item.commune).filter(Boolean),
    ...data.groups.map(item => item.commune).filter(Boolean),
  ])).sort((a, b) => a.localeCompare(b))

  const groups = data.groups
    .filter(group => group.id && group.nom)
    .map(group => ({ id: group.id, nom: group.nom }))
    .sort((a, b) => a.nom.localeCompare(b.nom))

  return { communes, groups }
}

function hasImpactData(data) {
  return [
    data.users,
    data.activities,
    data.groups,
    data.projects,
    data.supports,
    data.publicPartners,
    data.presences,
    data.partnerAssignments?.referents,
    data.partnerAssignments?.groupes,
  ].some(items => Array.isArray(items) && items.length > 0)
}

function applyImpactFilters(data, filters) {
  const periodFilter = getPeriodFilter(filters.period)
  const hasTerritoryFilter = filters.commune !== 'all' || filters.group !== 'all'
  const hasAnyFilter = hasTerritoryFilter || filters.period !== 'all'
  const groupLookup = new Map(data.groups.map(group => [String(group.id), group]))
  const activityLookup = new Map(data.activities.map(activity => [String(activity.id), activity]))
  const projectLookup = new Map(data.projects.map(project => [String(project.id), project]))

  const groups = data.groups.filter(group =>
    matchesPeriod(group, periodFilter, ['dateCreation', 'dateValidation'])
    && matchesCommune(group, filters.commune)
    && matchesGroup(group, filters.group)
  )
  const selectedGroupIds = new Set(groups.map(group => String(group.id)))

  const activities = data.activities.filter(activity =>
    matchesPeriod(activity, periodFilter, ['dateDebut', 'dateFin', 'dateCreation'])
    && matchesCommune(activity, filters.commune)
    && matchesGroupOrUnfiltered(activity, filters.group)
  )
  const filteredActivityIds = new Set(activities.map(activity => String(activity.id)))

  const projects = data.projects.filter(project =>
    matchesPeriod(project, periodFilter, ['dateCreation', 'dateSoumission', 'dateValidation', 'dateCloture'])
    && matchesProjectCommune(project, filters.commune, groupLookup)
    && matchesProjectGroup(project, filters.group, selectedGroupIds)
  )
  const filteredProjectIds = new Set(projects.map(project => String(project.id)))

  const supports = data.supports.filter(support =>
    matchesPeriod(support, periodFilter, ['datePaiement', 'dateCreation', 'dateReponseAdmin'])
    && matchesSupportScope(support, filters, filteredProjectIds, filteredActivityIds, projectLookup, activityLookup, groupLookup)
  )

  const partnerAssignments = filterPartnerAssignments(data.partnerAssignments, filters, selectedGroupIds, groups)

  const presences = data.presences.filter(presence => {
    if (!filteredActivityIds.has(String(presence.activiteId))) return false
    return matchesPeriod(presence, periodFilter, ['activiteDateDebut', 'datePresence', 'dateInscription'])
  })

  return {
    users: hasTerritoryFilter ? [] : data.users.filter(user => matchesPeriod(user, periodFilter, ['dateInscription'])),
    activities,
    groups,
    projects,
    supports,
    publicPartners: hasAnyFilter ? [] : data.publicPartners,
    partnerAssignments,
    presences,
  }
}

function buildPeriodOptions(t) {
  return [
    { value: 'all', label: t('impact.filters.periodAll') },
    { value: '30d', label: t('impact.filters.period30') },
    { value: '90d', label: t('impact.filters.period90') },
    { value: 'year', label: t('impact.filters.periodYear') },
  ]
}

function buildFilterSummary(filters, options, t) {
  const period = buildPeriodOptions(t).find(item => item.value === filters.period)?.label || t('impact.filters.periodAll')
  const commune = filters.commune === 'all' ? t('impact.filters.allCommunes') : filters.commune
  const group = filters.group === 'all'
    ? t('impact.filters.allGroups')
    : options.groups.find(item => String(item.id) === String(filters.group))?.nom || t('impact.filters.unknownGroup')

  return [
    { label: t('impact.filters.period'), value: period },
    { label: t('impact.filters.commune'), value: commune },
    { label: t('impact.filters.group'), value: group },
  ]
}

function normalizePartnerAssignments(payload) {
  return {
    referents: Array.isArray(payload?.referents) ? payload.referents : [],
    groupes: Array.isArray(payload?.groupes) ? payload.groupes : [],
  }
}

function filterPartnerAssignments(assignments = {}, filters, selectedGroupIds, filteredGroups) {
  const referents = Array.isArray(assignments.referents) ? assignments.referents : []
  const groupes = Array.isArray(assignments.groupes) ? assignments.groupes : []

  if (filters.group === 'all' && filters.commune === 'all') {
    return { referents, groupes }
  }

  const groupIds = new Set(filteredGroups.map(group => String(group.id)))
  selectedGroupIds.forEach(id => groupIds.add(String(id)))

  const filteredGroupLinks = groupes.filter(link => groupIds.has(String(link.groupeId)))
  const partnerIdsFromGroups = new Set(filteredGroupLinks.map(link => String(link.partenaireProfilId)).filter(Boolean))

  return {
    referents: filters.group === 'all'
      ? referents
      : referents.filter(link => partnerIdsFromGroups.has(String(link.partenaireProfilId))),
    groupes: filteredGroupLinks,
  }
}

function getPeriodFilter(period) {
  const now = new Date()
  if (period === '30d') return { start: daysAgo(30), end: now }
  if (period === '90d') return { start: daysAgo(90), end: now }
  if (period === 'year') return { start: new Date(now.getFullYear(), 0, 1), end: now }
  return null
}

function daysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function matchesPeriod(item, periodFilter, fields) {
  if (!periodFilter) return true
  const date = firstValidDate(item, fields)
  if (!date) return false
  return date >= periodFilter.start && date <= periodFilter.end
}

function firstValidDate(item, fields) {
  for (const field of fields) {
    const value = item[field]
    if (!value) continue
    const date = new Date(value)
    if (Number.isFinite(date.getTime())) return date
  }
  return null
}

function matchesCommune(item, commune) {
  return commune === 'all' || item.commune === commune
}

function matchesGroup(item, groupId) {
  return groupId === 'all' || String(item.id) === String(groupId)
}

function matchesGroupOrUnfiltered(item, groupId) {
  if (groupId === 'all') return true
  return String(item.groupeId || item.groupe?.id || '') === String(groupId)
}

function matchesProjectGroup(project, groupId, selectedGroupIds) {
  if (groupId === 'all') return true
  return String(project.groupeId || project.groupe?.id || '') === String(groupId)
    || selectedGroupIds.has(String(project.groupeId || project.groupe?.id || ''))
}

function matchesProjectCommune(project, commune, groupLookup) {
  if (commune === 'all') return true
  const group = groupLookup.get(String(project.groupeId || project.groupe?.id || ''))
  return group?.commune === commune
}

function matchesSupportScope(support, filters, filteredProjectIds, filteredActivityIds, projectLookup, activityLookup, groupLookup) {
  if (filters.group !== 'all') {
    if (support.projetId && filteredProjectIds.has(String(support.projetId))) return true
    return false
  }

  if (filters.commune !== 'all') {
    if (support.activiteId && filteredActivityIds.has(String(support.activiteId))) return true
    if (support.projetId) {
      const project = projectLookup.get(String(support.projetId))
      return matchesProjectCommune(project || {}, filters.commune, groupLookup)
    }
    const activity = activityLookup.get(String(support.activiteId || ''))
    return activity?.commune === filters.commune
  }

  return true
}

function buildImpactModel(data, t, context = {}) {
  const now = new Date()
  const users = data.users
  const activities = data.activities
  const groups = data.groups
  const projects = data.projects
  const supports = data.supports
  const publicPartners = data.publicPartners
  const partnerAssignments = data.partnerAssignments || { referents: [], groupes: [] }
  const presences = data.presences || []
  const attendanceSummary = buildAttendanceSummary(presences)
  const presenceByActivity = buildPresenceByActivity(presences)
  const projectSummary = buildProjectStatusSummary(projects)
  const partnerImpact = buildPartnerImpactModel({ publicPartners, partnerAssignments, supports, projects, activities, t })

  const activeMembers = context.selectedGroup?.nombreMembres ?? users.filter(user => user.role === 'MEMBRE' && user.actif !== false).length
  const completedActivities = activities.filter(activity => {
    const endDate = activity.dateFin ? new Date(activity.dateFin) : null
    return endDate && Number.isFinite(endDate.getTime()) && endDate < now
  }).length
  const activeGroups = groups.filter(group => group.statut === 'VALIDE' || group.actif === true).length
  const activePartners = users.filter(user => user.role === 'PARTENAIRE' && user.actif !== false).length || publicPartners.length
  const collectedAmount = supports
    .filter(support => support.statutPaiement === 'PAYE')
    .reduce((sum, support) => sum + Number(support.montant || 0), 0)

  return {
    kpis: {
      activeMembers,
      completedActivities,
      activeGroups,
      submittedToReferent: projectSummary.submittedToReferent,
      validatedByReferent: projectSummary.validatedByReferent,
      rejectedByReferent: projectSummary.rejectedByReferent,
      approvedProjects: projectSummary.approvedByAdmin,
      rejectedProjects: projectSummary.rejectedByAdmin,
      activePartners,
      collectedAmount,
      realParticipants: attendanceSummary.realParticipants,
      present: attendanceSummary.present,
      absent: attendanceSummary.absent,
      excused: attendanceSummary.excused,
      attendanceRate: attendanceSummary.attendanceRate,
    },
    partnerImpact,
    presence: attendanceSummary,
    activityStatusData: buildCountData(activities, 'statut', t),
    projectStatusData: buildProjectStatusData(projects, t),
    supportStatusData: buildCountData(supports, 'statutPaiement', t),
    activityCommuneData: buildCountData(activities.filter(item => item.commune), 'commune', t, false),
    presenceStatusData: buildPresenceStatusData(attendanceSummary, t),
    presenceEvolutionData: buildPresenceEvolutionData(presences),
    topAttendanceActivitiesData: buildTopAttendanceActivitiesData(presenceByActivity),
    attendanceRateByActivityData: buildAttendanceRateByActivityData(presenceByActivity),
    mapPoints: [
      ...activities.map(activity => toMapPoint(activity, 'activity', presenceByActivity.get(String(activity.id)), t)),
      ...groups.map(group => toMapPoint(group, 'group')),
    ].filter(Boolean),
    qualityItems: [
      {
        label: t('impact.quality.activitiesWithoutCommune'),
        description: t('impact.quality.activitiesWithoutCommuneDesc'),
        value: activities.filter(activity => !activity.commune).length,
      },
      {
        label: t('impact.quality.activitiesWithoutCoordinates'),
        description: t('impact.quality.activitiesWithoutCoordinatesDesc'),
        value: activities.filter(activity => !hasCoordinates(activity)).length,
      },
      {
        label: t('impact.quality.groupsWithoutDescription'),
        description: t('impact.quality.groupsWithoutDescriptionDesc'),
        value: groups.filter(group => !group.description).length,
      },
      {
        label: t('impact.quality.projectsWithoutBudget'),
        description: t('impact.quality.projectsWithoutBudgetDesc'),
        value: projects.filter(project => project.budgetDemande === null || project.budgetDemande === undefined || project.budgetDemande === '').length,
      },
      {
        label: t('impact.quality.projectsWaitingAdmin'),
        description: t('impact.quality.projectsWaitingAdminDesc'),
        value: projectSummary.validatedByReferent,
      },
      {
        label: t('impact.quality.legacySubmittedProjects'),
        description: t('impact.quality.legacySubmittedProjectsDesc'),
        value: projectSummary.submittedToReferent,
      },
      {
        label: t('impact.quality.projectsRejectedReferentWithoutComment'),
        description: t('impact.quality.projectsRejectedReferentWithoutCommentDesc'),
        value: projects.filter(project => project.statut === 'REFUSE_REFERENT' && !getProjectReferentComment(project)).length,
      },
      {
        label: t('impact.quality.completedActivitiesWithoutPresenceSheet'),
        description: t('impact.quality.completedActivitiesWithoutPresenceSheetDesc'),
        value: activities.filter(activity => isCompletedActivity(activity, now) && !presenceByActivity.has(String(activity.id))).length,
      },
      {
        label: t('impact.quality.completedActivitiesNotClosed'),
        description: t('impact.quality.completedActivitiesNotClosedDesc'),
        value: activities.filter(activity => {
          if (!isCompletedActivity(activity, now)) return false
          const summary = presenceByActivity.get(String(activity.id))
          return summary && !summary.closed
        }).length,
      },
      {
        label: t('impact.quality.unfilledPresences'),
        description: t('impact.quality.unfilledPresencesDesc'),
        value: presences.filter(presence => presence.statutPresence === 'NON_RENSEIGNEE').length,
      },
      ...partnerImpact.qualityItems,
    ],
  }
}

function buildPartnerImpactModel({ publicPartners, partnerAssignments, supports, t }) {
  const referentLinks = Array.isArray(partnerAssignments?.referents) ? partnerAssignments.referents : []
  const groupLinks = Array.isArray(partnerAssignments?.groupes) ? partnerAssignments.groupes : []
  const partnerRecords = collectPartnerRecords(publicPartners, referentLinks, groupLinks)
  const activeReferentPartnerIds = new Set(referentLinks.filter(link => link.statut === 'ACTIF').map(getPartnerProfileId).filter(Boolean))
  const activeGroupPartnerIds = new Set(groupLinks.filter(link => link.statut === 'ACTIF').map(getPartnerProfileId).filter(Boolean))
  const inactivePartnerIds = new Set([
    ...referentLinks.filter(link => link.statut === 'INACTIF').map(getPartnerProfileId).filter(Boolean),
    ...groupLinks.filter(link => link.statut === 'INACTIF').map(getPartnerProfileId).filter(Boolean),
  ])
  const paidSupports = supports.filter(support => support.statutPaiement === 'PAYE')
  const supportedPartnerKeys = new Set(paidSupports.map(getSupportPartnerKey).filter(Boolean))

  const partners = Array.from(partnerRecords.values())
  const totalKnownPartners = partners.length
  const inactivePartners = partners.filter(partner => inactivePartnerIds.has(String(partner.profileId)) && !partner.active).length
  const activePartners = partners.filter(partner => partner.active).length
  const partnersWithReferent = partners.filter(partner => activeReferentPartnerIds.has(String(partner.profileId))).length
  const partnersWithGroup = partners.filter(partner => activeGroupPartnerIds.has(String(partner.profileId))).length
  const partnersWithoutKnownSupport = partners.filter(partner => {
    if (!partner.userId) return false
    return !supportedPartnerKeys.has(`user:${partner.userId}`)
  }).length

  return {
    hasData: totalKnownPartners > 0 || supports.length > 0,
    kpis: {
      activePartners,
      inactivePartners,
      withReferent: partnersWithReferent,
      withoutReferent: Math.max(totalKnownPartners - partnersWithReferent, 0),
      withGroup: partnersWithGroup,
      withoutGroup: Math.max(totalKnownPartners - partnersWithGroup, 0),
      supportedAmount: paidSupports.reduce((sum, support) => sum + Number(support.montant || 0), 0),
      supportedProjects: new Set(paidSupports.map(support => support.projetId).filter(Boolean)).size,
      supportedActivities: new Set(paidSupports.map(support => support.activiteId).filter(Boolean)).size,
      publishedOpportunities: 0,
    },
    partnerTypeData: buildPartnerTypeData(partners, t),
    linkTypeData: buildPartnerLinkTypeData(groupLinks.filter(link => link.statut === 'ACTIF'), t),
    supportTargetData: buildSupportTargetData(paidSupports, t),
    qualityItems: [
      {
        label: t('impact.partners.quality.withoutReferent'),
        description: t('impact.partners.quality.withoutReferentDesc'),
        value: Math.max(totalKnownPartners - partnersWithReferent, 0),
      },
      {
        label: t('impact.partners.quality.withoutGroup'),
        description: t('impact.partners.quality.withoutGroupDesc'),
        value: Math.max(totalKnownPartners - partnersWithGroup, 0),
      },
      {
        label: t('impact.partners.quality.inactive'),
        description: t('impact.partners.quality.inactiveDesc'),
        value: inactivePartners,
      },
      {
        label: t('impact.partners.quality.withoutKnownSupport'),
        description: t('impact.partners.quality.withoutKnownSupportDesc'),
        value: partnersWithoutKnownSupport,
      },
    ],
  }
}

function collectPartnerRecords(publicPartners, referentLinks, groupLinks) {
  const records = new Map()
  publicPartners.forEach(partner => {
    const profileId = String(partner.id || partner.partenaireProfilId || '')
    if (!profileId) return
    records.set(profileId, {
      profileId,
      userId: partner.partenaireUserId || partner.userId || null,
      type: partner.typePartenaire || 'AUTRE',
      active: true,
    })
  })

  ;[...referentLinks, ...groupLinks].forEach(link => {
    const profileId = getPartnerProfileId(link)
    if (!profileId) return
    const current = records.get(profileId) || { profileId, userId: null, type: 'AUTRE', active: false }
    records.set(profileId, {
      ...current,
      userId: current.userId || link.partenaireUserId || null,
      type: current.type || link.typePartenaire || 'AUTRE',
      active: current.active || link.statut === 'ACTIF',
    })
  })

  return records
}

function getPartnerProfileId(item) {
  const id = item?.partenaireProfilId || item?.profilId || item?.id
  return id ? String(id) : ''
}

function getSupportPartnerKey(support) {
  if (support.partenaireId) return `user:${support.partenaireId}`
  if (support.partenaireEmail) return `email:${support.partenaireEmail}`
  return ''
}

function buildPartnerTypeData(partners, t) {
  const counts = partners.reduce((acc, partner) => {
    const key = partner.type || 'AUTRE'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return Object.entries(counts).map(([key, value]) => ({
    key,
    label: t(`partnerInstitution.types.${key}`, { defaultValue: key.replaceAll('_', ' ') }),
    value,
  }))
}

function buildPartnerLinkTypeData(groupLinks, t) {
  const counts = groupLinks.reduce((acc, link) => {
    const key = link.typeLien || 'AUTRE'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return Object.entries(counts).map(([key, value]) => ({
    key,
    label: t(`impact.partners.linkTypes.${key}`, { defaultValue: key.replaceAll('_', ' ') }),
    value,
  }))
}

function buildSupportTargetData(supports, t) {
  const projectSupports = supports.filter(support => support.projetId).length
  const activitySupports = supports.filter(support => support.activiteId).length
  return [
    projectSupports > 0 && { key: 'projects', label: t('impact.partners.charts.projects'), value: projectSupports },
    activitySupports > 0 && { key: 'activities', label: t('impact.partners.charts.activities'), value: activitySupports },
  ].filter(Boolean)
}

function enrichPresenceRows(rows, activity) {
  if (!Array.isArray(rows)) return []
  return rows.map(row => ({
    ...row,
    activiteId: row.activiteId || activity.id,
    activiteTitre: row.activiteTitre || activity.titre,
    activiteDateDebut: activity.dateDebut,
    activiteDateFin: activity.dateFin,
    activiteCommune: activity.commune,
    activiteLieu: activity.lieu,
  }))
}

function buildAttendanceSummary(presences) {
  const encodedStatuses = new Set(['PRESENT', 'ABSENT', 'EXCUSE'])
  const presentRows = presences.filter(row => row.statutPresence === 'PRESENT')
  const present = presentRows.length
  const absent = presences.filter(row => row.statutPresence === 'ABSENT').length
  const excused = presences.filter(row => row.statutPresence === 'EXCUSE').length
  const encodedTotal = presences.filter(row => encodedStatuses.has(row.statutPresence)).length
  const realParticipants = new Set(presentRows.map(row => row.membreId || row.membreEmail).filter(Boolean)).size

  return {
    present,
    absent,
    excused,
    notFilled: presences.filter(row => row.statutPresence === 'NON_RENSEIGNEE').length,
    encodedTotal,
    realParticipants,
    attendanceRate: encodedTotal > 0 ? present / encodedTotal : 0,
    hasEncoded: encodedTotal > 0,
  }
}

function buildPresenceByActivity(presences) {
  const map = new Map()
  presences.forEach(row => {
    const activityId = String(row.activiteId || '')
    if (!activityId) return
    if (!map.has(activityId)) {
      map.set(activityId, {
        activityId,
        title: row.activiteTitre || 'Activité',
        date: row.activiteDateDebut,
        registered: 0,
        present: 0,
        absent: 0,
        excused: 0,
        notFilled: 0,
        validated: 0,
      })
    }
    const summary = map.get(activityId)
    summary.registered += 1
    if (row.statutPresence === 'PRESENT') summary.present += 1
    else if (row.statutPresence === 'ABSENT') summary.absent += 1
    else if (row.statutPresence === 'EXCUSE') summary.excused += 1
    else summary.notFilled += 1
    if (row.dateValidationPresence) summary.validated += 1
    const encodedTotal = summary.present + summary.absent + summary.excused
    summary.attendanceRate = encodedTotal > 0 ? summary.present / encodedTotal : 0
    summary.closed = summary.registered > 0 && summary.validated === summary.registered
  })
  return map
}

function buildPresenceStatusData(summary, t) {
  const items = [
    ['PRESENT', summary.present],
    ['ABSENT', summary.absent],
    ['EXCUSE', summary.excused],
    ['NON_RENSEIGNEE', summary.notFilled],
  ]
  return items
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      key,
      label: t(`presence.statuses.${key}`, { defaultValue: key }),
      value,
    }))
}

function buildPresenceEvolutionData(presences) {
  const counts = presences
    .filter(row => row.statutPresence === 'PRESENT')
    .reduce((acc, row) => {
      const date = firstValidDate(row, ['activiteDateDebut', 'datePresence', 'dateInscription'])
      if (!date) return acc
      const key = date.toISOString().slice(0, 7)
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, label: key, value }))
}

function buildTopAttendanceActivitiesData(presenceByActivity) {
  return Array.from(presenceByActivity.values())
    .filter(item => item.present > 0)
    .sort((a, b) => b.present - a.present)
    .slice(0, 6)
    .map(item => ({ key: item.activityId, label: truncateLabel(item.title), value: item.present }))
}

function buildAttendanceRateByActivityData(presenceByActivity) {
  return Array.from(presenceByActivity.values())
    .filter(item => item.present + item.absent + item.excused > 0)
    .sort((a, b) => b.attendanceRate - a.attendanceRate)
    .slice(0, 6)
    .map(item => ({ key: item.activityId, label: truncateLabel(item.title), value: Math.round(item.attendanceRate * 100) }))
}

function truncateLabel(value) {
  const text = String(value || '')
  return text.length > 18 ? `${text.slice(0, 16)}…` : text
}

function buildCountData(items, field, t, translateStatus = true) {
  const counts = items.reduce((acc, item) => {
    const key = item[field] || 'UNKNOWN'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return Object.entries(counts).map(([key, value]) => ({
    key,
    label: translateStatus ? t(`statuses.${key}`, { defaultValue: key.replaceAll('_', ' ') }) : key,
    value,
  }))
}

function buildProjectStatusSummary(projects) {
  return projects.reduce((acc, project) => {
    const status = normalizeProjectStatus(project.statut)
    if (status === 'SOUMIS') acc.submittedToReferent += 1
    if (status === 'VALIDE_REFERENT') acc.validatedByReferent += 1
    if (status === 'REFUSE_REFERENT') acc.rejectedByReferent += 1
    if (status === 'APPROUVE') acc.approvedByAdmin += 1
    if (status === 'REJETE') acc.rejectedByAdmin += 1
    return acc
  }, {
    submittedToReferent: 0,
    validatedByReferent: 0,
    rejectedByReferent: 0,
    approvedByAdmin: 0,
    rejectedByAdmin: 0,
  })
}

function buildProjectStatusData(projects, t) {
  const order = ['BROUILLON', 'SOUMIS', 'VALIDE_REFERENT', 'REFUSE_REFERENT', 'APPROUVE', 'REJETE', 'EN_COURS', 'TERMINE', 'ARCHIVE']
  const counts = projects.reduce((acc, project) => {
    const key = normalizeProjectStatus(project.statut) || 'UNKNOWN'
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
      label: t(`impact.projectStatuses.${key}`, {
        defaultValue: t(`statuses.${key}`, { defaultValue: key.replaceAll('_', ' ') }),
      }),
      value,
    }))
}

function normalizeProjectStatus(status) {
  return String(status || '').trim().toUpperCase()
}

function getProjectReferentComment(project) {
  return project.commentaireReferent || project.commentaireValidationReferent || project.motifRefusReferent || ''
}

function getProjectAdminComment(project) {
  return project.commentaireAdmin || project.commentaireValidation || project.motifRejet || ''
}

function toMapPoint(item, kind, presenceSummary, t) {
  if (!hasCoordinates(item)) return null
  const latitude = Number(item.latitude)
  const longitude = Number(item.longitude)
  const location = [item.commune, item.lieu || item.adresseReunion || item.adresse].filter(Boolean).join(' · ')
  const presenceDetails = kind === 'activity' && presenceSummary
    ? `<br/>${escapeHtml(t('impact.map.registered'))}: ${presenceSummary.registered}<br/>${escapeHtml(t('impact.map.present'))}: ${presenceSummary.present}<br/>${escapeHtml(t('impact.map.attendanceRate'))}: ${Math.round((presenceSummary.attendanceRate || 0) * 100)}%`
    : ''
  return {
    kind,
    latitude,
    longitude,
    label: `<strong>${escapeHtml(item.titre || item.nom || 'BX-Connect')}</strong>${location ? `<br/>${escapeHtml(location)}` : ''}${presenceDetails}`,
  }
}

function isCompletedActivity(activity, now = new Date()) {
  const endDate = activity.dateFin ? new Date(activity.dateFin) : null
  return endDate && Number.isFinite(endDate.getTime()) && endDate < now
}

function hasCoordinates(item) {
  const latitude = Number(item.latitude)
  const longitude = Number(item.longitude)
  return item.latitude !== null
    && item.latitude !== undefined
    && item.latitude !== ''
    && item.longitude !== null
    && item.longitude !== undefined
    && item.longitude !== ''
    && Number.isFinite(latitude)
    && Number.isFinite(longitude)
}

function formatCurrency(value, language) {
  return new Intl.NumberFormat(language || 'fr-BE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function formatPercent(value, language) {
  return new Intl.NumberFormat(language || 'fr-BE', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function exportImpactPdf({ data, impact, filterSummary, generatedAt, t, language }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 14
  let cursorY = 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(t('impact.exports.reportTitle'), margin, cursorY)
  cursorY += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(t('impact.exports.period', { date: formatDateTime(generatedAt, language) }), margin, cursorY)
  cursorY += 8

  doc.setTextColor(80, 95, 120)
  doc.text(splitPdfText(doc, t('impact.exports.v1Notice'), 180), margin, cursorY)
  doc.setTextColor(0, 0, 0)
  cursorY += 14

  cursorY = addPdfTable(doc, cursorY, t('impact.exports.sections.filters'), [
    [t('impact.exports.columns.filter'), t('impact.exports.columns.value')],
    ...filterSummary.map(item => [item.label, item.value]),
  ])

  cursorY = addPdfTable(doc, cursorY, t('impact.exports.sections.summary'), [
    [t('impact.exports.columns.indicator'), t('impact.exports.columns.value')],
    ...buildKpiRows(impact, t, language),
  ])

  cursorY = addPdfTable(doc, cursorY, t('impact.exports.sections.realParticipation'), [
    [t('impact.exports.columns.indicator'), t('impact.exports.columns.value')],
    [t('impact.exports.columns.registered'), impact.presence.encodedTotal + impact.presence.notFilled],
    [t('impact.kpis.present'), impact.kpis.present],
    [t('impact.kpis.absent'), impact.kpis.absent],
    [t('impact.kpis.excused'), impact.kpis.excused],
    [t('impact.kpis.attendanceRate'), formatPercent(impact.kpis.attendanceRate, language)],
  ])

  cursorY = addPdfTable(doc, cursorY, t('impact.exports.sections.partnerImpact'), [
    [t('impact.exports.columns.indicator'), t('impact.exports.columns.value')],
    ...buildPartnerKpiRows(impact, t, language),
    [t('impact.partners.quality.withoutKnownSupport'), impact.partnerImpact.qualityItems.find(item => item.label === t('impact.partners.quality.withoutKnownSupport'))?.value ?? 0],
  ])

  cursorY = addPdfTable(doc, cursorY, t('impact.exports.sections.activitiesByStatus'), [
    [t('impact.exports.columns.status'), t('impact.exports.columns.count')],
    ...impact.activityStatusData.map(item => [item.label, item.value]),
  ])

  cursorY = addPdfTable(doc, cursorY, t('impact.exports.sections.projectsByStatus'), [
    [t('impact.exports.columns.status'), t('impact.exports.columns.count')],
    ...impact.projectStatusData.map(item => [item.label, item.value]),
  ])

  cursorY = addPdfTable(doc, cursorY, t('impact.exports.sections.supportsByStatus'), [
    [t('impact.exports.columns.status'), t('impact.exports.columns.count')],
    ...impact.supportStatusData.map(item => [item.label, item.value]),
  ])

  cursorY = addPdfTable(doc, cursorY, t('impact.exports.sections.activitiesByCommune'), [
    [t('impact.exports.columns.commune'), t('impact.exports.columns.count')],
    ...impact.activityCommuneData.map(item => [item.label, item.value]),
  ])

  cursorY = addPdfTable(doc, cursorY, t('impact.exports.sections.dataQuality'), [
    [t('impact.exports.columns.indicator'), t('impact.exports.columns.value'), t('impact.exports.columns.note')],
    ...impact.qualityItems.map(item => [item.label, item.value, item.description]),
  ])

  cursorY = addPdfTable(doc, cursorY, t('impact.exports.sections.partnerLimits'), [
    [t('impact.exports.columns.note')],
    [t('impact.exports.partnerLimits.opportunities')],
    [t('impact.exports.partnerLimits.inactive')],
    [t('impact.exports.partnerLimits.amounts')],
  ])

  addPdfTable(doc, cursorY, t('impact.exports.sections.rawVolumes'), [
    [t('impact.exports.columns.dataset'), t('impact.exports.columns.count')],
    [t('impact.exports.sheets.activities'), data.activities.length],
    [t('impact.exports.sheets.projects'), data.projects.length],
    [t('impact.exports.sheets.supports'), data.supports.length],
    [t('impact.exports.sheets.groups'), data.groups.length],
  ])

  doc.save(buildExportFileName('rapport-impact', 'pdf', generatedAt))
}

function exportImpactExcel({ data, impact, filterSummary, generatedAt, t, language }) {
  const workbook = XLSX.utils.book_new()

  appendSheet(workbook, t('impact.exports.sheets.summary'), [
    [t('impact.exports.reportTitle')],
    [t('impact.exports.period', { date: formatDateTime(generatedAt, language) })],
    [],
    [t('impact.exports.sections.filters')],
    [t('impact.exports.columns.filter'), t('impact.exports.columns.value')],
    ...filterSummary.map(item => [item.label, item.value]),
    [],
    [t('impact.exports.columns.indicator'), t('impact.exports.columns.value')],
    ...buildKpiRows(impact, t, language),
    ...buildPartnerKpiRows(impact, t, language),
  ])

  appendSheet(workbook, t('impact.exports.sheets.activities'), [
    [
      t('common.title'),
      t('users.status'),
      t('activities.form_category'),
      t('activities.form_place'),
      t('impact.exports.columns.commune'),
      t('activities.start_date'),
      t('activities.end_date'),
      t('impact.exports.columns.registrations'),
      t('impact.exports.columns.geolocated'),
    ],
    ...data.activities.map(activity => [
      activity.titre || '',
      activity.statut || '',
      activity.categorie || activity.theme || '',
      activity.lieu || activity.adresse || '',
      activity.commune || '',
      activity.dateDebut || '',
      activity.dateFin || '',
      activity.nombreInscrits ?? '',
      hasCoordinates(activity) ? t('common.yes') : t('common.no'),
    ]),
  ])

  appendSheet(workbook, t('impact.exports.sheets.projects'), [
    [
      t('common.title'),
      t('users.status'),
      t('impact.exports.columns.group'),
      t('impact.exports.columns.owner'),
      t('impact.exports.columns.budget'),
      t('impact.exports.columns.participants'),
      t('impact.exports.columns.referentComment'),
      t('impact.exports.columns.adminComment'),
      t('common.date'),
    ],
    ...data.projects.map(project => [
      project.titre || '',
      t(`impact.projectStatuses.${normalizeProjectStatus(project.statut)}`, {
        defaultValue: t(`statuses.${project.statut}`, { defaultValue: project.statut || '' }),
      }),
      project.groupeNom || '',
      [project.porteurPrenom, project.porteurNom].filter(Boolean).join(' '),
      project.budgetDemande ?? '',
      project.nombreParticipants ?? '',
      getProjectReferentComment(project),
      getProjectAdminComment(project),
      project.dateCreation || '',
    ]),
  ])

  appendSheet(workbook, t('impact.exports.sheets.supports'), [
    [
      t('impact.exports.columns.partner'),
      t('impact.exports.columns.target'),
      t('partnerSupport.amount'),
      t('users.status'),
      t('common.date'),
    ],
    ...data.supports.map(support => [
      [support.partenairePrenom, support.partenaireNom].filter(Boolean).join(' ') || support.partenaireEmail || '',
      support.projetTitre || support.activiteTitre || '',
      support.montant ?? '',
      support.statutPaiement || '',
      support.dateCreation || support.datePaiement || '',
    ]),
  ])

  appendSheet(workbook, t('impact.exports.sheets.presences'), [
    [
      t('impact.exports.columns.activity'),
      t('common.date'),
      t('impact.exports.columns.participant'),
      t('presence.table.registration'),
      t('presence.table.presence'),
    ],
    ...data.presences.map(presence => [
      presence.activiteTitre || '',
      presence.activiteDateDebut || presence.datePresence || '',
      [presence.membrePrenom, presence.membreNom].filter(Boolean).join(' ') || presence.membreEmail || '',
      presence.statutInscription || '',
      presence.statutPresence || '',
    ]),
  ])

  appendSheet(workbook, t('impact.exports.sheets.groups'), [
    [
      t('groups.title'),
      t('users.status'),
      t('groups.referent'),
      t('groups.members'),
      t('impact.exports.columns.commune'),
      t('impact.exports.columns.geolocated'),
      t('common.date'),
    ],
    ...data.groups.map(group => [
      group.nom || '',
      group.statut || '',
      [group.referentPrenom, group.referentNom].filter(Boolean).join(' '),
      group.nombreMembres ?? '',
      group.commune || '',
      hasCoordinates(group) ? t('common.yes') : t('common.no'),
      group.dateCreation || '',
    ]),
  ])

  appendSheet(workbook, t('impact.exports.sheets.partners'), buildPartnerExportRows({ data, impact, t, language }))

  appendSheet(workbook, t('impact.exports.sheets.partnerAssignments'), buildPartnerAssignmentRows(data.partnerAssignments, t))

  appendSheet(workbook, t('impact.exports.sheets.quality'), [
    [t('impact.exports.columns.indicator'), t('impact.exports.columns.value'), t('impact.exports.columns.note')],
    ...impact.qualityItems.map(item => [item.label, item.value, item.description]),
    [],
    [t('impact.exports.sections.partnerLimits')],
    [t('impact.exports.partnerLimits.opportunities')],
    [t('impact.exports.partnerLimits.inactive')],
    [t('impact.exports.partnerLimits.amounts')],
  ])

  XLSX.writeFile(workbook, buildExportFileName('rapport-impact', 'xlsx', generatedAt))
}

function addPdfTable(doc, startY, title, rows) {
  const margin = 14
  let nextY = startY
  if (nextY > 250) {
    doc.addPage()
    nextY = 18
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(title, margin, nextY)
  nextY += 3

  autoTable(doc, {
    startY: nextY,
    head: rows.length ? [rows[0]] : [],
    body: rows.slice(1),
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    margin: { left: margin, right: margin },
    theme: 'striped',
  })
  return doc.lastAutoTable.finalY + 9
}

function buildKpiRows(impact, t, language) {
  return [
    [t('impact.kpis.activeMembers'), impact.kpis.activeMembers],
    [t('impact.kpis.completedActivities'), impact.kpis.completedActivities],
    [t('impact.kpis.activeGroups'), impact.kpis.activeGroups],
    [t('impact.kpis.submittedToReferent'), impact.kpis.submittedToReferent],
    [t('impact.kpis.validatedByReferent'), impact.kpis.validatedByReferent],
    [t('impact.kpis.rejectedByReferent'), impact.kpis.rejectedByReferent],
    [t('impact.kpis.finalApprovedProjects'), impact.kpis.approvedProjects],
    [t('impact.kpis.finalRejectedProjects'), impact.kpis.rejectedProjects],
    [t('impact.kpis.activePartners'), impact.kpis.activePartners],
    [t('impact.kpis.collectedAmount'), formatCurrency(impact.kpis.collectedAmount, language)],
    [t('impact.kpis.realParticipants'), impact.kpis.realParticipants],
    [t('impact.kpis.present'), impact.kpis.present],
    [t('impact.kpis.absent'), impact.kpis.absent],
    [t('impact.kpis.excused'), impact.kpis.excused],
    [t('impact.kpis.attendanceRate'), formatPercent(impact.kpis.attendanceRate, language)],
  ]
}

function buildPartnerKpiRows(impact, t, language) {
  return [
    [t('impact.partners.kpis.active'), impact.partnerImpact.kpis.activePartners],
    [t('impact.partners.kpis.inactive'), impact.partnerImpact.kpis.inactivePartners],
    [t('impact.partners.kpis.withReferent'), impact.partnerImpact.kpis.withReferent],
    [t('impact.partners.kpis.withoutReferent'), impact.partnerImpact.kpis.withoutReferent],
    [t('impact.partners.kpis.withGroup'), impact.partnerImpact.kpis.withGroup],
    [t('impact.partners.kpis.withoutGroup'), impact.partnerImpact.kpis.withoutGroup],
    [t('impact.partners.kpis.supportedAmount'), formatCurrency(impact.partnerImpact.kpis.supportedAmount, language)],
    [t('impact.partners.kpis.supportedProjects'), impact.partnerImpact.kpis.supportedProjects],
    [t('impact.partners.kpis.supportedActivities'), impact.partnerImpact.kpis.supportedActivities],
    [t('impact.partners.kpis.publishedOpportunities'), impact.partnerImpact.kpis.publishedOpportunities],
  ]
}

function buildPartnerExportRows({ data, t, language }) {
  const partnerRecords = buildPartnerExportRecords(data)
  return [
    [
      t('impact.exports.columns.partner'),
      t('users.status'),
      t('impact.exports.columns.linkedReferents'),
      t('impact.exports.columns.linkedGroups'),
      t('impact.exports.columns.linkTypes'),
      t('impact.exports.columns.knownSupportedAmount'),
      t('impact.exports.columns.knownSupportedProjects'),
      t('impact.exports.columns.knownSupportedActivities'),
    ],
    ...partnerRecords.map(record => [
      record.name,
      record.active ? t('users.active') : t('users.inactive'),
      record.referents.join(', '),
      record.groups.join(', '),
      record.linkTypes.map(type => t(`impact.partners.linkTypes.${type}`, { defaultValue: type })).join(', '),
      formatCurrency(record.amount, language),
      record.projects.size,
      record.activities.size,
    ]),
  ]
}

function buildPartnerAssignmentRows(assignments, t) {
  const referents = Array.isArray(assignments?.referents) ? assignments.referents : []
  const groupes = Array.isArray(assignments?.groupes) ? assignments.groupes : []
  return [
    [
      t('impact.exports.columns.assignmentType'),
      t('impact.exports.columns.partner'),
      t('impact.exports.columns.referent'),
      t('impact.exports.columns.group'),
      t('impact.exports.columns.linkType'),
      t('users.status'),
      t('impact.exports.columns.startDate'),
      t('impact.exports.columns.endDate'),
      t('partnerAssignments.comment'),
    ],
    ...referents.map(link => [
      t('impact.exports.assignmentTypes.referent'),
      link.nomOrganisation || '',
      formatReferentName(link),
      '',
      '',
      link.statut || '',
      link.dateDebut || '',
      link.dateFin || '',
      link.commentaire || '',
    ]),
    ...groupes.map(link => [
      t('impact.exports.assignmentTypes.group'),
      link.nomOrganisation || '',
      formatReferentName(link),
      link.groupeNom || '',
      t(`impact.partners.linkTypes.${link.typeLien || 'AUTRE'}`, { defaultValue: link.typeLien || '' }),
      link.statut || '',
      link.dateDebut || '',
      link.dateFin || '',
      link.commentaire || '',
    ]),
  ]
}

function buildPartnerExportRecords(data) {
  const records = new Map()
  const assignments = data.partnerAssignments || { referents: [], groupes: [] }
  const referents = Array.isArray(assignments.referents) ? assignments.referents : []
  const groupes = Array.isArray(assignments.groupes) ? assignments.groupes : []

  data.publicPartners.forEach(partner => {
    const profileId = String(partner.id || partner.partenaireProfilId || '')
    if (!profileId) return
    records.set(profileId, createPartnerExportRecord({
      profileId,
      name: partner.nomOrganisation,
      userId: partner.partenaireUserId || partner.userId,
      active: true,
    }))
  })

  ;[...referents, ...groupes].forEach(link => {
    const profileId = getPartnerProfileId(link)
    if (!profileId) return
    const record = records.get(profileId) || createPartnerExportRecord({
      profileId,
      name: link.nomOrganisation,
      userId: link.partenaireUserId,
      active: false,
    })
    record.name = record.name || link.nomOrganisation || ''
    record.userId = record.userId || link.partenaireUserId || null
    record.active = record.active || link.statut === 'ACTIF'
    records.set(profileId, record)
  })

  referents.forEach(link => {
    const record = records.get(getPartnerProfileId(link))
    if (!record) return
    const referent = formatReferentName(link)
    if (referent) record.referents.add(referent)
  })

  groupes.forEach(link => {
    const record = records.get(getPartnerProfileId(link))
    if (!record) return
    if (link.groupeNom) record.groups.add(link.groupeNom)
    if (link.typeLien) record.linkTypes.add(link.typeLien)
  })

  data.supports.forEach(support => {
    if (support.statutPaiement !== 'PAYE' || !support.partenaireId) return
    const record = Array.from(records.values()).find(item => String(item.userId) === String(support.partenaireId))
    if (!record) return
    record.amount += Number(support.montant || 0)
    if (support.projetId) record.projects.add(String(support.projetId))
    if (support.activiteId) record.activities.add(String(support.activiteId))
  })

  return Array.from(records.values()).map(record => ({
    ...record,
    referents: Array.from(record.referents),
    groups: Array.from(record.groups),
    linkTypes: Array.from(record.linkTypes),
  }))
}

function createPartnerExportRecord({ profileId, name, userId, active }) {
  return {
    profileId,
    name: name || '',
    userId: userId || null,
    active: Boolean(active),
    referents: new Set(),
    groups: new Set(),
    linkTypes: new Set(),
    amount: 0,
    projects: new Set(),
    activities: new Set(),
  }
}

function formatReferentName(link) {
  return [link.referentPrenom, link.referentNom].filter(Boolean).join(' ') || link.referentEmail || ''
}

function appendSheet(workbook, name, rows) {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(workbook, sheet, sanitizeSheetName(name))
}

function sanitizeSheetName(name) {
  return String(name || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)
}

function buildExportFileName(base, extension, date) {
  const stamp = date.toISOString().slice(0, 10)
  return `${base}-${stamp}.${extension}`
}

function formatDateTime(value, language) {
  return new Intl.DateTimeFormat(language || 'fr-BE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}

function splitPdfText(doc, text, width) {
  return doc.splitTextToSize(text, width)
}
