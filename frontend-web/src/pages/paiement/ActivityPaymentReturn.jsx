import usePaymentPolling from '../../hooks/usePaymentPolling'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
export default function ActivityPaymentReturn() {
  const [params] = useSearchParams()
  const { t } = useTranslation()
  const [state, setState] = useState('paymentPending')
  const [busy, setBusy] = useState(false)
  const [paymentId, setPaymentId] = useState(null)
  const [registrationStatus, setRegistrationStatus] = useState(null)
  const checking = useRef(false)
  const session = params.get('session_id'), payment = params.get('paymentId'), payer = params.get('PayerID')
  const observePayment = useCallback(data => {
    setPaymentId(data?.id || null)
    setRegistrationStatus(data?.statutInscription || null)
    setState(data?.statutPaiement === 'PAYE' ? 'paymentConfirmed'
      : ['ECHOUE', 'ANNULE', 'REMBOURSE'].includes(data?.statutPaiement) ? 'paymentFailed' : 'paymentPending')
  }, [])
  const check = useCallback(async signal => {
    if (checking.current) return
    const operation = {}
    checking.current = operation
    const release = () => { if (checking.current === operation) checking.current = false }
    signal?.addEventListener('abort', release, { once: true })
    setBusy(true)
    try {
      const response = session ? await api.get(`/stripe/session/${encodeURIComponent(session)}`, { signal })
        : payment && payer ? await api.get('/paiements/confirmer', { params: { paymentId: payment, PayerID: payer } }) : null
      if (!signal?.aborted) observePayment(response?.data)
    } catch { if (!signal?.aborted) setState('paymentError') } finally {
      release()
      signal?.removeEventListener('abort', release)
      if (!signal?.aborted) setBusy(false)
    }
  }, [session, payment, payer, observePayment])
  const verify = async () => {
    if (!session || !paymentId) { await check(); return }
    if (checking.current) return
    checking.current = true
    setBusy(true)
    try {
      const { data } = await api.post(`/stripe/activites/paiements/${paymentId}/verifier`)
      observePayment(data)
    } catch { setState('paymentError') } finally { checking.current = false; setBusy(false) }
  }
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
    {state === 'paymentConfirmed' ? <p>{t(registrationStatus === 'ANNULEE' ? 'paymentReturnUX.activityCancelled' : 'paymentReturnUX.activity')}</p>
      : <button type="button" disabled={busy} onClick={verify} className="rounded-xl bg-blue-700 px-4 py-2 text-white">{t('paymentReturnUX.check')}</button>}
    <Link to="/activites" className="block underline">{t('activityEditor.backActivities')}</Link></main>
}
