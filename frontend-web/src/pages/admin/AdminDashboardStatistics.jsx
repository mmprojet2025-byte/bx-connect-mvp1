import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { projectStatusCounts, topActivityRegistrations } from './adminDashboardStatistics'

export default function AdminDashboardStatistics({ projects, activities, loading }) {
  const { t } = useTranslation()
  const projectRows = projectStatusCounts(projects)?.map(row => ({
    ...row, label: t(`statuses.${row.status}`, { defaultValue: t('admin.dashboardStatistics.unknownStatus') }),
  }))
  const activityRows = topActivityRegistrations(activities)?.map(row => ({
    ...row, label: row.title || t('admin.dashboardStatistics.activityFallback', { id: row.id }),
  }))
  return (
    <section aria-labelledby="admin-statistics-title" className="mb-4">
      <h2 id="admin-statistics-title" className="mb-3 text-base font-black text-slate-950">{t('admin.dashboardStatistics.title')}</h2>
      <div className="grid min-w-0 gap-3 xl:grid-cols-2">
        <StatisticsChart id="projects" title={t('admin.dashboardStatistics.projects')} rows={projectRows} loading={loading}
          empty={t('admin.dashboardStatistics.noProjects')} unit={t('admin.dashboardStatistics.projectCount')} t={t} />
        <StatisticsChart id="activities" title={t('admin.dashboardStatistics.activities')} rows={activityRows} loading={loading}
          empty={t('admin.dashboardStatistics.noActivities')} unit={t('admin.dashboardStatistics.registrationCount')}
          description={t('admin.dashboardStatistics.registrationHint')} t={t} />
      </div>
    </section>
  )
}

function StatisticsChart({ id, title, rows, loading, empty, unit, description, t }) {
  return (
    <section aria-labelledby={`chart-${id}-title`} data-testid={`statistics-${id}`} className="min-w-0 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <h3 id={`chart-${id}-title`} className="text-sm font-bold text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      {loading ? <p role="status" className="py-8 text-sm text-slate-500">{t('admin.loading')}</p>
        : rows == null ? <p className="py-8 text-sm text-amber-800">{t('admin.dashboardReliability.unavailable')}</p>
          : rows.length === 0 ? <p className="py-8 text-sm text-slate-500">{empty}</p>
            : <>
              <div className="mt-3 w-full min-w-0" style={{ height: Math.max(200, rows.length * 36 + 32) }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 28, bottom: 0, left: 0 }} accessibilityLayer>
                    <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} domain={[0, max => Math.max(1, max)]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" width={130} interval={0} tick={<ChartLabel />} />
                    <Tooltip formatter={value => [value, unit]} />
                    <Bar dataKey="count" name={unit} fill="#2563eb" radius={[0, 3, 3, 0]} barSize={16} isAnimationActive={false}>
                      <LabelList dataKey="count" position="right" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="sr-only">
                <caption>{title}</caption>
                <thead><tr><th scope="col">{title}</th><th scope="col">{unit}</th></tr></thead>
                <tbody>{rows.map((row, index) => <tr key={row.status || row.id || index}><th scope="row">{row.label}</th><td>{row.count}</td></tr>)}</tbody>
              </table>
            </>}
    </section>
  )
}

function ChartLabel({ x, y, payload }) {
  const label = String(payload.value)
  const words = label.split(/\s+/)
  const lines = ['']
  for (const word of words) {
    const last = lines.length - 1
    if (lines[last] && `${lines[last]} ${word}`.length > 22) lines.push(word)
    else lines[last] = `${lines[last]} ${word}`.trim()
  }
  const visible = lines.slice(0, 2).map(line => line.length > 22 ? `${line.slice(0, 21)}…` : line)
  if (lines.length > 2) visible[1] = `${visible[1].slice(0, 21)}…`
  return <text x={x - 4} y={y} textAnchor="end" fill="#475569" fontSize={10}>
    <title>{label}</title>
    {visible.map((line, index) => <tspan key={index} x={x - 4} dy={index === 0 ? (visible.length > 1 ? -3 : 4) : 12}>{line}</tspan>)}
  </text>
}
