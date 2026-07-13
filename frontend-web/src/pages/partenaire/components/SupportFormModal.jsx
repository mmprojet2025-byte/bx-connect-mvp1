import AppIcon from '../../../components/ui/AppIcons';

export default function SupportFormModal({
  soutienForm,
  setSoutienForm,
  projetsOuverts,
  activitesOuvertes,
  submittingSupport,
  onSubmit,
  onClose,
  t,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-blue-900">
            <AppIcon name="Wallet" className="h-5 w-5 text-orange-600" />
            {t('partnerSpace.declareSupport')}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label={t('common.close')}>
            <AppIcon name="XCircle" className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('partnerSpace.supportTarget')}</label>
            <div className="flex gap-3">
              {['projet', 'activite'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSoutienForm({ ...soutienForm, type })}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                    soutienForm.type === type
                      ? 'border-orange-600 bg-orange-50 text-orange-600'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <AppIcon name={type === 'projet' ? 'Rocket' : 'Folder'} className="h-4 w-4" />
                    {type === 'projet' ? t('partnerSupport.project') : t('partnerSupport.activity')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sélection cible */}
          {soutienForm.type === 'projet' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('partnerSupport.project')} *</label>
              <select
                required
                value={soutienForm.projetId || ''}
                onChange={e => setSoutienForm({ ...soutienForm, projetId: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">{t('partnerSpace.selectProject')}</option>
                {projetsOuverts.map(p => <option key={p.id} value={p.id}>{p.titre}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('partnerSupport.activity')} *</label>
              <select
                required
                value={soutienForm.activiteId || ''}
                onChange={e => setSoutienForm({ ...soutienForm, activiteId: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">{t('partnerSpace.selectActivity')}</option>
                {activitesOuvertes.map(a => <option key={a.id} value={a.id}>{a.titre}</option>)}
              </select>
            </div>
          )}

          {/* Montant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('partnerSpace.amountEuros')} *</label>
            <input
              required type="number" min="1" step="0.01"
              value={soutienForm.montant}
              onChange={e => setSoutienForm({ ...soutienForm, montant: e.target.value })}
              placeholder={t('partnerSpace.amountPlaceholder')}
              className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('partnerSpace.optionalMessage')}</label>
            <textarea
              value={soutienForm.message}
              onChange={e => setSoutienForm({ ...soutienForm, message: e.target.value })}
              rows={3}
              placeholder={t('partnerSpace.messagePlaceholder')}
              className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submittingSupport}
              className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingSupport ? t('common.saving') : t('partnerSpace.submit')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
