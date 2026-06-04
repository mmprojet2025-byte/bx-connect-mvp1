import { Link } from 'react-router-dom'
import AppIcon from './AppIcons'

export default function QuickActionCard({ to, title, description, tone = 'blue', icon = 'Folder' }) {
  const styles = {
    blue: 'border-blue-100 bg-blue-50/70 text-blue-800',
    teal: 'border-teal-100 bg-teal-50/70 text-teal-800',
    amber: 'border-amber-100 bg-amber-50/70 text-amber-800',
    violet: 'border-violet-100 bg-violet-50/70 text-violet-800',
  }[tone] || 'border-slate-100 bg-slate-50 text-slate-800'

  return (
    <Link
      to={to}
      className={`group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${styles}`}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80">
        <AppIcon name={icon} className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-sm font-bold">{title}</h3>
      {description && <p className="mt-1 text-xs leading-relaxed opacity-75">{description}</p>}
    </Link>
  )
}
