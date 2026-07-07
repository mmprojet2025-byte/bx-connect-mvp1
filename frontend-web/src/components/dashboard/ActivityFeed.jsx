import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AppIcon from '../ui/AppIcons'

export default function ActivityFeed({
  title,
  subtitle,
  items = [],
  emptyLabel,
  language = 'fr-BE',
  accent = 'blue',
  limit = 5,
  actionTo,
  actionLabel,
}) {
  const { t } = useTranslation()
  const visibleItems = normalizeItems(items).slice(0, limit)
  const groupedItems = groupItemsByDay(visibleItems, language, t)
  const accentClass = getAccentClass(accent)
  const feedTitle = title || t('activityFeed.title')
  const feedSubtitle = subtitle || t('activityFeed.subtitle')
  const feedEmptyLabel = emptyLabel || t('activityFeed.empty')

  return (
    <section className="collab-reveal flex h-[320px] flex-col rounded-xl border border-slate-100 bg-white p-3 shadow-lg shadow-slate-900/5">
      <div className="mb-2 flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
            <AppIcon name="Activity" className={`h-4 w-4 ${accentClass}`} />
            {feedTitle}
          </h2>
          {feedSubtitle && <p className="mt-0.5 text-xs text-slate-500">{feedSubtitle}</p>}
        </div>
        {actionTo && actionLabel && (
          <Link to={actionTo} className="text-xs font-bold text-blue-700 transition hover:text-blue-900 hover:underline">
            {actionLabel}
          </Link>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center">
          <AppIcon name="CheckCircle" className="mx-auto mb-1.5 h-7 w-7 text-emerald-500" />
          <p className="text-sm font-black text-slate-700">{feedEmptyLabel}</p>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          <div className="activity-feed-scroll h-full space-y-2 overflow-y-auto rounded-lg pr-1">
            {groupedItems.map(group => (
              <div key={group.label}>
                <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">{group.label}</p>
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-slate-50/50">
                  {group.items.map((item, index) => (
                    <ActivityItem
                      key={item.key}
                      item={item}
                      language={language}
                      accent={accent}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-lg bg-gradient-to-t from-white via-white/80 to-transparent" />
        </div>
      )}
    </section>
  )
}

function ActivityItem({ item, language, accent, index = 0 }) {
  const style = { animationDelay: `${Math.min(index, 6) * 35}ms` }
  const content = (
    <>
      <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${getIconTone(accent)}`}>
        <AppIcon name={item.icon || 'Bell'} className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black leading-4 text-slate-950">{item.title}</span>
        {item.description && <span className="mt-0.5 block truncate text-xs leading-4 text-slate-500">{item.description}</span>}
      </span>
      <span className="ml-2 shrink-0 pt-0.5 text-right text-[11px] font-bold text-slate-400">{formatTime(item.date, language)}</span>
    </>
  )

  if (item.to) {
    return (
      <Link to={item.to} style={style} className="activity-feed-item flex items-start gap-2 px-2.5 py-1.5 transition duration-200 hover:bg-white">
        {content}
      </Link>
    )
  }

  return <div style={style} className="activity-feed-item flex items-start gap-2 px-2.5 py-1.5">{content}</div>
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

function groupItemsByDay(items, language, t) {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const groups = []
  items.forEach(item => {
    const label = getDayLabel(item.date, today, yesterday, language, t)
    let group = groups.find(candidate => candidate.label === label)
    if (!group) {
      group = { label, items: [] }
      groups.push(group)
    }
    group.items.push(item)
  })
  return groups
}

function getDayLabel(date, today, yesterday, language, t) {
  if (!date) return t('activityFeed.days.earlier')
  if (isSameDay(date, today)) return t('activityFeed.days.today')
  if (isSameDay(date, yesterday)) return t('activityFeed.days.yesterday')
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
