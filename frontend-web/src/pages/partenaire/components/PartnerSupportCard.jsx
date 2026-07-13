import AppIcon from '../../../components/ui/AppIcons';
import { SUPPORT_STATUS_STYLES, supportStatusLabel } from '../../../utils/supportStatus';
import { formatEuros, safeText } from '../partnerSpace.helpers';

export default function PartnerSupportCard({ soutien, language, focused, processingKey, onEdit, onCancel, t }) {
  const target = safeText(soutien.projetTitre || soutien.activiteTitre, t('partnerSpace.supportFallback', { defaultValue: 'Soutien financier' }))
  const targetType = soutien.projetTitre ? t('partnerSupport.project') : soutien.activiteTitre ? t('partnerSupport.activity') : t('partnerSpace.supportTargetFallback', { defaultValue: 'Soutien' })
  const editable = soutien.statutPaiement === 'EN_ATTENTE'

  return (
    <article className={`rounded-xl border bg-white p-4 shadow-sm ${focused ? 'border-orange-300 ring-2 ring-orange-100' : 'border-slate-100'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-orange-600">
            {targetType}
          </p>
          <h3 className="mt-1 truncate font-black text-slate-950">{target}</h3>
          <p className="mt-1 text-sm font-black text-orange-600">{formatEuros(soutien.montant)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${SUPPORT_STATUS_STYLES[soutien.statutPaiement] || 'bg-slate-100 text-slate-700'}`}>
          {supportStatusLabel(soutien.statutPaiement, t)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
        {soutien.dateCreation && (
          <InlineIconLabel icon="Calendar">{formatDate(soutien.dateCreation, language)}</InlineIconLabel>
        )}
        {soutien.reponseAdmin && (
          <InlineIconLabel icon="Shield">{t('partnerSpace.adminReplyAvailable', { defaultValue: 'Réponse admin disponible' })}</InlineIconLabel>
        )}
      </div>

      {editable && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onEdit}
            disabled={processingKey === `edit-${soutien.id}` || processingKey === `cancel-${soutien.id}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-bold text-orange-700 transition hover:bg-orange-50 disabled:opacity-50"
          >
            <AppIcon name="Edit" className="h-4 w-4" />
            {t('common.edit', { defaultValue: 'Modifier' })}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={processingKey === `cancel-${soutien.id}` || processingKey === `edit-${soutien.id}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            <AppIcon name="XCircle" className="h-4 w-4" />
            {processingKey === `cancel-${soutien.id}`
              ? t('common.saving', { defaultValue: 'Enregistrement...' })
              : t('common.cancel', { defaultValue: 'Annuler' })}
          </button>
        </div>
      )}
    </article>
  );
}

function InlineIconLabel({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <AppIcon name={icon} className="h-3.5 w-3.5 shrink-0 text-orange-500" />
      <span>{children}</span>
    </span>
  );
}

function formatDate(value, language) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(language || 'fr-BE');
}
