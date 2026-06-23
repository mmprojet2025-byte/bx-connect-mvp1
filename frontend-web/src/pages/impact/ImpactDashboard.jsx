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

export default function ImpactDashboard() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState({
    users: [],
    activities: [],
    groups: [],
    projects: [],
    supports: [],
    publicPartners: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [partialError, setPartialError] = useState('')
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
    ]

    try {
      const results = await Promise.allSettled(requests.map(([, request]) => request))
      const nextData = { users: [], activities: [], groups: [], projects: [], supports: [], publicPartners: [] }
      let fulfilled = 0

      results.forEach((result, index) => {
        const key = requests[index][0]
        if (result.status === 'fulfilled') {
          fulfilled += 1
          nextData[key] = Array.isArray(result.value.data) ? result.value.data : []
        }
      })

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

  const impact = useMemo(() => buildImpactModel(data, t), [data, t])

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

  const hasAnyData = Object.values(data).some(items => items.length > 0)
  const generatedAt = useMemo(() => new Date(), [])

  return (
    <CollaborativeDashboardLayout
      emoji="BarChart3"
      title={t('impact.title')}
      subtitle={t('impact.subtitle')}
      actions={hasAnyData && !loading ? (
        <>
          <button
            type="button"
            onClick={() => exportImpactPdf({ data, impact, generatedAt: new Date(), t, language: i18n.language })}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-600"
          >
            <AppIcon name="FileText" className="h-4 w-4" />
            {t('impact.exports.pdf')}
          </button>
          <button
            type="button"
            onClick={() => exportImpactExcel({ data, impact, generatedAt: new Date(), t, language: i18n.language })}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-4 py-2 text-sm font-black text-blue-800 transition hover:bg-blue-50"
          >
            <AppIcon name="Archive" className="h-4 w-4" />
            {t('impact.exports.excel')}
          </button>
        </>
      ) : null}
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
          <CompactKpiRow
            accent="blue"
            className="mb-4 lg:grid-cols-3 xl:grid-cols-6"
            items={[
              { icon: 'Users', label: t('impact.kpis.activeMembers'), value: impact.kpis.activeMembers, tone: 'blue' },
              { icon: 'Calendar', label: t('impact.kpis.completedActivities'), value: impact.kpis.completedActivities, tone: 'teal' },
              { icon: 'Building', label: t('impact.kpis.activeGroups'), value: impact.kpis.activeGroups, tone: 'indigo' },
              { icon: 'Rocket', label: t('impact.kpis.approvedProjects'), value: impact.kpis.approvedProjects, tone: 'violet' },
              { icon: 'Handshake', label: t('impact.kpis.activePartners'), value: impact.kpis.activePartners, tone: 'green' },
              { icon: 'DollarSign', label: t('impact.kpis.collectedAmount'), value: formatCurrency(impact.kpis.collectedAmount, i18n.language), tone: 'amber' },
            ]}
          />

          <section className="mb-4 rounded-xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-950/5">
            <SectionHeader
              icon="BarChart"
              title={t('impact.charts.title')}
              description={t('impact.charts.description')}
            />
            <div className="grid gap-4 xl:grid-cols-4">
              <ChartPanel title={t('impact.charts.activitiesByStatus')} empty={!impact.activityStatusData.length} emptyLabel={t('impact.charts.noData')}>
                <StatusPieChart data={impact.activityStatusData} />
              </ChartPanel>
              <ChartPanel title={t('impact.charts.projectsByStatus')} empty={!impact.projectStatusData.length} emptyLabel={t('impact.charts.noData')}>
                <StatusBarChart data={impact.projectStatusData} />
              </ChartPanel>
              <ChartPanel title={t('impact.charts.supportsByStatus')} empty={!impact.supportStatusData.length} emptyLabel={t('impact.charts.noData')}>
                <StatusPieChart data={impact.supportStatusData} />
              </ChartPanel>
              <ChartPanel title={t('impact.charts.activitiesByCommune')} empty={!impact.activityCommuneData.length} emptyLabel={t('impact.charts.noData')}>
                <StatusBarChart data={impact.activityCommuneData} />
              </ChartPanel>
            </div>
          </section>

          <section className="mb-4 grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
            <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-950/5">
              <SectionHeader
                icon="MapPin"
                title={t('impact.map.title')}
                description={t('impact.map.description')}
              />
              {impact.mapPoints.length > 0 ? (
                <>
                  <div
                    ref={mapContainerRef}
                    className="h-[360px] overflow-hidden rounded-lg border border-slate-100"
                    aria-label={t('impact.map.aria')}
                  />
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                    <LegendDot color="bg-blue-700" label={t('impact.map.activities')} />
                    <LegendDot color="bg-teal-700" label={t('impact.map.groups')} />
                  </div>
                </>
              ) : (
                <EmptyState
                  icon="MapPin"
                  title={t('impact.map.emptyTitle')}
                  description={t('impact.map.emptyDescription')}
                />
              )}
            </article>

            <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-950/5">
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
          </section>

          <section className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">{t('impact.limits.eyebrow')}</p>
                <h2 className="mt-1 text-lg font-black text-blue-950">{t('impact.limits.title')}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-900/70">{t('impact.limits.description')}</p>
                <p className="mt-2 text-xs font-bold text-blue-900/60">
                  {t('impact.exports.generatedAt', { date: formatDateTime(generatedAt, i18n.language) })}
                </p>
              </div>
              <AppIcon name="Lightbulb" className="h-8 w-8 shrink-0 text-blue-700" />
            </div>
          </section>
        </>
      )}
    </CollaborativeDashboardLayout>
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

function StatusBarChart({ data }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} height={52} />
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

function buildImpactModel(data, t) {
  const now = new Date()
  const users = data.users
  const activities = data.activities
  const groups = data.groups
  const projects = data.projects
  const supports = data.supports
  const publicPartners = data.publicPartners

  const activeMembers = users.filter(user => user.role === 'MEMBRE' && user.actif !== false).length
  const completedActivities = activities.filter(activity => {
    const endDate = activity.dateFin ? new Date(activity.dateFin) : null
    return endDate && Number.isFinite(endDate.getTime()) && endDate < now
  }).length
  const activeGroups = groups.filter(group => group.statut === 'VALIDE' || group.actif === true).length
  const approvedProjects = projects.filter(project => project.statut === 'APPROUVE').length
  const activePartners = users.filter(user => user.role === 'PARTENAIRE' && user.actif !== false).length || publicPartners.length
  const collectedAmount = supports
    .filter(support => support.statutPaiement === 'PAYE')
    .reduce((sum, support) => sum + Number(support.montant || 0), 0)

  return {
    kpis: {
      activeMembers,
      completedActivities,
      activeGroups,
      approvedProjects,
      activePartners,
      collectedAmount,
    },
    activityStatusData: buildCountData(activities, 'statut', t),
    projectStatusData: buildCountData(projects, 'statut', t),
    supportStatusData: buildCountData(supports, 'statutPaiement', t),
    activityCommuneData: buildCountData(activities.filter(item => item.commune), 'commune', t, false),
    mapPoints: [
      ...activities.map(activity => toMapPoint(activity, 'activity')),
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
    ],
  }
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

function toMapPoint(item, kind) {
  if (!hasCoordinates(item)) return null
  const latitude = Number(item.latitude)
  const longitude = Number(item.longitude)
  const location = [item.commune, item.lieu || item.adresseReunion || item.adresse].filter(Boolean).join(' · ')
  return {
    kind,
    latitude,
    longitude,
    label: `<strong>${escapeHtml(item.titre || item.nom || 'BX-Connect')}</strong>${location ? `<br/>${escapeHtml(location)}` : ''}`,
  }
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function exportImpactPdf({ data, impact, generatedAt, t, language }) {
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

  cursorY = addPdfTable(doc, cursorY, t('impact.exports.sections.summary'), [
    [t('impact.exports.columns.indicator'), t('impact.exports.columns.value')],
    ...buildKpiRows(impact, t, language),
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

  addPdfTable(doc, cursorY, t('impact.exports.sections.rawVolumes'), [
    [t('impact.exports.columns.dataset'), t('impact.exports.columns.count')],
    [t('impact.exports.sheets.activities'), data.activities.length],
    [t('impact.exports.sheets.projects'), data.projects.length],
    [t('impact.exports.sheets.supports'), data.supports.length],
    [t('impact.exports.sheets.groups'), data.groups.length],
  ])

  doc.save(buildExportFileName('rapport-impact', 'pdf', generatedAt))
}

function exportImpactExcel({ data, impact, generatedAt, t, language }) {
  const workbook = XLSX.utils.book_new()

  appendSheet(workbook, t('impact.exports.sheets.summary'), [
    [t('impact.exports.reportTitle')],
    [t('impact.exports.period', { date: formatDateTime(generatedAt, language) })],
    [],
    [t('impact.exports.columns.indicator'), t('impact.exports.columns.value')],
    ...buildKpiRows(impact, t, language),
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
      t('common.date'),
    ],
    ...data.projects.map(project => [
      project.titre || '',
      project.statut || '',
      project.groupeNom || '',
      [project.porteurPrenom, project.porteurNom].filter(Boolean).join(' '),
      project.budgetDemande ?? '',
      project.nombreParticipants ?? '',
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

  appendSheet(workbook, t('impact.exports.sheets.quality'), [
    [t('impact.exports.columns.indicator'), t('impact.exports.columns.value'), t('impact.exports.columns.note')],
    ...impact.qualityItems.map(item => [item.label, item.value, item.description]),
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
    [t('impact.kpis.approvedProjects'), impact.kpis.approvedProjects],
    [t('impact.kpis.activePartners'), impact.kpis.activePartners],
    [t('impact.kpis.collectedAmount'), formatCurrency(impact.kpis.collectedAmount, language)],
  ]
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
