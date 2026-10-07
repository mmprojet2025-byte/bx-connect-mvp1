import { Link } from 'react-router-dom'
import usePaymentPolling from '../../hooks/usePaymentPolling'
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
  const [verifiedUrls, setVerifiedUrls] = useState({})
  const [recoveryError, setRecoveryError] = useState(false)
  const load = useCallback(async ({ silent = false, signal } = {}) => {
    if (!silent) setLoading(true)
    setError(false)
    try {
      const res = await api.get(projectId == null ? '/projets-paiements/mes-factures' : `/projets-paiements/projets/${projectId}`, { signal })
      if (!signal?.aborted) setRows(res.data)
    } catch { if (!signal?.aborted) setError(true) } finally {
      if (!silent && !signal?.aborted) setLoading(false)
    }
  }, [projectId])
  useEffect(() => {
    const controller = new AbortController()
    if (open) load({ signal: controller.signal })
    return () => controller.abort()
  }, [open, load])
  const awaitingConfirmation = rows.some(payment => payment.statut === 'EN_ATTENTE')
  const refreshPending = useCallback(signal => load({ silent: true, signal }), [load])
  usePaymentPolling(open && awaitingConfirmation, refreshPending)
  const download = async id => {
    setReceiptError(false); setBusy(true)
    try {
      const { data } = await api.get(`/projets-paiements/${id}/recu`)
      createProjectReceipt(data, t, i18n.language).save(data.numeroRecu + '.pdf')
    } catch { setReceiptError(true) } finally { setBusy(false) }
  }
  const verify = async (id, resume = false) => {
    setRecoveryError(false); setBusy(true)
    setVerifiedUrls(current => ({ ...current, [id]: null }))
    try {
      const { data } = await api.post(`/projets-paiements/${id}/verifier`)
      setRows(current => current.map(p => p.id === id ? data : p))
      setVerifiedUrls(current => ({ ...current, [id]: data.checkoutUrl }))
      if (resume && data.statut === 'EN_ATTENTE' && data.checkoutUrl) {
        const url = new URL(data.checkoutUrl)
        if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Invalid checkout URL')
        window.location.assign(url.href)
      }
    } catch { setRecoveryError(true) } finally { setBusy(false) }
  }
  return <section className="my-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
    {projectId != null && <button type="button" className="font-semibold text-blue-700" onClick={() => setOpen(value => !value)}>{t('projectPayment.transactions')}</button>}
    {open && <>
      <button type="button" onClick={() => load()} disabled={loading} className="text-sm font-semibold text-blue-700">{t('paymentReturnUX.check')}</button>
      {loading ? <p role="status">{t('common.loading')}</p> : error ? <p role="alert">{t('projectPayment.unavailable')}</p> : rows.length === 0 ? <p>{t('projectPayment.empty')}</p> :
        <div className="space-y-3">{rows.map(p => <article key={p.id} id={`recu-${p.id}`} className="rounded-lg border border-slate-100 p-3 text-sm">
          <p className="font-semibold">{p.titreProjet}</p>
          {projectId != null && <p>{p.participant}</p>}
          <p>{Number(p.montant).toFixed(2)} {p.devise} · {t(`statuses.${p.statut}`, { defaultValue: p.statut })}</p>
          <p>{new Date(p.datePaiement || p.dateCreation).toLocaleString(i18n.language)}</p>
          {['ECHOUE', 'ANNULE', 'REMBOURSE'].includes(p.statut) && <><p role="alert">{t('paymentReturnUX.failed')}</p><Link className="block underline" to={`/projets/${p.projetId}`}>{t('paymentReturnUX.continueProject')}</Link></>}
          {p.statut === 'PAYE' && p.numeroRecu
            ? <><p role="status">{t('paymentReturnUX.confirmed')} — {t('paymentReturnUX.project')}</p><Link className="block underline" to={`/projets/${p.projetId}`}>{t('paymentReturnUX.continueProject')}</Link><button type="button" disabled={busy} className="mt-2 text-blue-700 underline" onClick={() => download(p.id)}>{t('projectPayment.download')} — {p.numeroRecu}</button></>
            : p.statut === 'EN_ATTENTE' && <><p className="text-amber-700">{t('paymentReturnUX.pending')}</p><p>{t('paymentReturnUX.wait')}</p>
              {projectId == null && <><button type="button" disabled={busy} className="mt-2 text-blue-700 underline" onClick={() => verify(p.id)}>{t('projectPayment.verifyStripe')}</button>
              {verifiedUrls[p.id] && <button type="button" disabled={busy} className="ml-3 mt-2 text-blue-700 underline" onClick={() => verify(p.id, true)}>{t('projectPayment.resume')}</button>}</>}</>}
        </article>)}</div>}
      {recoveryError && <p role="alert">{t('projectPayment.recoveryError')}</p>}
      {receiptError && <p role="alert">{t('projectPayment.error')}</p>}
    </>}
  </section>
}
