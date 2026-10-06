package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import com.paypal.api.payments.*;
import com.paypal.base.rest.APIContext;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.assertj.core.api.Assertions.*;

class ActivityProviderConfirmationTest {
    final SoutienFinancierRepository payments = mock(SoutienFinancierRepository.class);
    final ActiviteRepository activities = mock(ActiviteRepository.class);
    final InscriptionRepository registrations = mock(InscriptionRepository.class);
    final ActivityPaymentService rules = new ActivityPaymentService(activities, registrations, payments, mock(MembreGroupeRepository.class));
    final StripeService stripe = spy(new StripeService(payments, mock(UserRepository.class), activities, mock(ProjetRepository.class)));
    final PayPalService paypal = spy(new PayPalService(mock(APIContext.class), payments, mock(UserRepository.class), activities, mock(ProjetRepository.class)));
    final SoutienFinancier payment = new SoutienFinancier();
    final Activite activity = new Activite();
    @BeforeEach void setup() {
        var user = new User(); user.setId(1L); user.setEmail("owner@test.invalid"); user.setRole(Role.MEMBRE); user.setActif(true);
        activity.setId(2L); activity.setGratuite(false); activity.setPrix(BigDecimal.TEN); activity.setStatut(StatutActivite.PUBLIEE);
        activity.setDateDebut(LocalDateTime.now().plusDays(1)); activity.setCapaciteMax(1);
        var registration = new Inscription(); registration.setMembre(user); registration.setActivite(activity); registration.setStatut(StatutInscription.EN_ATTENTE_PAIEMENT);
        payment.setId(3L); payment.setActivite(activity); payment.setDonateur(user); payment.setMontant(BigDecimal.TEN);
        payment.setInscription(registration); payment.setActivityRequestKey(UUID.randomUUID().toString());
        when(activities.findByIdForUpdate(2L)).thenReturn(Optional.of(activity));
        when(payments.findByIdForUpdate(3L)).thenReturn(Optional.of(payment));
        when(payments.findByStripeSessionId("cs_test_activity")).thenReturn(Optional.of(payment));
        when(payments.findByPaypalPaymentId("pp_test_activity")).thenReturn(Optional.of(payment));
        when(payments.save(any())).thenAnswer(call -> call.getArgument(0));
        ReflectionTestUtils.setField(stripe,"activityPayments",rules);
        ReflectionTestUtils.setField(stripe,"webhookSecret","test-webhook-secret");
        ReflectionTestUtils.setField(paypal,"activityPayments",rules);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user.getEmail(),"unused"));
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    @Test void signedStripeSuccessConfirmsAndDuplicateOrExpiryCannotUndoIt() throws Exception {
        webhook("checkout.session.completed", "paid", 1000);
        assertThat(payment.getInscription().getStatut()).isEqualTo(StatutInscription.PAYEE);
        var paidAt = payment.getDatePaiement();
        webhook("checkout.session.completed", "paid", 1000);
        webhook("checkout.session.expired", "unpaid", 1000);
        assertThat(payment.getStatutPaiement()).isEqualTo(StatutPaiement.PAYE);
        assertThat(payment.getDatePaiement()).isEqualTo(paidAt);
        verify(registrations,times(1)).save(any());
    }
    @Test void forgedStripeSignatureAndAmountCannotConfirm() throws Exception {
        assertThatThrownBy(() -> stripe.traiterWebhook("{}","bad")).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> webhook("checkout.session.completed","paid",1)).isInstanceOf(IllegalArgumentException.class);
        assertThat(payment.getStatutPaiement()).isEqualTo(StatutPaiement.EN_ATTENTE);
        verify(registrations,never()).save(any());
    }
    @Test void unpaidStripeSessionCannotConfirmAndVerifiedExpiryReleasesReservation() throws Exception {
        assertThatThrownBy(() -> webhook("checkout.session.completed", "unpaid", 1000))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(payment.getInscription().getStatut()).isEqualTo(StatutInscription.EN_ATTENTE_PAIEMENT);
        webhook("checkout.session.expired", "unpaid", 1000);
        assertThat(payment.getStatutPaiement()).isEqualTo(StatutPaiement.ANNULE);
        assertThat(payment.getInscription().getStatut()).isEqualTo(StatutInscription.ANNULEE);
    }
    @Test void paypalCancellationReleasesUncapturedPaymentAndPreventsLaterCapture() throws Exception {
        doReturn(new Payment().setState("created")).when(paypal).lirePaiementExterne(anyString());
        paypal.annulerPaiement("pp_test_activity");
        assertThat(payment.getInscription().getStatut()).isEqualTo(StatutInscription.ANNULEE);
        assertThatThrownBy(() -> paypal.confirmerPaiement("pp_test_activity", "payer"))
                .isInstanceOf(IllegalArgumentException.class);
        verify(paypal, never()).executerPaiementExterne(any(), any(), anyString());
    }
    @Test void paypalPendingSettlementCannotBeCancelledOrCapturedAgain() throws Exception {
        doReturn(remote("pending")).when(paypal).lirePaiementExterne(anyString());
        paypal.confirmerPaiement("pp_test_activity", "payer");
        assertThatThrownBy(() -> paypal.annulerPaiement("pp_test_activity"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(payment.getInscription().getStatut()).isEqualTo(StatutInscription.EN_ATTENTE_PAIEMENT);
        verify(paypal, never()).executerPaiementExterne(any(), any(), anyString());
    }
    @Test void paypalWrongRemoteAmountCannotConfirm() throws Exception {
        var remote = remote("completed");
        remote.getTransactions().getFirst().getAmount().setTotal("1.00");
        doReturn(remote).when(paypal).lirePaiementExterne(anyString());
        assertThatThrownBy(() -> paypal.confirmerPaiement("pp_test_activity", "payer"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(payment.getInscription().getStatut()).isEqualTo(StatutInscription.EN_ATTENTE_PAIEMENT);
    }
    @Test void paypalSuccessConfirmedOnlyAfterCompletedSaleAndRetryDoesNotCaptureAgain() throws Exception {
        doReturn(new Payment().setState("created")).when(paypal).lirePaiementExterne(anyString());
        doReturn(remote("completed")).when(paypal).executerPaiementExterne(any(),any(),anyString());
        paypal.confirmerPaiement("pp_test_activity","payer");
        paypal.confirmerPaiement("pp_test_activity","payer");
        assertThat(payment.getInscription().getStatut()).isEqualTo(StatutInscription.PAYEE);
        verify(paypal,times(1)).executerPaiementExterne(any(),any(),anyString());
    }
    @Test void paypalPendingSaleDoesNotConfirmAndForeignOwnerCannotCapture() throws Exception {
        doReturn(new Payment().setState("created")).when(paypal).lirePaiementExterne(anyString());
        doReturn(remote("pending")).when(paypal).executerPaiementExterne(any(),any(),anyString());
        paypal.confirmerPaiement("pp_test_activity","payer");
        assertThat(payment.getInscription().getStatut()).isEqualTo(StatutInscription.EN_ATTENTE_PAIEMENT);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("other@test.invalid","unused"));
        assertThatThrownBy(() -> paypal.confirmerPaiement("pp_test_activity","payer")).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(paypal,times(1)).executerPaiementExterne(any(),any(),anyString());
    }
    @Test void paypalPaidRemoteReconcilesAfterDeadlineWithoutNewCapture() throws Exception {
        activity.setDateLimiteInscription(LocalDateTime.now().minusHours(1));
        doReturn(remote("completed")).when(paypal).lirePaiementExterne(anyString());
        paypal.confirmerPaiement("pp_test_activity","payer");
        assertThat(payment.getInscription().getStatut()).isEqualTo(StatutInscription.PAYEE);
        verify(paypal,never()).executerPaiementExterne(any(),any(),anyString());
    }
    @Test void newerSignedEventRetrievesExistingSessionAndRemainsIdempotent() throws Exception {
        var remote = stripeSession();
        doReturn(remote).when(stripe).lireSessionExterne("cs_test_activity");
        String payload = newerPayload();
        var event = com.stripe.net.ApiResource.GSON.fromJson(payload, com.stripe.model.Event.class);
        assertThat(event.getDataObjectDeserializer().getObject()).isEmpty();
        signed(payload);
        var paidAt = payment.getDatePaiement();
        signed(payload);
        assertThat(payment.getStatutPaiement()).isEqualTo(StatutPaiement.PAYE);
        assertThat(payment.getInscription().getStatut()).isEqualTo(StatutInscription.PAYEE);
        assertThat(payment.getDatePaiement()).isEqualTo(paidAt);
        verify(registrations, times(1)).save(any());
        verify(stripe, never()).creerSessionActiviteExterne(any(), any());
    }

    @Test void invalidSignatureNeverRetrievesOrConfirmsNewerSession() throws Exception {
        assertThatThrownBy(() -> stripe.traiterWebhook(newerPayload(), "t=1,v1=invalid"))
                .isInstanceOf(RuntimeException.class);
        verify(stripe, never()).lireSessionExterne(anyString());
        verify(registrations, never()).save(any());
        assertThat(payment.getStatutPaiement()).isEqualTo(StatutPaiement.EN_ATTENTE);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"unpaid", "amount", "currency", "missingAmount", "metadata", "missingMetadata", "session"})
    void newerEventStillRejectsInvalidRemotePayment(String invalid) throws Exception {
        var remote = stripeSession();
        switch (invalid) {
            case "unpaid" -> remote.setPaymentStatus("unpaid");
            case "amount" -> remote.setAmountTotal(1L);
            case "missingAmount" -> remote.setAmountTotal(null);
            case "currency" -> remote.setCurrency("usd");
            case "metadata" -> remote.setMetadata(Map.of("activity_payment_id", "999"));
            case "missingMetadata" -> remote.setMetadata(null);
            case "session" -> remote.setId("cs_other");
        }
        doReturn(remote).when(stripe).lireSessionExterne("cs_test_activity");
        assertThatThrownBy(() -> signed(newerPayload())).isInstanceOf(IllegalArgumentException.class);
        assertThat(payment.getStatutPaiement()).isEqualTo(StatutPaiement.EN_ATTENTE);
        assertThat(payment.getInscription().getStatut()).isEqualTo(StatutInscription.EN_ATTENTE_PAIEMENT);
        verify(registrations, never()).save(any());
    }

    @Test void metadataMustAlsoMatchTheLocalPayment() throws Exception {
        var remote = stripeSession();
        remote.setMetadata(Map.of("activity_payment_id", "999"));
        doReturn(remote).when(stripe).lireSessionExterne("cs_test_activity");
        assertThatThrownBy(() -> signed(newerPayload().replace("\"activity_payment_id\":\"3\"", "\"activity_payment_id\":\"999\"")))
                .isInstanceOf(IllegalArgumentException.class);
        verify(registrations, never()).save(any());
    }

    @Test void compatibleSessionDoesNotNeedProviderRead() throws Exception {
        webhook("checkout.session.completed", "paid", 1000);
        verify(stripe, never()).lireSessionExterne(anyString());
    }

    @Test
    @org.junit.jupiter.api.extension.ExtendWith(org.springframework.boot.test.system.OutputCaptureExtension.class)
    void providerFailureLogsOnlySafeContextAndLeavesReservationPending(org.springframework.boot.test.system.CapturedOutput output) throws Exception {
        doThrow(new IllegalStateException("secret-must-not-be-logged")).when(stripe).lireSessionExterne(anyString());
        assertThatThrownBy(() -> signed(newerPayload())).isInstanceOf(IllegalStateException.class);
        assertThat(output.getOut()).contains("evt_test", "checkout.session.completed", "2026-09-30.endive", "IllegalStateException")
                .doesNotContain("secret-must-not-be-logged", "test-webhook-secret", "cs_test_activity");
        verify(registrations, never()).save(any());
        assertThat(payment.getStatutPaiement()).isEqualTo(StatutPaiement.EN_ATTENTE);
    }

    @Test void newerSignedEventReturnsHttp200() throws Exception {
        doReturn(stripeSession()).when(stripe).lireSessionExterne("cs_test_activity");
        String payload = newerPayload();
        var response = new com.bxjeunes.bx_connect.controller.StripeController(stripe).webhook(payload, signature(payload));
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(payment.getInscription().getStatut()).isEqualTo(StatutInscription.PAYEE);
    }

    @Test void providerReadFailureReturnsHttp500WithoutConfirmation() throws Exception {
        doThrow(new com.stripe.exception.ApiConnectionException("Provider unavailable")).when(stripe).lireSessionExterne(anyString());
        String payload = newerPayload();
        var response = new com.bxjeunes.bx_connect.controller.StripeController(stripe).webhook(payload, signature(payload));
        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(payment.getStatutPaiement()).isEqualTo(StatutPaiement.EN_ATTENTE);
        verify(registrations, never()).save(any());
    }

    @Test void wrongWebhookSecretReturnsHttp400BeforeProviderRead() throws Exception {
        ReflectionTestUtils.setField(stripe, "webhookSecret", "different-test-secret");
        String payload = newerPayload();
        var response = new com.bxjeunes.bx_connect.controller.StripeController(stripe).webhook(payload, signature(payload));
        assertThat(response.getStatusCode().value()).isEqualTo(400);
        verify(stripe, never()).lireSessionExterne(anyString());
        verify(registrations, never()).save(any());
    }

    @Test void missingEventMetadataIsRejectedBeforeProviderRead() throws Exception {
        assertThatThrownBy(() -> signed(newerPayload().replace("\"metadata\":{\"activity_payment_id\":\"3\"}", "\"metadata\":{}")))
                .isInstanceOf(IllegalArgumentException.class);
        verify(stripe, never()).lireSessionExterne(anyString());
        verify(registrations, never()).save(any());
    }

    @Test void newerEventCanFindTheReservationByVerifiedMetadata() throws Exception {
        payment.setFournisseur("STRIPE");
        when(payments.findByStripeSessionId("cs_test_activity")).thenReturn(Optional.empty());
        when(payments.findById(3L)).thenReturn(Optional.of(payment));
        doReturn(stripeSession()).when(stripe).lireSessionExterne("cs_test_activity");
        signed(newerPayload());
        assertThat(payment.getStripeSessionId()).isEqualTo("cs_test_activity");
        assertThat(payment.getInscription().getStatut()).isEqualTo(StatutInscription.PAYEE);
    }

    @Test void metadataCannotReplaceAnAlreadyLinkedSession() throws Exception {
        payment.setFournisseur("STRIPE"); payment.setStripeSessionId("cs_other");
        when(payments.findByStripeSessionId("cs_test_activity")).thenReturn(Optional.empty());
        when(payments.findById(3L)).thenReturn(Optional.of(payment));
        doReturn(stripeSession()).when(stripe).lireSessionExterne("cs_test_activity");
        assertThatThrownBy(() -> signed(newerPayload())).isInstanceOf(IllegalArgumentException.class);
        assertThat(payment.getStripeSessionId()).isEqualTo("cs_other");
        assertThat(payment.getStatutPaiement()).isEqualTo(StatutPaiement.EN_ATTENTE);
        verify(registrations, never()).save(any());
    }

    private com.stripe.model.checkout.Session stripeSession() {
        var session = new com.stripe.model.checkout.Session();
        session.setId("cs_test_activity"); session.setPaymentStatus("paid");
        session.setCurrency("eur"); session.setAmountTotal(1000L);
        session.setMetadata(Map.of("activity_payment_id", "3"));
        return session;
    }
    private String newerPayload() {
        return "{\"id\":\"evt_test\",\"object\":\"event\",\"api_version\":\"2026-09-30.endive\","
                + "\"type\":\"checkout.session.completed\",\"data\":{\"object\":{\"id\":\"cs_test_activity\","
                + "\"object\":\"checkout.session\",\"metadata\":{\"activity_payment_id\":\"3\"}}}}";
    }

    private Payment remote(String state) {
        var transaction = new Transaction(); transaction.setAmount(new Amount().setCurrency("EUR").setTotal("10.00"));
        transaction.setRelatedResources(List.of(new RelatedResources().setSale(new Sale().setState(state))));
        return new Payment().setState("approved").setTransactions(List.of(transaction));
    }
    private void webhook(String type,String status,long amount) throws Exception {
        String payload = "{\"id\":\"evt_test\",\"object\":\"event\",\"api_version\":\"" + com.stripe.Stripe.API_VERSION
                + "\",\"type\":\""+type+"\",\"data\":{\"object\":{\"id\":\"cs_test_activity\",\"object\":\"checkout.session\",\"payment_status\":\""+status+"\",\"metadata\":{\"activity_payment_id\":\"3\"},\"currency\":\"eur\",\"amount_total\":"+amount+"}}}";
        signed(payload);
    }
    private void signed(String payload) throws Exception {
        stripe.traiterWebhook(payload, signature(payload));
    }
    private String signature(String payload) throws Exception {
        long time=System.currentTimeMillis()/1000;
        var mac=javax.crypto.Mac.getInstance("HmacSHA256");
        mac.init(new javax.crypto.spec.SecretKeySpec("test-webhook-secret".getBytes(java.nio.charset.StandardCharsets.UTF_8),"HmacSHA256"));
        String signature=HexFormat.of().formatHex(mac.doFinal((time+"."+payload).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        return "t="+time+",v1="+signature;
    }
}
