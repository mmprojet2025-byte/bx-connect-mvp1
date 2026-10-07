import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'
import LocationPicker from './location/LocationPicker'
import { userFriendlyError } from '../utils/userFriendlyError'

// Shared by existing group management screens; PUT preserves secondary information.
export default function GroupInformationForm({ groupe, onSaved }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fields = [
    ['nom', 'admin.groupName'], ['categorie', 'activities.form_category'],
    ['theme', 'activities.form_theme'], ['commune', 'admin.commune'],
    ['capaciteMax', 'groupWorkflow.capacity'], ['adresseReunion', 'admin.meetingAddress'],
    ['description', 'activities.form_description'], ['objectif', 'admin.objective'],
  ]
  const save = async event => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { data } = await api.put(`/groupes/${groupe.id}`, { ...form, capaciteMax: Number(form.capaciteMax), latitude: form.latitude === '' ? null : form.latitude, longitude: form.longitude === '' ? null : form.longitude })
      onSaved(data)
      setEditing(false)
    } catch (err) { setError(userFriendlyError(err, t('groupWorkflow.error'))) }
    finally { setSaving(false) }
  }
  if (groupe.statut === 'ARCHIVE') return null
  if (!editing) return <button type="button" className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-800" onClick={() => { setForm(Object.fromEntries([...fields.map(([key]) => key), 'latitude', 'longitude'].map(key => [key, groupe[key] ?? (key === 'capaciteMax' ? 0 : null)])));  setEditing(true) }}>{t('common.edit')}</button>
  return <form onSubmit={save} className="my-3 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
    {fields.map(([key, label]) => <label key={key} className="block text-sm font-semibold text-slate-700">
      {t(label)}{key === 'nom' ? ' *' : ''}
      {['description', 'objectif'].includes(key)
        ? <textarea className="mt-1 w-full rounded-lg border border-slate-300 p-2" value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />
        : <input className="mt-1 w-full rounded-lg border border-slate-300 p-2" required={key === 'nom'} type={key === 'capaciteMax' ? 'number' : 'text'} min={key === 'capaciteMax' ? 0 : undefined} maxLength={key === 'capaciteMax' ? undefined : key === 'adresseReunion' ? 255 : 100} value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />}
    </label>)}
    <details className="sm:col-span-2">
      <summary className="cursor-pointer text-sm font-semibold">{t('admin.advancedLocation')}</summary>
      <LocationPicker address={form.adresseReunion} commune={form.commune} latitude={form.latitude} longitude={form.longitude} onCoordinatesChange={(latitude, longitude) => setForm(current => ({ ...current, latitude, longitude }))} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{['latitude', 'longitude'].map(key => <label key={key} className="text-sm font-semibold">{t(`admin.${key}`)}<input type="number" step="any" value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label>)}</div>
    </details>
    {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
    <button disabled={saving} className="rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white disabled:opacity-50">{t(saving ? 'common.saving' : 'common.saveChanges')}</button>
    <button type="button" disabled={saving} onClick={() => setEditing(false)}>{t('common.cancel')}</button>
  </form>
}
