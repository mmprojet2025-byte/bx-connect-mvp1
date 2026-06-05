export default function SectionCard({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-lg shadow-slate-900/5 ${className}`}>
      {(title || subtitle || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-lg font-black text-slate-950">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
