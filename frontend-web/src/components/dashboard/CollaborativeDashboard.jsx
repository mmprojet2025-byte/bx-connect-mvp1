import { Link } from 'react-router-dom'
import Navbar from '../Navbar'
import Footer from '../Footer'
import AppIcon from '../ui/AppIcons'

export function CollaborativeDashboardLayout({ title, subtitle, emoji = '🏠', actions, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7fb]">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-[1440px] px-3 py-4 lg:px-5 lg:py-5">
          <section className="min-w-0">
            <header className="collab-reveal mb-4 rounded-[1.5rem] border border-white bg-white p-5 shadow-lg shadow-blue-950/5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
                    <IconMarker icon={emoji} className="h-4 w-4" />
                    BX-Connect
                  </p>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
                  {subtitle && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>}
                </div>
                {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
              </div>
            </header>

            <div className="collab-dashboard-space">
              {children}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export function WorkspaceSection({ eyebrow, title, emoji = '🏠', action, children, className = '' }) {
  return (
    <section className={`collab-reveal rounded-[1.5rem] border border-white bg-white p-4 shadow-lg shadow-blue-950/5 ${className}`}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && <p className="text-xs font-black uppercase tracking-wide text-blue-700">{eyebrow}</p>}
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
            <IconMarker icon={emoji} className="h-5 w-5 text-blue-700" />
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function WorkspaceCard({ emoji = '🏠', title, description, to, value, highlight = false, children }) {
  const content = (
    <article className={`h-full rounded-2xl border p-3.5 transition hover:-translate-y-0.5 hover:shadow-md ${
      highlight ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50 hover:bg-white'
    }`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${highlight ? 'bg-white text-amber-700' : 'bg-white text-blue-700 shadow-sm'}`}>
          <IconMarker icon={emoji} className="h-5 w-5" />
        </span>
        {value !== undefined && <span className={`text-xl font-black ${highlight ? 'text-amber-800' : 'text-slate-950'}`}>{value}</span>}
      </div>
      <h3 className="font-black text-slate-950">{title}</h3>
      {description && <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>}
      {children}
    </article>
  )

  return to ? <Link to={to}>{content}</Link> : content
}

export function QuickWorkspaceAction({ to, onClick, emoji = '⚡', label, description }) {
  const className = "inline-flex min-h-12 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-left text-sm font-black text-blue-800 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
  const content = (
    <>
      <IconMarker icon={emoji} className="h-5 w-5" />
      <span>
        <span className="block">{label}</span>
        {description && <span className="block text-xs font-semibold text-blue-700/70">{description}</span>}
      </span>
    </>
  )

  if (to) return <Link to={to} className={className}>{content}</Link>
  return <button type="button" onClick={onClick} className={className}>{content}</button>
}

export function WorkspaceEmpty({ emoji = '📭', title, description, actionTo, actionLabel }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-blue-700 shadow-sm">
        <IconMarker icon={emoji} className="h-6 w-6" />
      </div>
      <p className="mt-2 text-sm font-black text-slate-700">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm leading-5 text-slate-500">{description}</p>}
      {actionTo && actionLabel && (
        <Link to={actionTo} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
          <AppIcon name="ArrowRight" className="h-4 w-4" />
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

export function MiniList({ items, empty, renderItem }) {
  if (!items || items.length === 0) return empty
  return <div className="grid gap-3">{items.map(renderItem)}</div>
}

function IconMarker({ icon, className }) {
  const iconMap = {
    '🏠': 'Home',
    '💬': 'MessageCircle',
    '👥': 'Users',
    '📅': 'Calendar',
    '🚀': 'Rocket',
    '🔔': 'Bell',
    '👤': 'User',
    '🤝': 'Handshake',
    '🛡️': 'Shield',
    '⚠️': 'TriangleAlert',
    '✅': 'CheckCircle',
    '📋': 'ClipboardList',
    '📊': 'BarChart3',
    '📁': 'Folder',
    '🔐': 'Lock',
    '📭': 'Bell',
    '⚡': 'Rocket',
    '👋': 'User',
  }
  return <AppIcon name={iconMap[icon] || icon || 'Folder'} className={className} />
}
