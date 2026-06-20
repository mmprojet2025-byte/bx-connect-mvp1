import { Link } from 'react-router-dom'
import AppIcon from '../ui/AppIcons'

export default function ActivityFeed({
  title = 'Activité récente',
  subtitle = 'Ce qui a changé récemment.',
  items = [],
  emptyLabel = 'Aucune activité récente pour le moment.',
  language = 'fr-BE',
  accent = 'blue',
  limit = 5,
}) {
  const visibleItems = normalizeItems(items).slice(0, limit)
  const groupedItems = groupItemsByDay(visibleItems, language)
  const accentClass = getAccentClass(accent)

  return (
    <section className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-lg shadow-slate-900/5">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
          <AppIcon name="Activity" className={`h-5 w-5 ${accentClass}`} />
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
          <AppIcon name="CheckCircle" className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
          <p className="text-sm font-black text-slate-700">{emptyLabel}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedItems.map(group => (
            <div key={group.label}>
              <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">{group.label}</p>
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/60">
                {group.items.map(item => <ActivityItem key={item.key} item={item} language={language} accent={accent} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ActivityItem({ item, language, accent }) {
  const content = (
    <>
      <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${getIconTone(accent)}`}>
        <AppIcon name={item.icon || 'Bell'} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-slate-950">{item.title}</span>
        {item.description && <span className="mt-0.5 block truncate text-sm text-slate-500">{item.description}</span>}
      </span>
      <span className="shrink-0 text-xs font-bold text-slate-400">{formatTime(item.date, language)}</span>
    </>
  )

  if (item.to) {
    return (
      <Link to={item.to} className="flex items-start gap-3 px-4 py-3 transition hover:bg-white">
        {content}
      </Link>
    )
  }

  return <div className="flex items-start gap-3 px-4 py-3">{content}</div>
}

function normalizeItems(items) {
  return items
    .filter(Boolean)
    .map((item, index) => ({
      ...item,
      key: item.key || `${item.title}-${index}`,
      date: parseDate(item.date),
    }))
    .sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return b.date.getTime() - a.date.getTime()
    })
}

function groupItemsByDay(items, language) {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const groups = []
  items.forEach(item => {
    const label = getDayLabel(item.date, today, yesterday, language)
    let group = groups.find(candidate => candidate.label === label)
    if (!group) {
      group = { label, items: [] }
      groups.push(group)
    }
    group.items.push(item)
  })
  return groups
}

function getDayLabel(date, today, yesterday, language) {
  if (!date) return 'Plus tôt'
  if (isSameDay(date, today)) return 'Aujourd’hui'
  if (isSameDay(date, yesterday)) return 'Hier'
  return date.toLocaleDateString(language || 'fr-BE', { day: '2-digit', month: 'short' })
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatTime(date, language) {
  if (!date) return ''
  return date.toLocaleTimeString(language || 'fr-BE', { hour: '2-digit', minute: '2-digit' })
}

function getAccentClass(accent) {
  return {
    teal: 'text-teal-700',
    orange: 'text-orange-600',
    indigo: 'text-indigo-700',
    amber: 'text-amber-700',
  }[accent] || 'text-blue-700'
}

function getIconTone(accent) {
  return {
    teal: 'bg-teal-50 text-teal-700',
    orange: 'bg-orange-50 text-orange-600',
    indigo: 'bg-indigo-50 text-indigo-700',
    amber: 'bg-amber-50 text-amber-700',
  }[accent] || 'bg-blue-50 text-blue-700'
}
