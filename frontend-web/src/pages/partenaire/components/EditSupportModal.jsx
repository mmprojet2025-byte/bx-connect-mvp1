import AppIcon from '../../../components/ui/AppIcons';

export default function EditSupportModal({
  editingSupport,
  editSupportForm,
  setEditSupportForm,
  supportActionLoading,
  onSubmit,
  onClose,
  t,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-orange-600">
              {t('partnerSpace.editSupportEyebrow', { defaultValue: 'Soutien en attente' })}
            </p>
            <h2 className="mt-1 text-lg font-bold text-blue-900">
              {t('partnerSpace.editSupportTitle', { defaultValue: 'Modifier la proposition' })}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {editingSupport.projetTitre || editingSupport.activiteTitre || t('partnerSpace.supportFallback')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label={t('common.close')}
          >
            <AppIcon name="XCircle" className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              {t('partnerSpace.lockedTarget', { defaultValue: 'Cible non modifiable' })}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              {editingSupport.projetTitre
                ? t('partnerSupport.project')
                : t('partnerSupport.activity')}
              {' · '}
              {editingSupport.projetTitre || editingSupport.activiteTitre || t('partnerSpace.supportFallback')}
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">{t('partnerSpace.amountEuros')} *</span>
            <input
              required
              type="number"
              min="1"
              step="0.01"
              value={editSupportForm.montant}
              onChange={event => setEditSupportForm({ ...editSupportForm, montant: event.target.value })}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">{t('partnerSpace.optionalMessage')}</span>
            <textarea
              value={editSupportForm.message}
              onChange={event => setEditSupportForm({ ...editSupportForm, message: event.target.value })}
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={supportActionLoading === `edit-${editingSupport.id}`}
              className="flex-1 rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
            >
              {supportActionLoading === `edit-${editingSupport.id}`
                ? t('common.saving')
                : t('common.save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
