import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import { createProjectReceipt } from './projectReceipt'

export default function ProjectPayments({ projectId = null }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(projectId == null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [receiptError, setReceiptError] = useState(false)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await api.get(projectId == null ? '/projets-paiements/mes-factures' : `/projets-paiements/projets/${projectId}`)
      setRows(res.data)
    } catch { setError(true) } finally { setLoading(false) }
  }, [projectId])
  useEffect(() => { if (open) load() }, [open, load])
  const download = async id => {
    setReceiptError(false); setBusy(true)
    try {
      const { data } = await api.get(`/projets-paiements/${id}/recu`)
      createProjectReceipt(data, t, i18n.language).save(data.numeroRecu + '.pdf')
    } catch { setReceiptError(true) } finally { setBusy(false) }
  }
  const resume = async project => {
    setReceiptError(false); setBusy(true)
    try {
      const { data } = await api.post(`/projets-paiements/projets/${project}/checkout`)
      if (!data.checkoutUrl) { await load(); return }
      const url = new URL(data.checkoutUrl)
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Invalid checkout URL')
      window.location.assign(url.href)
    } catch { setReceiptError(true) } finally { setBusy(false) }
  }
  return <section className="my-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
    {projectId != null && <button type="button" className="font-semibold text-blue-700" onClick={() => setOpen(value => !value)}>{t('projectPayment.transactions')}</button>}
    {open && <>
      <button type="button" onClick={load} disabled={loading} className="text-sm font-semibold text-blue-700">{t('common.refresh', { defaultValue: t('common.retry') })}</button>
      {loading ? <p role="status">{t('common.loading')}</p> : error ? <p role="alert">{t('projectPayment.unavailable')}</p> : rows.length === 0 ? <p>{t('projectPayment.empty')}</p> :
        <div className="space-y-3">{rows.map(p => <article key={p.id} id={`recu-${p.id}`} className="rounded-lg border border-slate-100 p-3 text-sm">
          <p className="font-semibold">{p.titreProjet}</p>
          {projectId != null && <p>{p.participant}</p>}
          <p>{Number(p.montant).toFixed(2)} {p.devise} · {t(`statuses.${p.statut}`, { defaultValue: p.statut })}</p>
          <p>{new Date(p.datePaiement || p.dateCreation).toLocaleString(i18n.language)}</p>
          {p.statut === 'PAYE' && p.numeroRecu
            ? <button type="button" disabled={busy} className="mt-2 text-blue-700 underline" onClick={() => download(p.id)}>{t('projectPayment.download')} — {p.numeroRecu}</button>
            : p.statut === 'EN_ATTENTE' && <><p className="text-amber-700">{t('projectPayment.pending')}</p>
              {projectId == null && <button type="button" disabled={busy} className="mt-2 text-blue-700 underline" onClick={() => resume(p.projetId)}>{t('projectPayment.resume')}</button>}</>}
        </article>)}</div>}
      {receiptError && <p role="alert">{t('projectPayment.error')}</p>}
    </>}
  </section>
}
