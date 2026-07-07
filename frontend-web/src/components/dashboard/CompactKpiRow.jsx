import { Link } from 'react-router-dom';
import AppIcon from '../ui/AppIcons';

export default function CompactKpiRow({ items = [], accent = 'blue', className = '' }) {
  const visibleItems = items.filter(Boolean);
  if (visibleItems.length === 0) return null;
  const desktopColumns = visibleItems.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';

  return (
    <section className={`grid gap-2 sm:grid-cols-2 ${desktopColumns} ${className}`}>
      {visibleItems.map(item => (
        <CompactKpi key={item.label} item={item} accent={accent} />
      ))}
    </section>
  );
}

function CompactKpi({ item, accent }) {
  const tone = item.tone || accent;
  const className = `rounded-lg border px-3.5 py-2.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none ${cardToneClass(tone)}`;
  const content = (
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-wide text-slate-500">{item.label}</p>
          <p className="mt-0.5 truncate text-2xl font-black text-slate-950">{item.value}</p>
        </div>
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClass(accent, item.tone)}`}>
          <AppIcon name={item.icon || 'BarChart3'} className="h-4 w-4" />
        </span>
      </div>
  );

  if (item.to) {
    return <Link to={item.to} className={`${className} block cursor-pointer`}>{content}</Link>;
  }

  return <div className={className}>{content}</div>;
}

function cardToneClass(tone) {
  return {
    blue: 'border-blue-100 bg-gradient-to-br from-white to-blue-50/70 hover:border-blue-200',
    teal: 'border-teal-100 bg-gradient-to-br from-white to-teal-50/70 hover:border-teal-200',
    cyan: 'border-cyan-100 bg-gradient-to-br from-white to-cyan-50/70 hover:border-cyan-200',
    orange: 'border-orange-100 bg-gradient-to-br from-white to-orange-50/70 hover:border-orange-200',
    indigo: 'border-indigo-100 bg-gradient-to-br from-white to-indigo-50/70 hover:border-indigo-200',
    amber: 'border-amber-100 bg-gradient-to-br from-white to-amber-50/70 hover:border-amber-200',
    green: 'border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 hover:border-emerald-200',
    violet: 'border-violet-100 bg-gradient-to-br from-white to-violet-50/70 hover:border-violet-200',
    red: 'border-red-100 bg-gradient-to-br from-white to-red-50/70 hover:border-red-200',
  }[tone] || 'border-slate-100 bg-white hover:border-blue-100';
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
    cyan: 'bg-cyan-50 text-cyan-700',
    red: 'bg-red-50 text-red-700',
  }[selected] || 'bg-slate-100 text-slate-700';
}
