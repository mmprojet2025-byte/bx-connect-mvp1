import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'
import { assignmentLocked } from '../pages/admin/activityForm'

export default function ActivityFormFields({ form, setForm, groups, original, referent = false, ready = true, onUploading }) {
  const { t } = useTranslation()
  const [multiDay, setMultiDay] = useState(Boolean(form.dateFin && form.dateDebut.slice(0, 10) !== form.dateFin.slice(0, 10)))
  const [imageError, setImageError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState('')
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))
  // During input, a time can exist before its date (e.g. T12:30).
  // Split the local value rather than mistaking that time for a date.
  const date = form.dateDebut.split('T')[0]
  const endDate = form.dateFin.split('T')[0]
  const startTime = form.dateDebut.split('T')[1] || ''
  const endTime = form.dateFin.split('T')[1] || ''
  const locked = assignmentLocked(original)
  const priceLocked = original && (original.tarifModifiable === false || original.statut !== 'BROUILLON' || original.nombreInscrits > 0)
  const upload = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    setImageError('')
    if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setImageError(t('activityEditor.imageInvalid')); return
    }
    setPreview(URL.createObjectURL(file))
    setUploading(true); onUploading(true)
    try {
      const data = new FormData(); data.append('file', file); data.append('type', 'activite')
      // Override the shared JSON default; the browser supplies the multipart boundary.
      const response = await api.post('/upload', data, { headers: { 'Content-Type': undefined } })
      setForm(current => ({ ...current, imageStorageKey: response.data.storageKey, imageUrl: response.data.url }))
    } catch {
      setPreview(''); setImageError(t(form.imageUrl ? 'activityEditor.imageErrorPreserved' : 'activityEditor.imageError'))
    } finally { setUploading(false); onUploading(false) }
  }
  const field = (key, label, options = {}) => <Field key={key} label={t(label)} value={form[key] ?? ''} onChange={value => update(key, value)} {...options} />
  return <div className="md:col-span-2 min-w-0 space-y-5">
    <Section title={t('activityEditor.information')}>
      {field('titre', 'activities.form_title', { required: true, maxLength: 150 })}
      <label className="md:col-span-2 block text-sm font-semibold">{t('activities.form_description')} *
        <textarea required rows={4} value={form.description} onChange={event => update('description', event.target.value)} className="mt-1 w-full rounded-xl border p-3" />
      </label>
      {!(referent && original && !original.groupeId) && <label className="block text-sm font-semibold">{t('adminActivity.groupLabel')}
        <select value={form.groupeId} disabled={!ready || locked || (referent && (Boolean(original) || groups.length === 1))}
          onChange={event => setForm(current => ({ ...current, groupeId: event.target.value, nature: event.target.value ? 'GROUPE' : 'GENERALE', visibilite: 'PUBLIC' }))}
          className="mt-1 w-full rounded-xl border p-3">
          <option value="">{t(referent ? 'adminActivity.chooseGroup' : 'activityEditor.general')}</option>
          {original?.groupeId && !groups.some(group => group.id === original.groupeId) && <option value={original.groupeId}>{original.groupeNom}</option>}
          {groups.map(group => <option key={group.id} value={group.id}>{group.nom}</option>)}
        </select>
      </label>}
      {original?.visibilite === 'MEMBRES' && <p>{t('adminActivity.legacyAudience')}</p>}
      {form.groupeId && <label className="block text-sm font-semibold">{t('activityEditor.audience')}
        <select value={form.visibilite} disabled={locked} onChange={event => update('visibilite', event.target.value)} className="mt-1 w-full rounded-xl border p-3">
          <option value="PUBLIC">{t('activityEditor.everyone')}</option>
          <option value="PRIVE_GROUPE">{t('activityEditor.groupMembers')}</option>
          {form.visibilite === 'MEMBRES' && <option value="MEMBRES">{t('adminActivity.legacyAudience')}</option>}
        </select>
      </label>}
    </Section>
    <Section title={t('activityEditor.datePlace')}>
      <Field label={t('activityEditor.date')} type="date" required value={date} onChange={value => setForm(current => ({ ...current, dateDebut: `${value}T${startTime}`, dateFin: `${multiDay ? endDate : value}T${endTime}` }))} />
      <Field label={t('activityEditor.startTime')} type="time" required value={startTime.slice(0, 5)} onChange={value => update('dateDebut', `${date}T${value}`)} />
      <Field label={t('activityEditor.endTime')} type="time" required value={endTime.slice(0, 5)} onChange={value => update('dateFin', `${multiDay ? endDate : date}T${value}`)} />
      {field('lieu', 'activities.form_place', { required: true, maxLength: 200 })}
      <label className="md:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={multiDay} onChange={event => { setMultiDay(event.target.checked); if (!event.target.checked) update('dateFin', `${date}T${endTime}`) }} />{t('activityEditor.multiDay')}</label>
      {multiDay && <Field label={t('activityEditor.endDate')} type="date" required value={endDate} onChange={value => update('dateFin', `${value}T${endTime}`)} />}
    </Section>
    <Section title={t('activityEditor.registrations')}>
      {field('capaciteMax', 'admin.maxCapacity', { type: 'number', min: 1, step: 1, required: true })}
      {field('dateLimiteInscription', 'activityEditor.deadline', { type: 'datetime-local' })}
      <p className="md:col-span-2 text-sm text-slate-500">{t('activityEditor.deadlineHelp')}</p>
    </Section>
    <Section title={t('activityEditor.participation')}>
      <fieldset disabled={priceLocked} className="flex gap-5"><legend className="sr-only">{t('activityEditor.participation')}</legend>
        {[true, false].map(free => <label key={String(free)} className="flex items-center gap-2"><input type="radio" name="activity-pricing" checked={form.gratuite === free} onChange={() => setForm(current => ({ ...current, gratuite: free, prix: free ? '' : current.prix }))} />{t(free ? 'activities.free' : 'activityEditor.paid')}</label>)}
      </fieldset>
      {!form.gratuite && field('prix', 'activityEditor.price', { type: 'number', min: '0.01', step: '0.01', required: true, disabled: priceLocked })}
      {priceLocked && <p className="md:col-span-2 text-sm text-slate-500">{t('activityEditor.priceLocked')}</p>}
    </Section>
    <Section title={t('activityEditor.image')}>
      <label className="text-sm font-semibold">{t('activityEditor.chooseImage')}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={upload} className="mt-2 block w-full min-w-0 text-sm" /></label>
      {(preview || form.imageUrl) && <img src={preview || form.imageUrl} alt={t('activityEditor.preview')} className="h-40 w-full rounded-xl object-cover" />}
      {uploading && <p role="status">{t('common.loading')}</p>}
      {imageError && <p role="alert" className="text-red-700">{imageError}</p>}
    </Section>
    <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">{t('activityEditor.additional')}</summary>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {field('adresse', 'admin.address', { maxLength: 255 })}{field('commune', 'admin.commune', { maxLength: 100 })}
        {field('categorie', 'activities.form_category', { maxLength: 100 })}{field('theme', 'activities.form_theme', { maxLength: 100 })}
      </div>
    </details>
  </div>
}
function Section({ title, children }) {
  return <section className="rounded-xl border border-slate-100 p-4"><h3 className="mb-3 font-bold text-blue-900">{title}</h3><div className="grid min-w-0 gap-3 md:grid-cols-2">{children}</div></section>
}
function Field({ label, value, onChange, required, ...props }) {
  return <label className="block min-w-0 text-sm font-semibold">{label}{required && !label.includes('*') ? ' *' : ''}<input {...props} required={required} value={value} onChange={event => onChange(event.target.value)} className="mt-1 w-full min-w-0 rounded-xl border p-3 disabled:bg-slate-100" /></label>
}
