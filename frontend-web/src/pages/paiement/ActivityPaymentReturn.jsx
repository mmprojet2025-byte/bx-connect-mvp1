import usePaymentPolling from '../../hooks/usePaymentPolling'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
export default function ActivityPaymentReturn() {
  const [params] = useSearchParams()
  const { t } = useTranslation()
  const [state, setState] = useState('paymentPending')
  const [busy, setBusy] = useState(false)
  const session = params.get('session_id'), payment = params.get('paymentId'), payer = params.get('PayerID')
  const check = useCallback(async signal => {
    setBusy(true)
    try {
      const response = session ? await api.get(`/stripe/session/${encodeURIComponent(session)}`, { signal })
        : payment && payer ? await api.get('/paiements/confirmer', { params: { paymentId: payment, PayerID: payer } }) : null
      if (!signal?.aborted) setState(response?.data.statutPaiement === 'PAYE' ? 'paymentConfirmed'
        : ['ECHOUE', 'ANNULE', 'REMBOURSE'].includes(response?.data.statutPaiement) ? 'paymentFailed' : 'paymentPending')
    } catch { if (!signal?.aborted) setState('paymentError') } finally { if (!signal?.aborted) setBusy(false) }
  }, [session, payment, payer])
  useEffect(() => {
    const controller = new AbortController()
    if (session) check(controller.signal)
    return () => controller.abort()
  }, [session, check])
  usePaymentPolling(Boolean(session) && state === 'paymentPending', check)
  const key = { paymentPending: 'pending', paymentConfirmed: 'confirmed', paymentFailed: 'failed', paymentError: 'error' }[state]
  return <main className="mx-auto max-w-lg space-y-5 p-6">
    <h1 aria-live="polite" className="text-xl font-bold">{t(`paymentReturnUX.${key}`)}</h1>
    {state === 'paymentPending' && <p>{t('paymentReturnUX.wait')}</p>}
    {state === 'paymentConfirmed' ? <p>{t('paymentReturnUX.activity')}</p>
      : <button type="button" disabled={busy} onClick={() => check()} className="rounded-xl bg-blue-700 px-4 py-2 text-white">{t('paymentReturnUX.check')}</button>}
    <Link to="/activites" className="block underline">{t('activityEditor.backActivities')}</Link></main>
}
