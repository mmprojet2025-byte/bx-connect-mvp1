package com.bxjeunes.bx_connect.service;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.dto.ProjetPaiementResponse;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class ProjetStripeCheckoutTest {
    ProjetParticipationPaiementService payments=mock(ProjetParticipationPaiementService.class);
    ProjetStripeCheckoutService checkout=spy(new ProjetStripeCheckoutService(payments));
    ProjetParticipationPaiement payment=new ProjetParticipationPaiement();
    @BeforeEach void setup() {
        var project=new Projet();project.setId(2L);
        payment.setId(3L);payment.setProjet(project);payment.setMontant(new BigDecimal("5.00"));
        payment.setDevise("EUR");payment.setStatut(StatutPaiement.EN_ATTENTE);
        payment.setRequestKey("stable-fixture-key");payment.setExpiresAt(System.currentTimeMillis()/1000+3600);
        payment.setTitreProjet("Projet test");payment.setNomParticipant("Alice");payment.setDateCreation(LocalDateTime.now());
        when(payments.prepare(2L,"member")).thenReturn(payment);
        ReflectionTestUtils.setField(checkout,"successUrl","https://example.org/paiement/success");
    }
    @Test void checkoutUsesServerAmountReceiptReturnAndIdempotencyKey() throws Exception {
        var session=new Session();session.setId("cs_fixture");
        doReturn(session).when(checkout).create(any(),anyString());
        when(payments.attach(3L,session)).thenReturn(ProjetPaiementResponse.from(payment));
        when(payments.recover(3L,"member",session)).thenReturn(ProjetPaiementResponse.from(payment));
        checkout.checkout(2L,"member");
        var params=ArgumentCaptor.forClass(SessionCreateParams.class);
        verify(checkout).create(params.capture(),eq("stable-fixture-key"));
        assertThat(params.getValue().getLineItems().getFirst().getPriceData().getUnitAmount()).isEqualTo(500L);
        assertThat(params.getValue().getMetadata()).containsEntry("project_participation_payment_id","3");
        assertThat(params.getValue().getSuccessUrl()).isEqualTo("https://example.org/mes-factures?recu=3");
        assertThat(params.getValue().getCancelUrl()).contains("/mes-factures?recu=3");
    }
    @Test void uncertainNetworkRetryReusesSameCommittedAttempt() throws Exception {
        doThrow(new IllegalStateException("simulated network failure")).when(checkout).create(any(),anyString());
        assertThatThrownBy(()->checkout.checkout(2L,"member")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->checkout.checkout(2L,"member")).isInstanceOf(IllegalStateException.class);
        verify(checkout,times(2)).create(any(),eq("stable-fixture-key"));
        verify(payments,never()).handle(any(),eq(true));
    }
    @Test void existingPaidSessionIsRecoveredWithoutAnotherCheckout() throws Exception {
        payment.setStripeSessionId("cs_fixture");
        when(payments.recoverySnapshot(3L,"member")).thenReturn(
            new ProjetParticipationPaiementService.RecoverySnapshot(ProjetPaiementResponse.from(payment),"cs_fixture"));
        var remote=new Session(); remote.setId("cs_fixture"); remote.setStatus("complete"); remote.setPaymentStatus("paid");
        doReturn(remote).when(checkout).retrieve("cs_fixture");
        payment.setStatut(StatutPaiement.PAYE);
        when(payments.recover(3L,"member",remote)).thenReturn(ProjetPaiementResponse.from(payment));
        assertThat(checkout.checkout(2L,"member").statut()).isEqualTo(StatutPaiement.PAYE);
        verify(checkout,never()).create(any(),anyString());
        verify(payments).recover(3L,"member",remote);
    }
    @Test void missingSessionNeverCreatesCheckoutDuringRecovery() {
        when(payments.recoverySnapshot(3L,"member")).thenReturn(
            new ProjetParticipationPaiementService.RecoverySnapshot(ProjetPaiementResponse.from(payment),null));
        assertThatThrownBy(()->checkout.recover(3L,"member")).isInstanceOf(IllegalArgumentException.class);
        verify(payments,never()).recover(any(),anyString(),any());
    }
    @Test void unknownOldAttemptNeverCreatesAnotherCharge() throws Exception {
        payment.setExpiresAt(System.currentTimeMillis()/1000-10);
        assertThatThrownBy(()->checkout.checkout(2L,"member")).isInstanceOf(IllegalArgumentException.class);
        verify(checkout,never()).create(any(),anyString());
    }

    @Test void pendingAttemptIsRecoveredBeforeCheckingChangedProjectEligibility() throws Exception {
        when(payments.currentAttempt(2L,"member")).thenReturn(new ProjetParticipationPaiementService.StripeAttempt(3L,"cs_fixture"));
        payment.setStripeSessionId("cs_fixture");
        when(payments.recoverySnapshot(3L,"member")).thenReturn(
                new ProjetParticipationPaiementService.RecoverySnapshot(ProjetPaiementResponse.from(payment),"cs_fixture"));
        var remote = new Session(); remote.setId("cs_fixture");
        doReturn(remote).when(checkout).retrieve("cs_fixture");
        payment.setStatut(StatutPaiement.PAYE);
        when(payments.recover(3L,"member",remote)).thenReturn(ProjetPaiementResponse.from(payment));
        assertThat(checkout.checkout(2L,"member").statut()).isEqualTo(StatutPaiement.PAYE);
        verify(payments,never()).prepare(any(),any());
        verify(checkout,never()).create(any(),anyString());
    }

    @Test void abandonedReservationsAreVerifiedBeforeCreatingTheNextAttempt() throws Exception {
        when(payments.expiredStripeAttempts(2L,"member"))
                .thenReturn(java.util.List.of(new ProjetParticipationPaiementService.StripeAttempt(8L,"cs_expired")));
        var expired = new Session(); expired.setId("cs_expired"); expired.setStatus("expired");
        doReturn(expired).when(checkout).retrieve("cs_expired");
        doThrow(new IllegalStateException("stop before external creation")).when(checkout).create(any(),any());
        assertThatThrownBy(() -> checkout.checkout(2L,"member")).isInstanceOf(IllegalStateException.class);
        var order = inOrder(payments);
        order.verify(payments).reconcile(8L,expired);
        order.verify(payments).prepare(2L,"member");
    }
}
