import AppIcon from '../ui/AppIcons';

export default function CompactKpiRow({ items = [], accent = 'blue', className = '' }) {
  const visibleItems = items.filter(Boolean);
  if (visibleItems.length === 0) return null;

  return (
    <section className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {visibleItems.map(item => (
        <CompactKpi key={item.label} item={item} accent={accent} />
      ))}
    </section>
  );
}

function CompactKpi({ item, accent }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-black uppercase tracking-wide text-slate-400">{item.label}</p>
          <p className="mt-1 truncate text-xl font-black text-slate-950">{item.value}</p>
        </div>
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass(accent, item.tone)}`}>
          <AppIcon name={item.icon || 'BarChart3'} className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

function toneClass(accent, tone) {
  const selected = tone || accent;
  return {
    blue: 'bg-blue-50 text-blue-700',
    teal: 'bg-teal-50 text-teal-700',
    orange: 'bg-orange-50 text-orange-600',
    indigo: 'bg-indigo-50 text-indigo-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
    red: 'bg-red-50 text-red-700',
  }[selected] || 'bg-slate-100 text-slate-700';
}
