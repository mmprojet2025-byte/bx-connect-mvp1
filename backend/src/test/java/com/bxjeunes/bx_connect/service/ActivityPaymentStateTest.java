package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.assertj.core.api.Assertions.*;

class ActivityPaymentStateTest {
    ActiviteRepository activities = mock(ActiviteRepository.class);
    InscriptionRepository registrations = mock(InscriptionRepository.class);
    SoutienFinancierRepository payments = mock(SoutienFinancierRepository.class);
    MembreGroupeRepository memberships = mock(MembreGroupeRepository.class);
    ActivityPaymentService service = new ActivityPaymentService(activities, registrations, payments, memberships);
    User user = new User();
    Activite activity = new Activite();
    ActivityPaymentStateTest() {
        user.setId(1L); user.setRole(Role.MEMBRE); user.setActif(true);
        activity.setId(2L); activity.setGratuite(false); activity.setPrix(BigDecimal.TEN);
        activity.setCapaciteMax(1); activity.setDateDebut(LocalDateTime.now().plusDays(1));
        activity.setStatut(StatutActivite.PUBLIEE);
        when(activities.findByIdForUpdate(2L)).thenReturn(Optional.of(activity));
    }
    @Test void deadlineAndCancelledAndPrivateActivityRejectPayment() {
        activity.setDateLimiteInscription(LocalDateTime.now().minusSeconds(1));
        assertThatThrownBy(() -> service.prepare(2L,user,BigDecimal.TEN,"PAYPAL")).hasMessageContaining("clôturées");
        activity.setDateLimiteInscription(null); activity.setStatut(StatutActivite.ANNULEE);
        assertThatThrownBy(() -> service.prepare(2L,user,BigDecimal.TEN,"PAYPAL")).hasMessageContaining("clôturées");
        activity.setStatut(StatutActivite.PUBLIEE); activity.setVisibilite(VisibiliteActivite.PRIVE_GROUPE);
        assertThatThrownBy(() -> service.prepare(2L,user,BigDecimal.TEN,"PAYPAL")).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verifyNoInteractions(payments);
    }
    @Test void fullActivityDoesNotReserve() {
        when(registrations.countByActiviteIdAndStatutIn(eq(2L), anyList())).thenReturn(1L);
        assertThatThrownBy(() -> service.prepare(2L,user,BigDecimal.TEN,"PAYPAL")).hasMessageContaining("complète");
        verify(registrations,never()).saveAndFlush(any());
    }
    @Test void pendingRetryReusesAttemptAndCannotSwitchProvider() {
        var p = payment(); when(payments.findByActiviteId(2L)).thenReturn(List.of(p));
        assertThat(service.prepare(2L,user,BigDecimal.TEN,"STRIPE")).isSameAs(p);
        assertThatThrownBy(() -> service.prepare(2L,user,BigDecimal.TEN,"PAYPAL")).hasMessageContaining("autre fournisseur");
        verify(registrations,never()).saveAndFlush(any());
    }
    @Test void successIsIdempotentAndExpirationCannotUndoIt() {
        var p = payment(); service.complete(p,true); service.complete(p,true); service.complete(p,false);
        assertThat(p.getStatutPaiement()).isEqualTo(StatutPaiement.PAYE);
        assertThat(p.getInscription().getStatut()).isEqualTo(StatutInscription.PAYEE);
        verify(payments,times(1)).save(p); verify(registrations,times(1)).save(p.getInscription());
    }
    @Test void expiredAttemptReleasesReservationButKeepsBothRecords() {
        var p = payment(); service.complete(p,false);
        assertThat(p.getStatutPaiement()).isEqualTo(StatutPaiement.ANNULE);
        assertThat(p.getInscription().getStatut()).isEqualTo(StatutInscription.ANNULEE);
        verify(payments,never()).delete(any()); verify(registrations,never()).delete(any());
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.EnumSource(value = StatutInscription.class, names = {"PAYEE", "ANNULEE", "EN_ATTENTE_PAIEMENT"})
    void paidHistoryPreventsSecondCharge(StatutInscription status) {
        var p = payment(); p.setStatutPaiement(StatutPaiement.PAYE);
        p.getInscription().setStatut(status);
        when(payments.findByActiviteId(2L)).thenReturn(List.of(p));
        assertThatThrownBy(() -> service.prepare(2L,user,BigDecimal.TEN,"STRIPE")).hasMessageContaining("déjà été payée");
        assertThat(p.getStatutPaiement()).isEqualTo(StatutPaiement.PAYE);
        assertThat(p.getInscription().getStatut()).isEqualTo(status);
        verify(payments, never()).save(any());
        verify(registrations, never()).saveAndFlush(any());
    }
    SoutienFinancier payment() {
        var i = new Inscription(); i.setActivite(activity); i.setMembre(user); i.setStatut(StatutInscription.EN_ATTENTE_PAIEMENT);
        var p = new SoutienFinancier(); p.setActivite(activity); p.setDonateur(user); p.setInscription(i); p.setFournisseur("STRIPE"); p.setMontant(BigDecimal.TEN);
        return p;
    }
}
