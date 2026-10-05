import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
export default function ActivityPaymentReturn() {
  const [params] = useSearchParams()
  const { t } = useTranslation()
  const [state, setState] = useState('paymentPending')
  const [busy, setBusy] = useState(false)
  const check = async () => {
    setBusy(true)
    try {
      const session = params.get('session_id'), payment = params.get('paymentId'), payer = params.get('PayerID')
      const response = session ? await api.get(`/stripe/session/${encodeURIComponent(session)}`)
        : payment && payer ? await api.get('/paiements/confirmer', { params: { paymentId: payment, PayerID: payer } }) : null
      setState(response?.data.statutPaiement === 'PAYE' ? 'paymentConfirmed' : 'paymentPending')
    } catch { setState('paymentError') } finally { setBusy(false) }
  }
  return <main className="mx-auto max-w-lg space-y-5 p-6"><h1 className="text-xl font-bold">{t(`activityEditor.${state}`)}</h1>
    <button type="button" disabled={busy} onClick={check} className="rounded-xl bg-blue-700 px-4 py-2 text-white">{t('activityEditor.checkPayment')}</button>
    <Link to="/activites" className="block underline">{t('activityEditor.backActivities')}</Link></main>
}
