// Only a server response may confirm a payment or expose a reusable Checkout.
export function readStripeCheckout(payment) {
  const status = payment?.statutPaiement || payment?.statut
  if (status === 'PAYE') return { state: 'confirmed' }
  if (status === 'ANNULE') return { state: 'closed' }
  if (['ECHOUE', 'REMBOURSE'].includes(status)) return { state: 'failed' }
  if (status !== 'EN_ATTENTE') throw new Error('Unknown payment status')
  if (!payment.checkoutUrl) return { state: 'pending' }
  const url = new URL(payment.checkoutUrl)
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.username || url.password) {
    throw new Error('Invalid Stripe Checkout URL')
  }
  return { state: 'open', url: url.href }
}

// The backend supplies the cutoff as an instant, including its UTC offset.
// Do not derive a second business deadline from activity dates in the browser.
export function activityStripeCheckoutAvailable(activity, now = Date.now()) {
  if (activity?.stripeCheckoutDisponible === false) return false
  const deadline = Date.parse(activity?.stripeCheckoutDateLimite)
  return !Number.isFinite(deadline) || now <= deadline
}
