import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'
import { userFriendlyError } from '../utils/userFriendlyError'

export default function ActivityPublicationDialog({ activity, onClose, onPublished, fixedAudience = false, audienceSummary, forbiddenMessage }) {
  const { t } = useTranslation()
  const dialog = useRef(null)
  const [visibility, setVisibility] = useState(fixedAudience ? activity.visibilite : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])

  const publish = async event => {
    event.preventDefault()
    if (!(fixedAudience ? ['PUBLIC', 'PRIVE_GROUPE', 'MEMBRES'] : ['PUBLIC', 'MEMBRES']).includes(visibility) || saving || (fixedAudience && activity.gratuite === false)) return
    setSaving(true)
    setError('')
    try {
      const response = await api.patch(`/activites/${activity.id}/statut`, null, {
        params: { statut: 'PUBLIEE', visibilite: visibility },
      })
      onPublished(response.data)
    } catch (err) {
      setError(err.response?.status === 403 && forbiddenMessage ? forbiddenMessage : userFriendlyError(err, t('activities.publication.error')))
      setSaving(false)
    }
  }

  return (
    <dialog ref={dialog} aria-labelledby="publication-title"
      onCancel={event => { event.preventDefault(); if (!saving) onClose() }}
      className="m-auto w-full max-w-lg rounded-2xl p-6 shadow-xl backdrop:bg-slate-950/40">
      <form onSubmit={publish}>
        <h2 id="publication-title" className="text-xl font-bold text-blue-900">{t('activities.publication.title')}</h2>
        <p className="mt-2 text-slate-600">{activity.titre}</p>
        {fixedAudience ? <p className="my-5 text-slate-700">{audienceSummary}</p> : <fieldset disabled={saving} className="my-5 space-y-3">
          <legend className="mb-2 font-semibold">{t('activities.publication.choose')}</legend>
          {['PUBLIC', 'MEMBRES'].map(value => (
            <label key={value} htmlFor={`visibility-${value}`}
              aria-label={t(`activities.publication.${value === 'PUBLIC' ? 'everyone' : 'authenticated'}`)}
              className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-3">
              <input id={`visibility-${value}`} type="radio" name="visibility" value={value} required checked={visibility === value}
                onChange={() => setVisibility(value)} />
              <span><span className="block font-semibold">{t(`activities.publication.${value === 'PUBLIC' ? 'everyone' : 'authenticated'}`)}</span>
                <span className="block text-sm text-slate-600">{t(`activities.publication.${value === 'PUBLIC' ? 'everyoneHelp' : 'authenticatedHelp'}`)}</span>
              </span>
            </label>
          ))}
        </fieldset>}
        {fixedAudience && activity.gratuite === false && <p role="alert" className="my-4 text-red-700">{t('adminActivity.paidPublication')}</p>}
        {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border px-4 py-2">{t('common.cancel')}</button>
          <button type="submit" disabled={!visibility || saving || (fixedAudience && activity.gratuite === false)} className="rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white disabled:bg-gray-300">
            {saving ? t('common.saving') : t('activities.publication.publish')}
          </button>
        </div>
      </form>
    </dialog>
  )
}
