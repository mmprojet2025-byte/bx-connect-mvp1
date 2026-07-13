import AppIcon from '../../../components/ui/AppIcons';
import { PARTNER_TYPES } from '../partnerSpace.constants';

export default function PartnerProfileModal({
  profileForm,
  setProfileForm,
  savingProfile,
  onSubmit,
  onClose,
  t,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={onSubmit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">{t('partnerInstitution.editTitle')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('partnerInstitution.editDescription')}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <AppIcon name="XCircle" className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ProfileInput label={t('partnerInstitution.organization')} value={profileForm.nomOrganisation} onChange={value => setProfileForm({ ...profileForm, nomOrganisation: value })} required />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">{t('partnerInstitution.type')}</span>
            <select value={profileForm.typePartenaire} onChange={event => setProfileForm({ ...profileForm, typePartenaire: event.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              {PARTNER_TYPES.map(type => <option key={type} value={type}>{t(`partnerInstitution.types.${type}`)}</option>)}
            </select>
          </label>
          <ProfileInput label={t('partnerInstitution.contactPerson')} value={profileForm.personneContact} onChange={value => setProfileForm({ ...profileForm, personneContact: value })} />
          <ProfileInput label={t('partnerInstitution.contactEmail')} value={profileForm.emailContact} onChange={value => setProfileForm({ ...profileForm, emailContact: value })} type="email" />
          <ProfileInput label={t('partnerInstitution.phone')} value={profileForm.telephone} onChange={value => setProfileForm({ ...profileForm, telephone: value })} />
          <ProfileInput label={t('partnerInstitution.website')} value={profileForm.siteWeb} onChange={value => setProfileForm({ ...profileForm, siteWeb: value })} type="url" />
          <div className="md:col-span-2">
            <ProfileInput label={t('partnerInstitution.logoUrl')} value={profileForm.logoUrl} onChange={value => setProfileForm({ ...profileForm, logoUrl: value })} type="url" />
          </div>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-slate-700">{t('partnerInstitution.description')}</span>
            <textarea rows={3} maxLength={500} value={profileForm.description} onChange={event => setProfileForm({ ...profileForm, description: event.target.value })} className="w-full resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={savingProfile} className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-50">
            {savingProfile ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProfileInput({ label, value, onChange, type = 'text', required = false, ...inputProps }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        {...inputProps}
      />
    </label>
  );
}
