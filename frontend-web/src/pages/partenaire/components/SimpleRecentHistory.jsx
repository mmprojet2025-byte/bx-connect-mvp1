import AppIcon from '../../../components/ui/AppIcons';
import EmptyState from '../../../components/ui/EmptyState';
import SectionCard from '../../../components/ui/SectionCard';
import { safeText } from '../partnerSpace.helpers';

export default function SimpleRecentHistory({ items, language, t }) {
  const recentItems = [...items]
    .filter(item => item.date)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 5);

  return (
    <SectionCard
      title={t('partnerSpace.recentHistoryTitle', { defaultValue: 'Historique récent' })}
      subtitle={t('partnerSpace.recentHistorySubtitle', { defaultValue: 'Derniers soutiens, projets et activités disponibles.' })}
    >
      {recentItems.length === 0 ? (
        <EmptyState
          icon="Clock"
          title={t('partnerSpace.noRecentHistory', { defaultValue: 'Aucun historique récent' })}
          description={t('partnerSpace.noRecentHistoryDesc', { defaultValue: 'Les derniers mouvements apparaîtront ici dès qu’un soutien, projet ou activité sera disponible.' })}
        />
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 bg-white">
          {recentItems.map(item => (
            <div key={item.key} className="flex items-center gap-3 px-4 py-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <AppIcon name={item.icon || 'Clock'} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-950">{safeText(item.title, t('partnerSpace.historyFallback', { defaultValue: 'Mouvement partenaire' }))}</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{safeText(item.description, t('partnerSpace.historyDescriptionFallback', { defaultValue: 'Mise à jour récente' }))}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-slate-400">
                {formatDate(item.date, language)}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function formatDate(value, language) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(language || 'fr-BE');
}
