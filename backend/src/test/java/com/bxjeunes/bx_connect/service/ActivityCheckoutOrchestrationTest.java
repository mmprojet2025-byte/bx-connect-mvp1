package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.PaiementRequest;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.exception.ActivityRuleException;
import com.bxjeunes.bx_connect.repository.*;
import com.stripe.model.checkout.Session;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ActivityCheckoutOrchestrationTest {
    private final ActivityPaymentService payments = mock(ActivityPaymentService.class);
    private final UserRepository users = mock(UserRepository.class);
    private final StripeService stripe = spy(new StripeService(mock(SoutienFinancierRepository.class), users,
            mock(ActiviteRepository.class), mock(ProjetRepository.class)));
    private final User member = new User();
    private final PaiementRequest request = new PaiementRequest();

    @BeforeEach void setup() {
        member.setId(1L); member.setEmail("member@test.invalid"); member.setRole(Role.MEMBRE); member.setActif(true);
        when(users.findByEmail(member.getEmail())).thenReturn(Optional.of(member));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(member.getEmail(), "unused"));
        ReflectionTestUtils.setField(stripe, "activityPayments", payments);
        ReflectionTestUtils.setField(stripe, "successUrl", "https://app.test.invalid/paiement/succes");
        ReflectionTestUtils.setField(stripe, "cancelUrl", "https://app.test.invalid/paiement/annule");
        request.setActiviteId(2L); request.setMontant(BigDecimal.TEN);
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void abandonedReservationIsCheckedBeforeTheNextCapacityDecision() throws Exception {
        when(payments.expiredStripeAttempts(2L, member, BigDecimal.TEN))
                .thenReturn(List.of(new ActivityPaymentService.StripeAttempt(8L, "cs_abandoned", 1L)));
        var session = new Session(); session.setId("cs_abandoned"); session.setStatus("expired"); session.setPaymentStatus("unpaid");
        doReturn(session).when(stripe).lireSessionExterne("cs_abandoned");
        when(payments.prepare(2L, member, BigDecimal.TEN, "STRIPE")).thenThrow(new ActivityRuleException("Cette activité est complète."));
        assertThatThrownBy(() -> stripe.creerSessionCheckout(request)).hasMessageContaining("complète");
        var order = inOrder(payments);
        order.verify(payments).reconcileStripe(8L, session);
        order.verify(payments).prepare(2L, member, BigDecimal.TEN, "STRIPE");
        verify(stripe, never()).creerSessionActiviteExterne(any(), any());
    }

    @Test void unreachableStripeNeverReleasesAnUncertainReservation() throws Exception {
        when(payments.expiredStripeAttempts(2L, member, BigDecimal.TEN))
                .thenReturn(List.of(new ActivityPaymentService.StripeAttempt(8L, "cs_abandoned", 1L)));
        doThrow(new com.stripe.exception.ApiConnectionException("Provider unavailable"))
                .when(stripe).lireSessionExterne("cs_abandoned");
        when(payments.prepare(2L, member, BigDecimal.TEN, "STRIPE")).thenThrow(new ActivityRuleException("Cette activité est complète."));
        assertThatThrownBy(() -> stripe.creerSessionCheckout(request)).hasMessageContaining("complète");
        verify(payments, never()).reconcileStripe(any(), any());
        verify(stripe, never()).creerSessionActiviteExterne(any(), any());
    }

    @Test void recentNetworkRetryKeepsTheSameKeyAndImmutableParameters() throws Exception {
        var activity = new Activite(); activity.setId(2L);
        var attempt = new SoutienFinancier(); attempt.setId(3L); attempt.setActivite(activity); attempt.setDonateur(member);
        attempt.setFournisseur("STRIPE"); attempt.setMontant(BigDecimal.TEN);
        attempt.setCheckoutExpiresAt(System.currentTimeMillis()/1000 + 3600); attempt.setActivityRequestKey("fixture-same-attempt");
        when(payments.prepare(2L, member, BigDecimal.TEN, "STRIPE")).thenReturn(attempt);
        doThrow(new com.stripe.exception.ApiConnectionException("Uncertain network reply"))
                .when(stripe).creerSessionActiviteExterne(any(), any());
        assertThatThrownBy(() -> stripe.creerSessionCheckout(request)).isInstanceOf(com.stripe.exception.ApiConnectionException.class);
        assertThatThrownBy(() -> stripe.creerSessionCheckout(request)).isInstanceOf(com.stripe.exception.ApiConnectionException.class);
        var params = org.mockito.ArgumentCaptor.forClass(com.stripe.param.checkout.SessionCreateParams.class);
        verify(stripe, times(2)).creerSessionActiviteExterne(params.capture(), eq("fixture-same-attempt"));
        assertThat(params.getAllValues().get(0).toMap()).isEqualTo(params.getAllValues().get(1).toMap());
        verify(payments, never()).complete(any(), anyBoolean());
    }
}
