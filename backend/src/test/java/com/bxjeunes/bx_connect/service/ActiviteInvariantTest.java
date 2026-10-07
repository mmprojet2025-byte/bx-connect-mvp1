package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.ActiviteRequest;
import com.bxjeunes.bx_connect.dto.InscriptionRequest;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ActiviteInvariantTest {
    @Mock ActiviteRepository activities;
    @Mock InscriptionRepository registrations;
    @Mock UserRepository users;
    @Mock NotificationService notifications;
    @Mock AuditLogService audit;
    ActiviteService activityService;
    InscriptionService registrationService;
    User admin;

    @BeforeEach
    void setUp() {
        activityService = new ActiviteService(activities, users, registrations, notifications, audit, mock(com.bxjeunes.bx_connect.repository.GroupeRepository.class), org.mockito.Mockito.mock(com.bxjeunes.bx_connect.repository.MembreGroupeRepository.class));
        registrationService = new InscriptionService(registrations, activities, users, notifications, audit, org.mockito.Mockito.mock(com.bxjeunes.bx_connect.repository.MembreGroupeRepository.class));
        admin = new User(); admin.setId(1L); admin.setEmail("admin@test.invalid"); admin.setRole(Role.ADMIN);
    }

    @Test
    void creationRejectsZeroAndNegativeCapacity() {
        ActiviteRequest request = validRequest();
        request.setCapaciteMax(0);
        assertThatThrownBy(() -> activityService.creer(request, admin.getEmail())).hasMessageContaining("strictement positive");
        request.setCapaciteMax(-1);
        assertThatThrownBy(() -> activityService.creer(request, admin.getEmail())).hasMessageContaining("strictement positive");
        verifyNoInteractions(activities);
    }

    @Test
    void creationRejectsIncoherentDatesAndInvalidPaidPrice() {
        ActiviteRequest invalidDates = validRequest();
        invalidDates.setDateFin(invalidDates.getDateDebut().minusMinutes(1));
        assertThatThrownBy(() -> activityService.creer(invalidDates, admin.getEmail())).hasMessageContaining("date de fin");
        ActiviteRequest paid = validRequest(); paid.setGratuite(false); paid.setPrix(BigDecimal.ZERO);
        assertThatThrownBy(() -> activityService.creer(paid, admin.getEmail())).hasMessageContaining("strictement positif");
    }

    @Test
    void legacyPaidPricingIsImmutableButGeneralFieldsMayChange() {
        Activite paid = activity(false); paid.setPrix(BigDecimal.TEN);
        ActiviteRequest request = validRequest(); request.setGratuite(false); request.setPrix(BigDecimal.TEN);
        when(activities.findByIdForUpdate(3L)).thenReturn(Optional.of(paid));
        when(users.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(activities.save(paid)).thenReturn(paid);
        activityService.modifier(3L, request, admin.getEmail());
        request.setPrix(BigDecimal.ONE);
        assertThatThrownBy(() -> activityService.modifier(3L, request, admin.getEmail())).hasMessageContaining("prix");
    }

    @Test
    void registrationRejectsPastAndPaidActivities() {
        User member = new User(); member.setId(2L); member.setEmail("member@test.invalid"); member.setRole(Role.MEMBRE);
        InscriptionRequest request = new InscriptionRequest(); request.setActiviteId(3L);
        Activite activity = activity(true); activity.setDateDebut(LocalDateTime.now().minusMinutes(1));
        when(users.findByEmail(member.getEmail())).thenReturn(Optional.of(member));
        when(activities.findByIdForUpdate(3L)).thenReturn(Optional.of(activity));
        assertThatThrownBy(() -> registrationService.inscrire(request, member.getEmail())).hasMessageContaining("clôturées");
        activity.setDateDebut(LocalDateTime.now().plusDays(1)); activity.setGratuite(false);
        assertThatThrownBy(() -> registrationService.inscrire(request, member.getEmail())).hasMessageContaining("payantes");
    }

    @Test
    void freeRegistrationRespectsOptionalDeadline() {
        User member = new User(); member.setId(2L); member.setEmail("member@test.invalid"); member.setRole(Role.MEMBRE); member.setActif(true);
        InscriptionRequest request = new InscriptionRequest(); request.setActiviteId(3L);
        Activite activity = activity(true); activity.setDateDebut(LocalDateTime.now().plusDays(1));
        when(users.findByEmail(member.getEmail())).thenReturn(Optional.of(member));
        when(activities.findByIdForUpdate(3L)).thenReturn(Optional.of(activity));
        activity.setDateLimiteInscription(LocalDateTime.now().minusSeconds(1));
        assertThatThrownBy(() -> registrationService.inscrire(request, member.getEmail())).hasMessageContaining("clôturées");
    }

    @Test
    void terminalStatusCannotTransition() {
        Activite activity = activity(true); activity.setStatut(StatutActivite.ANNULEE);
        when(activities.findByIdForUpdate(3L)).thenReturn(Optional.of(activity));
        when(users.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        assertThatThrownBy(() -> activityService.changerStatut(3L, StatutActivite.PUBLIEE, VisibiliteActivite.PUBLIC, admin.getEmail()))
                .hasMessageContaining("non autorisée");
    }

    private ActiviteRequest validRequest() {
        ActiviteRequest request = new ActiviteRequest();
        request.setTitre("Atelier"); request.setDescription("Description"); request.setLieu("Bruxelles"); request.setDateDebut(LocalDateTime.now().plusDays(1));
        request.setDateFin(LocalDateTime.now().plusDays(1).plusHours(1));
        request.setCapaciteMax(10); request.setGratuite(true); return request;
    }

    private Activite activity(boolean free) {
        Activite activity = new Activite(); activity.setId(3L); activity.setTitre("Atelier");
        activity.setCreateur(admin); activity.setGratuite(free); activity.setCapaciteMax(10);
        activity.setDateDebut(LocalDateTime.now().plusDays(1)); activity.setDateFin(LocalDateTime.now().plusDays(1).plusHours(1));
        activity.setStatut(StatutActivite.PUBLIEE); return activity;
    }
}
