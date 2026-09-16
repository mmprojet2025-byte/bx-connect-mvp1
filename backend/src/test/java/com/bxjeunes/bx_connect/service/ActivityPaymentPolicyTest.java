package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.PaiementRequest;
import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.Projet;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import com.bxjeunes.bx_connect.entity.StatutProjet;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.entity.VisibiliteProjet;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.ProjetRepository;
import com.bxjeunes.bx_connect.repository.SoutienFinancierRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.paypal.api.payments.Payment;
import com.paypal.base.rest.APIContext;
import com.stripe.model.checkout.Session;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActivityPaymentPolicyTest {

    @Mock SoutienFinancierRepository soutienRepo;
    @Mock UserRepository userRepository;
    @Mock ActiviteRepository activiteRepository;
    @Mock ProjetRepository projetRepository;
    @Mock APIContext apiContext;

    private StripeService stripeService;
    private PayPalService payPalService;

    @BeforeEach
    void setUp() {
        stripeService = spy(new StripeService(soutienRepo, userRepository, activiteRepository, projetRepository));
        payPalService = spy(new PayPalService(apiContext, soutienRepo, userRepository, activiteRepository, projetRepository));
        ReflectionTestUtils.setField(stripeService, "successUrl", "https://app.example.test/success");
        ReflectionTestUtils.setField(stripeService, "cancelUrl", "https://app.example.test/cancel");
        ReflectionTestUtils.setField(payPalService, "returnUrl", "https://api.example.test/return");
        ReflectionTestUtils.setField(payPalService, "cancelUrl", "https://api.example.test/cancel");

        User user = new User();
        user.setId(1L);
        user.setEmail("membre@example.test");
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user.getEmail(), "unused"));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void publishedPaidActivityIsRejectedByStripeBeforeProviderCall() throws Exception {
        PaiementRequest request = activityRequest();
        when(activiteRepository.findById(10L)).thenReturn(Optional.of(activity(false, StatutActivite.PUBLIEE)));

        assertThatThrownBy(() -> stripeService.creerSessionCheckout(request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("Les paiements d'activité sont indisponibles dans cette version.");
        verify(stripeService, never()).creerSessionExterne(any());
        verify(soutienRepo, never()).save(any());
    }

    @Test
    void publishedPaidActivityIsRejectedByPayPalBeforeProviderCall() throws Exception {
        PaiementRequest request = activityRequest();
        when(activiteRepository.findById(10L)).thenReturn(Optional.of(activity(false, StatutActivite.PUBLIEE)));

        assertThatThrownBy(() -> payPalService.creerPaiement(request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("Les paiements d'activité sont indisponibles dans cette version.");
        verify(payPalService, never()).creerPaiementExterne(any());
        verify(soutienRepo, never()).save(any());
    }

    @Test
    void unpublishedFreeActivityIsRejectedByBothServices() throws Exception {
        PaiementRequest request = activityRequest();
        when(activiteRepository.findById(10L)).thenReturn(Optional.of(activity(true, StatutActivite.BROUILLON)));

        assertThatThrownBy(() -> stripeService.creerSessionCheckout(request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("Les paiements d'activité sont indisponibles dans cette version.");
        assertThatThrownBy(() -> payPalService.creerPaiement(request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("Les paiements d'activité sont indisponibles dans cette version.");
        verify(stripeService, never()).creerSessionExterne(any());
        verify(payPalService, never()).creerPaiementExterne(any());
        verify(soutienRepo, never()).save(any());
    }

    @Test
    void publishedFreeActivityIsRejectedByStripeBeforeProviderCall() throws Exception {
        PaiementRequest request = activityRequest();
        when(activiteRepository.findById(10L)).thenReturn(Optional.of(activity(true, StatutActivite.PUBLIEE)));

        assertThatThrownBy(() -> stripeService.creerSessionCheckout(request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("Les paiements d'activité sont indisponibles dans cette version.");
        verify(stripeService, never()).creerSessionExterne(any());
        verify(soutienRepo, never()).save(any());
    }

    @Test
    void publishedFreeActivityIsRejectedByPayPalBeforeProviderCall() throws Exception {
        PaiementRequest request = activityRequest();
        when(activiteRepository.findById(10L)).thenReturn(Optional.of(activity(true, StatutActivite.PUBLIEE)));

        assertThatThrownBy(() -> payPalService.creerPaiement(request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("Les paiements d'activité sont indisponibles dans cette version.");
        verify(payPalService, never()).creerPaiementExterne(any());
        verify(soutienRepo, never()).save(any());
    }

    @Test
    void projectSupportStillUsesItsExistingStripeFlow() throws Exception {
        PaiementRequest request = new PaiementRequest();
        request.setProjetId(20L);
        request.setMontant(BigDecimal.TEN);
        Projet project = new Projet();
        project.setTitre("Projet public");
        project.setStatut(StatutProjet.APPROUVE);
        project.setVisibilite(VisibiliteProjet.PUBLIC);
        when(projetRepository.findById(20L)).thenReturn(Optional.of(project));
        Session created = org.mockito.Mockito.mock(Session.class);
        when(created.getId()).thenReturn("cs_project");
        when(created.getUrl()).thenReturn("https://stripe.example.test/project");
        when(soutienRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        org.mockito.Mockito.doReturn(created).when(stripeService).creerSessionExterne(any());
        assertThatNoException().isThrownBy(() -> stripeService.creerSessionCheckout(request));
        verify(stripeService).creerSessionExterne(any());
        verify(soutienRepo).save(any());
    }

    private PaiementRequest activityRequest() {
        PaiementRequest request = new PaiementRequest();
        request.setActiviteId(10L);
        request.setMontant(BigDecimal.TEN);
        return request;
    }

    private Activite activity(boolean free, StatutActivite status) {
        Activite activity = new Activite();
        activity.setTitre("Activité historique");
        activity.setGratuite(free);
        activity.setStatut(status);
        return activity;
    }
}
