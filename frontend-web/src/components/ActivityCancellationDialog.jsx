import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
export default function ActivityCancellationDialog({ onClose, onConfirm }) {
  const { t } = useTranslation()
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close() }, [])
  return <dialog ref={ref} aria-labelledby="cancel-activity-title" onCancel={event => { event.preventDefault(); if (!busy) onClose() }} className="m-auto w-full max-w-lg rounded-2xl p-6 backdrop:bg-slate-950/40">
    <h2 id="cancel-activity-title" className="text-xl font-bold">{t('activityEditor.cancelTitle')}</h2>
    <p className="my-4">{t('activityEditor.cancelHelp')}</p>
    <div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border px-4 py-2">{t('activityEditor.back')}</button>
      <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm() } finally { setBusy(false); onClose() } }} className="rounded-xl bg-red-700 px-4 py-2 text-white">{t('activities.publication.cancelActivity')}</button></div>
  </dialog>
}
