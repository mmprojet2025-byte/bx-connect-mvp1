export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="mb-8 overflow-hidden rounded-[2rem] border border-blue-100/70 bg-white px-5 py-6 shadow-lg shadow-blue-950/5 md:px-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          {eyebrow && (
            <p className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-600">{eyebrow}</p>
          )}
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">{title}</h1>
          {description && (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500 md:text-base">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  )
}
