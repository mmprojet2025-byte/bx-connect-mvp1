import test from 'node:test'
import assert from 'node:assert/strict'
import { readStripeCheckout, activityStripeCheckoutAvailable } from './stripeCheckout.js'

test('only backend paid status confirms, even without a URL or with an obsolete URL', () => {
  for (const payment of [{ statut: 'PAYE' }, { statutPaiement: 'PAYE', checkoutUrl: 'https://checkout.stripe.com/old' }]) {
    assert.deepEqual(readStripeCheckout(payment), { state: 'confirmed' })
  }
  assert.deepEqual(readStripeCheckout({ statut: 'EN_ATTENTE' }), { state: 'pending' })
  assert.deepEqual(readStripeCheckout({ statut: 'ANNULE' }), { state: 'closed' })
  assert.deepEqual(readStripeCheckout({ statut: 'ECHOUE' }), { state: 'failed' })
  assert.throws(() => readStripeCheckout({ checkoutUrl: 'https://checkout.stripe.com/payment' }))
})

test('only a pending server response with a genuine HTTPS Stripe URL is resumable', () => {
  assert.deepEqual(readStripeCheckout({ statut: 'EN_ATTENTE', checkoutUrl: 'https://checkout.stripe.com/c/pay/test' }), {
    state: 'open', url: 'https://checkout.stripe.com/c/pay/test',
  })
  for (const checkoutUrl of ['http://checkout.stripe.com/pay', 'https://checkout.stripe.com.attacker.test/pay', 'https://user@checkout.stripe.com/pay', 'javascript:alert(1)', '/payment']) {
    assert.throws(() => readStripeCheckout({ statut: 'EN_ATTENTE', checkoutUrl }))
  }
})

test('activity window uses the server instant and boolean without recalculating the 31 minute rule', () => {
  const stripeCheckoutDateLimite = '2026-10-25T01:29:00Z'
  const deadline = Date.parse(stripeCheckoutDateLimite)
  const activity = { stripeCheckoutDisponible: true, stripeCheckoutDateLimite }
  assert.equal(activityStripeCheckoutAvailable(activity, deadline - 1), true)
  assert.equal(activityStripeCheckoutAvailable(activity, deadline), true)
  assert.equal(activityStripeCheckoutAvailable(activity, deadline + 1), false)
  assert.equal(activityStripeCheckoutAvailable({ ...activity, stripeCheckoutDisponible: false }, deadline - 100000), false)
  assert.equal(activityStripeCheckoutAvailable({ ...activity, stripeCheckoutDateLimite: '2026-10-25T02:29:00+01:00' }, deadline), true)
})
