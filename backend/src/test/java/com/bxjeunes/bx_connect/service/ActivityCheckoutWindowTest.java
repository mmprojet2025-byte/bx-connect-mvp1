package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import com.bxjeunes.bx_connect.exception.ActivityRuleException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ActivityCheckoutWindowTest {
    private static final ZoneId BRUSSELS = ZoneId.of("Europe/Brussels");

    @ParameterizedTest
    @CsvSource({"2026-01-15T10:00:00Z,1859,false", "2026-01-15T10:00:00Z,1860,true",
            "2026-07-15T10:00:00Z,1861,true", "2026-03-29T00:45:00Z,1859,false",
            "2026-03-29T00:45:00Z,1860,true", "2026-10-25T01:45:00Z,1860,true"})
    void serverAndDisplayedAvailabilityAgreeAtTheBoundaryAndBrusselsOffset(String now, int seconds, boolean allowed) {
        Clock clock = Clock.fixed(Instant.parse(now), ZoneOffset.UTC);
        var activity = activity(clock, seconds);
        var activities = mock(ActiviteRepository.class);
        var registrations = mock(InscriptionRepository.class);
        var users = mock(UserRepository.class);
        var payments = mock(SoutienFinancierRepository.class);
        var memberships = mock(MembreGroupeRepository.class);
        var member = new User(); member.setId(1L); member.setRole(Role.MEMBRE); member.setActif(true); member.setEmail("member@test.invalid");
        when(activities.findById(2L)).thenReturn(Optional.of(activity));
        when(activities.findByIdForUpdate(2L)).thenReturn(Optional.of(activity));
        when(users.findByEmail(member.getEmail())).thenReturn(Optional.of(member));
        when(registrations.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        when(payments.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        var policy = new ActivityPaymentService(activities, registrations, payments, memberships);
        ReflectionTestUtils.setField(policy, "clock", clock);
        var catalogue = new ActiviteService(activities, users, registrations, mock(NotificationService.class),
                mock(AuditLogService.class), mock(GroupeRepository.class), memberships);
        ReflectionTestUtils.setField(catalogue, "clock", clock);
        ReflectionTestUtils.setField(catalogue, "stripeEnabled", true);
        var dto = catalogue.getById(2L, member.getEmail());
        assertThat(dto.isStripeCheckoutDisponible()).isEqualTo(allowed);
        assertThat(dto.isPeutSInscrire()).isEqualTo(allowed);
        assertThat(dto.getRaisonIndisponible()).isEqualTo(allowed ? null : "PAYMENT_WINDOW_CLOSED");
        if (allowed) {
            assertThat(policy.prepare(2L, member, BigDecimal.TEN, "STRIPE").getCheckoutExpiresAt())
                    .isEqualTo(ActivityCheckoutWindow.closesAt(activity).getEpochSecond());
        } else {
            assertThatThrownBy(() -> policy.prepare(2L, member, BigDecimal.TEN, "STRIPE"))
                    .isInstanceOf(ActivityRuleException.class)
                    .extracting(e -> ((ActivityRuleException) e).getCode()).isEqualTo("PAYMENT_WINDOW_CLOSED");
            verify(registrations, never()).saveAndFlush(any());
        }
        assertThat(dto.getStripeCheckoutDateLimite()).isEqualTo(ActivityCheckoutWindow.closesAt(activity).minusSeconds(1860));
    }

    @Test void epochConversionDoesNotDependOnTheClocksZoneAndDurationIsBounded() {
        var instant = Instant.parse("2026-07-15T10:00:00Z");
        var utc = Clock.fixed(instant, ZoneOffset.UTC);
        var activity = activity(utc, 7200);
        for (String zone : List.of("UTC", "Europe/Brussels", "America/New_York")) {
            var clock = Clock.fixed(instant, ZoneId.of(zone));
            assertThat(ActivityCheckoutWindow.expiresAt(activity, clock)).isEqualTo(instant.getEpochSecond() + 3600);
            assertThat(ActivityCheckoutWindow.now(clock)).isEqualTo(LocalDateTime.of(2026, 7, 15, 12, 0));
        }
    }

    @Test void oneMillisecondAfterTheAdvertisedDeadlineCannotStartCheckout() {
        var clock = Clock.fixed(Instant.parse("2026-07-15T10:00:00Z"), ZoneOffset.UTC);
        var activity = activity(clock, 1860);
        assertThat(ActivityCheckoutWindow.canOpen(activity, clock)).isTrue();
        assertThat(ActivityCheckoutWindow.canOpen(activity, Clock.offset(clock, Duration.ofMillis(1)))).isFalse();
    }

    @Test void anExistingReservationRemainsVisibleForRecoveryAfterNewCheckoutCloses() {
        var clock = Clock.fixed(Instant.parse("2026-07-15T10:00:00Z"), ZoneOffset.UTC);
        var activity = activity(clock, 100);
        var activities = mock(ActiviteRepository.class); var users = mock(UserRepository.class);
        var registrations = mock(InscriptionRepository.class); var payments = mock(SoutienFinancierRepository.class);
        var member = new User(); member.setId(1L); member.setEmail("owner@test.invalid"); member.setRole(Role.MEMBRE); member.setActif(true);
        var other = new User(); other.setId(9L); other.setEmail("other@test.invalid"); other.setRole(Role.MEMBRE); other.setActif(true);
        var registration = new Inscription(); registration.setId(3L); registration.setActivite(activity); registration.setMembre(member);
        registration.setStatut(StatutInscription.EN_ATTENTE_PAIEMENT);
        var payment = new SoutienFinancier(); payment.setId(4L); payment.setActivite(activity); payment.setDonateur(member); payment.setFournisseur("STRIPE");
        when(activities.findById(2L)).thenReturn(Optional.of(activity));
        when(users.findByEmail(member.getEmail())).thenReturn(Optional.of(member));
        when(users.findByEmail(other.getEmail())).thenReturn(Optional.of(other));
        when(registrations.findByMembreIdAndActiviteIdOrderByDateInscriptionDesc(1L, 2L)).thenReturn(List.of(registration));
        when(payments.findByActiviteId(2L)).thenReturn(List.of(payment));
        var service = new ActiviteService(activities, users, registrations, mock(NotificationService.class), mock(AuditLogService.class),
                mock(GroupeRepository.class), mock(MembreGroupeRepository.class));
        ReflectionTestUtils.setField(service, "clock", clock); ReflectionTestUtils.setField(service, "paiements", payments);
        assertThat(service.getById(2L, member.getEmail()).getPaiementActiviteId()).isEqualTo(4L);
        assertThat(service.getById(2L, other.getEmail()).getPaiementActiviteId()).isNull();
        assertThat(service.getById(2L, null).getPaiementActiviteId()).isNull();
    }

    private Activite activity(Clock clock, int seconds) {
        var a = new Activite(); a.setId(2L); a.setTitre("Test"); a.setGratuite(false); a.setPrix(BigDecimal.TEN);
        a.setCapaciteMax(5); a.setStatut(StatutActivite.PUBLIEE); a.setVisibilite(VisibiliteActivite.PUBLIC);
        a.setDateDebut(LocalDateTime.ofInstant(clock.instant().plusSeconds(seconds), BRUSSELS));
        return a;
    }
}
