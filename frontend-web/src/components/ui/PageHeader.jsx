export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="mb-8 rounded-3xl border border-white/70 bg-white/80 px-5 py-6 shadow-sm backdrop-blur md:px-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          {eyebrow && (
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">{eyebrow}</p>
          )}
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{title}</h1>
          {description && (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  )
}
