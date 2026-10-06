import { useTranslation } from 'react-i18next'
import ImageUpload from '../ImageUpload'

export default function ProjectDetailsFields({ form, setForm, onUploadingChange }) {
  const { t } = useTranslation()
  const update = (field, value) => setForm(current => ({ ...current, [field]: value }))
  const dateInput = (field, label, limits) => <label className="block text-sm font-semibold text-slate-700">
    {t(`projectDetails.${label}`)}
    <input type="date" value={form[field] || ''} {...limits}
      onInput={event => update(field, event.currentTarget.value)} onChange={event => update(field, event.currentTarget.value)}
      className="mt-1 block w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2" />
  </label>
  return <div className="col-span-full space-y-4 rounded-xl border border-slate-200 p-4">
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className="mb-3 font-bold text-slate-900">{t('projectDetails.planning')}</legend>
      {dateInput('dateExecution', 'execution', { min: form.dateLimiteParticipation || undefined })}
      {dateInput('dateLimiteParticipation', 'deadline', { max: form.dateExecution || undefined })}
      <label className="block text-sm font-semibold text-slate-700">{t('projectDetails.capacity')}
        <input type="number" min="1" max="2147483647" step="1" value={form.capacite ?? ''}
          onChange={event => update('capacite', event.target.value)}
          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
      </label>
      <p className="self-center text-xs text-slate-500">{t('projectDetails.help')}</p>
    </fieldset>
    <fieldset>
      <legend className="mb-2 text-sm font-bold text-slate-700">{t('projectDetails.cover')}</legend>
      <ImageUpload type="projet" currentUrl={form.imageUrl} label={t('projectDetails.chooseCover')}
        onUploadingChange={onUploadingChange} onUploadSuccess={url => update('imageUrl', url)} />
    </fieldset>
  </div>
}
