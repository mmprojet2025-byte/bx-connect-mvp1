import AppIcon from '../../../components/ui/AppIcons';
import EmptyState from '../../../components/ui/EmptyState';
import SectionCard from '../../../components/ui/SectionCard';
import { SUPPORT_STATUS_STYLES, supportStatusLabel } from '../../../utils/supportStatus';
import { formatEuros, safeText } from '../partnerSpace.helpers';
import SimpleRecentHistory from './SimpleRecentHistory';

export default function PartnerDashboardOverview({ mesSoutiens, projetsOuverts, activitesOuvertes, recentItems, language, t }) {
  const recentSupports = [...mesSoutiens]
    .sort((a, b) => new Date(b.dateCreation || b.datePaiement || 0) - new Date(a.dateCreation || a.datePaiement || 0))
    .slice(0, 3);
  const availableItems = [
    ...projetsOuverts.slice(0, 2).map(projet => ({
      key: `projet-${projet.id}`,
      icon: 'Rocket',
      title: safeText(projet.titre, t('projects.titleFallback', { defaultValue: 'Projet' })),
      description: projet.budgetDemande ? `${t('partnerSpace.budget')}: ${formatEuros(projet.budgetDemande)}` : t('partnerSpace.openProjects'),
    })),
    ...activitesOuvertes.slice(0, 2).map(activite => ({
      key: `activite-${activite.id}`,
      icon: 'Calendar',
      title: safeText(activite.titre, t('activities.titleFallback', { defaultValue: 'Activité' })),
      description: activite.dateDebut ? formatDate(activite.dateDebut, language) : t('partnerSpace.openActivities'),
    })),
  ].slice(0, 4);

  return (
    <div className="space-y-5">
      <SectionCard
        title={t('partnerSpace.dashboardSummaryTitle', { defaultValue: 'À retenir' })}
        subtitle={t('partnerSpace.dashboardSummarySubtitle', { defaultValue: 'Une vue courte de ce que vous pouvez soutenir et de ce que vous suivez déjà.' })}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryTile icon="Wallet" title={t('partnerSpace.mySupports')} value={mesSoutiens.length} />
          <SummaryTile icon="Rocket" title={t('partnerSpace.openProjects')} value={projetsOuverts.length} />
          <SummaryTile icon="Calendar" title={t('partnerSpace.openActivities')} value={activitesOuvertes.length} />
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard
          title={t('partnerSpace.recentSupports', { defaultValue: 'Derniers soutiens' })}
          subtitle={t('partnerSpace.recentSupportsHint', { defaultValue: 'Les trois derniers soutiens suivis.' })}
        >
          {recentSupports.length === 0 ? (
            <EmptyState
              icon="Wallet"
              title={t('partnerSpace.noDeclarations')}
              description={t('partnerSpace.noSupports')}
            />
          ) : (
            <div className="grid gap-3">
              {recentSupports.map(soutien => (
                <CompactSupportRow key={soutien.id} soutien={soutien} language={language} t={t} />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={t('partnerSpace.availableToSupport', { defaultValue: 'Disponibles au soutien' })}
          subtitle={t('partnerSpace.availableToSupportHint', { defaultValue: 'Quelques projets et activités ouverts.' })}
        >
          {availableItems.length === 0 ? (
            <EmptyState
              icon="Rocket"
              title={t('partnerSpace.noOpenSupports', { defaultValue: 'Aucun soutien disponible' })}
              description={t('partnerSpace.noOpenSupportsDesc', { defaultValue: 'Les projets et activités ouverts apparaîtront ici.' })}
            />
          ) : (
            <div className="grid gap-3">
              {availableItems.map(item => (
                <div key={item.key} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <AppIcon name={item.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-950">{item.title}</span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">{item.description}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SimpleRecentHistory items={recentItems} language={language} t={t} />
    </div>
  );
}

function SummaryTile({ icon, title, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <AppIcon name={icon} className="mb-3 h-5 w-5 text-orange-600" />
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-bold text-slate-500">{title}</p>
    </div>
  );
}

function CompactSupportRow({ soutien, language, t }) {
  const target = safeText(soutien.projetTitre || soutien.activiteTitre, t('partnerSpace.supportFallback', { defaultValue: 'Soutien financier' }));

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
        <AppIcon name="Wallet" className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-slate-950">{target}</span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
          {formatEuros(soutien.montant)} · {formatDate(soutien.dateCreation || soutien.datePaiement, language)}
        </span>
      </span>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${SUPPORT_STATUS_STYLES[soutien.statutPaiement] || 'bg-slate-100 text-slate-700'}`}>
        {supportStatusLabel(soutien.statutPaiement, t)}
      </span>
    </div>
  );
}

function formatDate(value, language) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(language || 'fr-BE');
}
