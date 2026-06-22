import { Link } from 'react-router-dom'
import AppIcon from './AppIcons'

export default function QuickActionCard({ to, title, description, tone = 'blue', icon = 'Folder' }) {
  const styles = {
    blue: 'border-blue-100 bg-blue-50/80 text-blue-800',
    teal: 'border-teal-100 bg-teal-50/80 text-teal-800',
    amber: 'border-orange-100 bg-orange-50/80 text-orange-800',
    violet: 'border-violet-100 bg-violet-50/80 text-violet-800',
  }[tone] || 'border-slate-100 bg-slate-50 text-slate-800'

  return (
    <Link
      to={to}
      className={`group rounded-xl border p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10 ${styles}`}
    >
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white/90 shadow-sm">
        <AppIcon name={icon} className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-sm font-black">{title}</h3>
      {description && <p className="mt-1 text-xs leading-relaxed opacity-75">{description}</p>}
    </Link>
  )
}
