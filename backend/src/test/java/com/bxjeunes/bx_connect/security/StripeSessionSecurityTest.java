package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.PaiementResponse;
import com.bxjeunes.bx_connect.entity.StatutPaiement;
import com.bxjeunes.bx_connect.entity.SoutienFinancier;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.ProjetRepository;
import com.bxjeunes.bx_connect.repository.SoutienFinancierRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.StripeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StripeSessionSecurityTest {

    @Mock private SoutienFinancierRepository soutienRepo;
    @Mock private UserRepository userRepository;
    @Mock private ActiviteRepository activiteRepository;
    @Mock private ProjetRepository projetRepository;

    @InjectMocks private StripeService stripeService;

    private SoutienFinancier soutien;

    @BeforeEach
    void setUp() {
        User donateur = new User();
        donateur.setId(1L);
        donateur.setEmail("proprietaire@test.be");
        donateur.setPrenom("Proprietaire");
        donateur.setNom("Test");

        soutien = new SoutienFinancier();
        soutien.setId(10L);
        soutien.setMontant(BigDecimal.TEN);
        soutien.setDonateur(donateur);
        soutien.setStripeSessionId("cs_test_123");
        soutien.setFournisseur("STRIPE");
        soutien.setStatutPaiement(StatutPaiement.EN_ATTENTE);
    }

    @Test
    @DisplayName("Une session Stripe n'est visible que par son proprietaire")
    void session_stripe_etrangere_refusee() {
        when(soutienRepo.findByStripeSessionId("cs_test_123")).thenReturn(Optional.of(soutien));

        assertThatThrownBy(() ->
                stripeService.verifierSession("cs_test_123", "autre@test.be"))
                .isInstanceOf(AccessDeniedException.class);

        verify(soutienRepo, never()).save(any(SoutienFinancier.class));
    }

    @Test
    @DisplayName("La verification Stripe ne modifie pas l'etat hors webhook")
    void verification_stripe_reste_lecture_seule() throws Exception {
        when(soutienRepo.findByStripeSessionId("cs_test_123")).thenReturn(Optional.of(soutien));

        PaiementResponse response =
                stripeService.verifierSession("cs_test_123", "proprietaire@test.be");

        assertThat(response.getStatutPaiement()).isEqualTo(StatutPaiement.EN_ATTENTE);
        verify(soutienRepo, never()).save(any(SoutienFinancier.class));
    }
}
