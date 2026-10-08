package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.ActiviteRequest;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Write contract only: no private reading, participation or reassignment workflow. */
class ActiviteWriteRulesTest {
    final ActiviteRepository activities = mock(ActiviteRepository.class);
    final UserRepository users = mock(UserRepository.class);
    final GroupeRepository groups = mock(GroupeRepository.class);
    final InscriptionRepository registrations = mock(InscriptionRepository.class);
    final ActiviteService service = new ActiviteService(activities, users, registrations,
            mock(NotificationService.class), mock(AuditLogService.class), groups, org.mockito.Mockito.mock(com.bxjeunes.bx_connect.repository.MembreGroupeRepository.class));
    User admin, referent, other;
    Groupe group;
    Activite saved;

    @BeforeEach
    void setup() {
        when(activities.findGroupeIdById(anyLong())).thenAnswer(call -> activities
                .findByIdForUpdate(call.getArgument(0)).map(Activite::getGroupe).map(Groupe::getId));
        admin = user(1L, Role.ADMIN);
        referent = user(2L, Role.REFERENT);
        other = user(3L, Role.REFERENT);
        group = group(10L, referent);
        when(users.findByEmail(anyString())).thenAnswer(call -> {
            String email = call.getArgument(0);
            return java.util.stream.Stream.of(admin, referent, other).filter(u -> u.getEmail().equals(email)).findFirst();
        });
        when(groups.findByIdForUpdate(10L)).thenReturn(Optional.of(group));
        when(activities.save(any())).thenAnswer(call -> {
            saved = call.getArgument(0);
            if (saved.getId() == null) saved.setId(20L);
            return saved;
        });
    }

    @Test
    void adminCreatesGeneralWithAuthenticatedCreatorAndNullAssignment() {
        service.creer(request(), admin.getEmail());
        assertThat(saved.getCreateur()).isSameAs(admin);
        assertThat(saved.getGroupe()).isNull();
        assertThat(saved.getReferentAssigne()).isNull();
        assertThat(saved.getVisibilite()).isEqualTo(VisibiliteActivite.PUBLIC);
        assertThat(saved.isGratuite()).isTrue();
        assertThat(saved.getPrix()).isNull();
        assertThat(saved.getStatut()).isEqualTo(StatutActivite.BROUILLON);
        assertThat(saved.getImageStorageKey()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"groupe", "referent", "prive", "membres", "referentActeur", "groupeManquant"})
    void rejectsInconsistentGeneralOrMissingGroup(String scenario) {
        ActiviteRequest request = request();
        String actor = admin.getEmail();
        request.setNature(ActiviteRequest.Nature.GENERALE);
        switch (scenario) {
            case "groupe" -> request.setGroupeId(10L);
            case "referent" -> request.setReferentAssigneId(2L);
            case "prive" -> request.setVisibilite(VisibiliteActivite.PRIVE_GROUPE);
            case "membres" -> request.setVisibilite(VisibiliteActivite.MEMBRES);
            case "referentActeur" -> actor = referent.getEmail();
            case "groupeManquant" -> request.setNature(ActiviteRequest.Nature.GROUPE);
        }
        String email = actor;
        assertThatThrownBy(() -> service.creer(request, email)).isInstanceOf(RuntimeException.class);
        verify(activities, never()).save(any());
    }

    @ParameterizedTest
    @EnumSource(value = VisibiliteActivite.class, names = {"PUBLIC", "PRIVE_GROUPE"})
    void adminCreatesGroupAndServerDeterminesRealReferent(VisibiliteActivite visibility) {
        ActiviteRequest request = groupRequest();
        request.setVisibilite(visibility);
        service.creer(request, admin.getEmail());
        assertThat(saved.getGroupe()).isSameAs(group);
        assertThat(saved.getReferentAssigne()).isSameAs(referent);
        assertThat(saved.getCreateur()).isSameAs(admin);
        assertThat(saved.getVisibilite()).isEqualTo(visibility);
        assertThat(saved.isGratuite()).isTrue();
        assertThat(saved.getPrix()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"absent", "attente", "refuse", "archive", "inactif", "sansReferent",
            "autreReferent", "referentInactif", "mauvaisRole", "referentNull", "membres"})
    void rejectsIneligibleGroupOrForgedAssignment(String scenario) {
        ActiviteRequest request = groupRequest();
        switch (scenario) {
            case "absent" -> request.setGroupeId(999L);
            case "attente" -> group.setStatut(StatutGroupe.EN_ATTENTE);
            case "refuse" -> group.setStatut(StatutGroupe.REFUSE);
            case "archive" -> group.setStatut(StatutGroupe.ARCHIVE);
            case "inactif" -> group.setActif(false);
            case "sansReferent" -> group.setReferent(null);
            case "autreReferent" -> request.setReferentAssigneId(other.getId());
            case "referentInactif" -> referent.setActif(false);
            case "mauvaisRole" -> referent.setRole(Role.MEMBRE);
            case "referentNull" -> request.setReferentAssigneId(null);
            case "membres" -> request.setVisibilite(VisibiliteActivite.MEMBRES);
        }
        assertThatThrownBy(() -> service.creer(request, admin.getEmail())).isInstanceOf(RuntimeException.class);
        verify(activities, never()).save(any());
    }

    @Test
    void referentCreatesOwnGroupOnly() {
        ActiviteRequest request = groupRequest();
        request.setReferentAssigneId(referent.getId());
        service.creer(request, referent.getEmail());
        assertThat(saved.getCreateur()).isSameAs(referent);
        assertThat(saved.getReferentAssigne()).isSameAs(referent);
        clearInvocations(activities);
        assertThatThrownBy(() -> service.creer(request, other.getEmail()))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(activities, never()).save(any());
    }

    @ParameterizedTest
    @EnumSource(value = Role.class, names = {"MEMBRE", "PARTENAIRE", "SUPER_ADMIN"})
    void serviceAlsoRejectsUnauthorizedCreators(Role role) {
        other.setRole(role);
        assertThatThrownBy(() -> service.creer(request(), other.getEmail()))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"payante", "prix", "prixZero", "titre", "description", "lieu",
            "titreNull", "descriptionNull", "lieuNull", "zero", "negatif", "egal", "avant", "debutNull", "finNull"})
    void creationRejectsInvalidFieldsAndForgedPricing(String scenario) {
        ActiviteRequest request = request();
        switch (scenario) {
            case "payante" -> { request.setGratuite(false); request.setPrix(BigDecimal.ZERO); }
            case "prix" -> request.setPrix(BigDecimal.TEN);
            case "prixZero" -> request.setPrix(BigDecimal.ZERO);
            case "titre" -> request.setTitre(" ");
            case "description" -> request.setDescription(" ");
            case "lieu" -> request.setLieu(" ");
            case "titreNull" -> request.setTitre(null);
            case "descriptionNull" -> request.setDescription(null);
            case "lieuNull" -> request.setLieu(null);
            case "zero" -> request.setCapaciteMax(0);
            case "negatif" -> request.setCapaciteMax(-1);
            case "egal" -> request.setDateFin(request.getDateDebut());
            case "avant" -> request.setDateFin(request.getDateDebut().minusSeconds(1));
            case "debutNull" -> request.setDateDebut(null);
            case "finNull" -> request.setDateFin(null);
        }
        assertThatThrownBy(() -> service.creer(request, admin.getEmail())).isInstanceOf(RuntimeException.class);
        verify(activities, never()).save(any());
    }

    @Test
    void adminCanChangeDraftGroupAndAssignmentWithoutChangingCreator() {
        Activite activity = existing(true);
        Groupe next = group(11L, other);
        when(groups.findByIdForUpdate(11L)).thenReturn(Optional.of(next));
        ActiviteRequest request = groupRequest();
        request.setGroupeId(11L);
        request.setReferentAssigneId(other.getId());
        request.setVisibilite(VisibiliteActivite.PRIVE_GROUPE);
        service.modifier(20L, request, admin.getEmail());
        assertThat(activity.getGroupe()).isSameAs(next);
        assertThat(activity.getReferentAssigne()).isSameAs(other);
        assertThat(activity.getCreateur()).isSameAs(admin);
        assertThat(activity.getVisibilite()).isEqualTo(VisibiliteActivite.PRIVE_GROUPE);
    }

    @Test
    void adminCanSwitchDraftBetweenGeneralAndGroup() {
        Activite activity = existing(false);
        service.modifier(20L, groupRequest(), admin.getEmail());
        assertThat(activity.getGroupe()).isSameAs(group);
        ActiviteRequest general = request();
        general.setNature(ActiviteRequest.Nature.GENERALE);
        general.setGroupeId(null);
        service.modifier(20L, general, admin.getEmail());
        assertThat(activity.getGroupe()).isNull();
        assertThat(activity.getReferentAssigne()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"groupe", "visibilite", "generale", "referent"})
    void publishedAssignmentAndVisibilityAreFrozen(String scenario) {
        Activite activity = existing(true);
        activity.setStatut(StatutActivite.PUBLIEE);
        ActiviteRequest request = groupRequest();
        switch (scenario) {
            case "groupe" -> request.setGroupeId(11L);
            case "visibilite" -> request.setVisibilite(VisibiliteActivite.PRIVE_GROUPE);
            case "generale" -> request.setGroupeId(null);
            case "referent" -> request.setReferentAssigneId(other.getId());
        }
        assertThatThrownBy(() -> service.modifier(20L, request, admin.getEmail())).isInstanceOf(RuntimeException.class);
        assertThat(activity.getGroupe()).isSameAs(group);
        assertThat(activity.getReferentAssigne()).isSameAs(referent);
        assertThat(activity.getVisibilite()).isEqualTo(VisibiliteActivite.PUBLIC);
        verify(activities, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"autre", "createur", "generale", "groupe", "referent"})
    void referentCannotUseCreatorOwnershipOrChangeAssignment(String scenario) {
        Activite activity = existing(true);
        ActiviteRequest request = groupRequest();
        String email = referent.getEmail();
        switch (scenario) {
            case "autre" -> email = other.getEmail();
            case "createur" -> { activity.setCreateur(other); email = other.getEmail(); }
            case "generale" -> request.setGroupeId(null);
            case "groupe" -> request.setGroupeId(11L);
            case "referent" -> request.setReferentAssigneId(other.getId());
        }
        String actor = email;
        assertThatThrownBy(() -> service.modifier(20L, request, actor)).isInstanceOf(RuntimeException.class);
        verify(activities, never()).save(any());
    }

    @Test
    void assignedReferentCanEditIncludingWhenAssignmentFieldsAreOmitted() {
        Activite activity = existing(true);
        service.modifier(20L, request(), referent.getEmail());
        assertThat(activity.getGroupe()).isSameAs(group);
        assertThat(activity.getReferentAssigne()).isSameAs(referent);
        assertThat(activity.getCreateur()).isSameAs(admin);
    }

    @ParameterizedTest
    @ValueSource(strings = {"change", "inactif", "role", "groupeInactif", "groupeNonValide"})
    void staleAssignmentBlocksManagementAndPublicationWithoutTransfer(String scenario) {
        Activite activity = existing(true);
        switch (scenario) {
            case "change" -> group.setReferent(other);
            case "inactif" -> referent.setActif(false);
            case "role" -> referent.setRole(Role.MEMBRE);
            case "groupeInactif" -> group.setActif(false);
            case "groupeNonValide" -> group.setStatut(StatutGroupe.EN_ATTENTE);
        }
        assertThatThrownBy(() -> service.modifier(20L, request(), referent.getEmail())).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> service.modifier(20L, request(), admin.getEmail())).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> service.changerStatut(20L, StatutActivite.PUBLIEE,
                VisibiliteActivite.PUBLIC, admin.getEmail())).isInstanceOf(RuntimeException.class);
        assertThat(activity.getReferentAssigne()).isSameAs(referent);
        assertThat(activity.getStatut()).isEqualTo(StatutActivite.BROUILLON);
        verify(activities, never()).save(any());
    }

    @ParameterizedTest
    @EnumSource(value = VisibiliteActivite.class, names = {"PUBLIC", "PRIVE_GROUPE"})
    void eligibleGroupPublishesWithBothVisibilities(VisibiliteActivite visibility) {
        existing(true);
        service.changerStatut(20L, StatutActivite.PUBLIEE, visibility, referent.getEmail());
        assertThat(saved.getStatut()).isEqualTo(StatutActivite.PUBLIEE);
        assertThat(saved.getVisibilite()).isEqualTo(visibility);
    }

    @ParameterizedTest
    @EnumSource(value = VisibiliteActivite.class, names = {"MEMBRES", "PRIVE_GROUPE"})
    void generalCannotPublishWithNewRestrictedVisibility(VisibiliteActivite visibility) {
        existing(false);
        assertThatThrownBy(() -> service.changerStatut(20L, StatutActivite.PUBLIEE, visibility, admin.getEmail()))
                .isInstanceOf(IllegalArgumentException.class);
        verify(activities, never()).save(any());
    }

    @Test
    void historicalCancelledActivityStaysReadableAndIntact() {
        Activite activity = existing(false);
        activity.setStatut(StatutActivite.ANNULEE);
        activity.setCreateur(referent);
        activity.setDescription(null);
        activity.setLieu(null);
        var before = activity.getDateCreation();
        assertThat(service.getById(20L, admin.getEmail()).getStatut()).isEqualTo(StatutActivite.ANNULEE);
        assertThat(activity.getCreateur()).isSameAs(referent);
        assertThat(activity.getGroupe()).isNull();
        assertThat(activity.getReferentAssigne()).isNull();
        assertThat(activity.getImageStorageKey()).isNull();
        assertThat(activity.getVisibilite()).isEqualTo(VisibiliteActivite.PUBLIC);
        assertThat(activity.getDescription()).isNull();
        assertThat(activity.getLieu()).isNull();
        assertThat(activity.getDateCreation()).isEqualTo(before);
        verify(activities, never()).save(any());
    }

    @Test
    void historicalPaidMembersActivityKeepsFinancesAndLegacyOwnerPermission() {
        Activite activity = existing(false);
        activity.setGratuite(false);
        activity.setPrix(new BigDecimal("12.50"));
        activity.setVisibilite(VisibiliteActivite.MEMBRES);
        activity.setCreateur(referent);
        ActiviteRequest request = request();
        request.setGratuite(false);
        request.setPrix(new BigDecimal("12.50"));
        service.modifier(20L, request, referent.getEmail());
        assertThat(activity.isGratuite()).isFalse();
        assertThat(activity.getPrix()).isEqualByComparingTo("12.50");
        assertThat(activity.getVisibilite()).isEqualTo(VisibiliteActivite.MEMBRES);
        assertThat(activity.getGroupe()).isNull();
        assertThat(activity.getCreateur()).isSameAs(referent);
        service.changerStatut(20L, StatutActivite.PUBLIEE, VisibiliteActivite.MEMBRES, admin.getEmail());
        assertThatThrownBy(() -> service.modifier(20L, request(), admin.getEmail())).isInstanceOf(RuntimeException.class);
        request.setPrix(BigDecimal.ONE);
        assertThatThrownBy(() -> service.modifier(20L, request, admin.getEmail())).hasMessageContaining("prix");
        assertThat(activity.getPrix()).isEqualByComparingTo("12.50");
    }

    @Test
    void jacksonDistinguishesOmittedAndExplicitNullAssignmentAndIgnoresForgedCreator() throws Exception {
        ObjectMapper mapper = new ObjectMapper().disable(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        ActiviteRequest omitted = mapper.readValue("{}", ActiviteRequest.class);
        assertThat(omitted.isGroupeFourni()).isFalse();
        assertThat(omitted.isReferentFourni()).isFalse();
        ActiviteRequest explicit = mapper.readValue(
                "{\"groupeId\":null,\"referentAssigneId\":null,\"groupeFourni\":false,\"referentFourni\":false}", ActiviteRequest.class);
        assertThat(explicit.isGroupeFourni()).isTrue();
        assertThat(explicit.isReferentFourni()).isTrue();
        ActiviteRequest forged = mapper.readValue("{\"createurId\":3,\"createur\":{\"id\":3}}", ActiviteRequest.class);
        complete(forged);
        service.creer(forged, admin.getEmail());
        assertThat(saved.getCreateur()).isSameAs(admin);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "REFERENT"})
    void paidGroupCreationAndPublication(String role) {
        ActiviteRequest request = request(); request.setGroupeId(group.getId());
        request.setGratuite(false); request.setPrix(new BigDecimal("10.25"));
        User actor = role.equals("ADMIN") ? admin : referent;
        service.creer(request, actor.getEmail());
        when(activities.findByIdForUpdate(saved.getId())).thenReturn(Optional.of(saved));
        service.changerStatut(saved.getId(), StatutActivite.PUBLIEE, VisibiliteActivite.PUBLIC, actor.getEmail());
        assertThat(saved.getPrix()).isEqualByComparingTo("10.25");
        assertThat(saved.getStatut()).isEqualTo(StatutActivite.PUBLIEE);
        assertThat(saved.getReferentAssigne()).isSameAs(referent);
    }

    @Test
    void paidGeneralAndMultiDayDeadlineRoundTrip() {
        var request = request(); request.setGratuite(false); request.setPrix(BigDecimal.ONE);
        request.setDateFin(request.getDateDebut().plusDays(2));
        request.setDateLimiteInscription(request.getDateDebut().minusHours(2));
        var response = service.creer(request, admin.getEmail());
        assertThat(response.getDateFin()).isEqualTo(request.getDateFin());
        assertThat(response.getDateLimiteInscription()).isEqualTo(request.getDateLimiteInscription());
        request.setDateLimiteInscription(request.getDateDebut().plusMinutes(1));
        assertThatThrownBy(() -> service.creer(request, admin.getEmail())).hasMessageContaining("limite");
    }

    @Test
    void imageAttachmentReplacementAndOmissionPreserveData() {
        var imageService = mock(ActivityImageService.class);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "activityImages", imageService);
        when(imageService.url("first")).thenReturn("https://example.test/first");
        var request = request(); request.setImageStorageKey("first");
        var response = service.creer(request, admin.getEmail());
        assertThat(response.getImageUrl()).isEqualTo("https://example.test/first");
        verify(imageService).validate("first");
        when(activities.findByIdForUpdate(saved.getId())).thenReturn(Optional.of(saved));
        service.modifier(saved.getId(), request(), admin.getEmail());
        assertThat(saved.getImageStorageKey()).isEqualTo("first");
        request.setImageStorageKey("second"); service.modifier(saved.getId(), request, admin.getEmail());
        assertThat(saved.getImageStorageKey()).isEqualTo("second");
        doThrow(new IllegalArgumentException("Image invalide")).when(imageService).validate("bad");
        request.setImageStorageKey("bad");
        assertThatThrownBy(() -> service.modifier(saved.getId(), request, admin.getEmail())).hasMessageContaining("Image");
        assertThat(saved.getImageStorageKey()).isEqualTo("second");
    }

    @Test
    void draftPricingCanChangeOnlyWithoutHistory() {
        var activity = existing(false);
        var request = request(); request.setGratuite(false); request.setPrix(BigDecimal.TEN);
        service.modifier(20L, request, admin.getEmail());
        assertThat(activity.isGratuite()).isFalse();
        service.modifier(20L, request(), admin.getEmail());
        assertThat(activity.isGratuite()).isTrue(); assertThat(activity.getPrix()).isNull();
        var payments = mock(SoutienFinancierRepository.class);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "paiements", payments);
        when(payments.findByActiviteId(20L)).thenReturn(java.util.List.of(new SoutienFinancier()));
        assertThatThrownBy(() -> service.modifier(20L, request, admin.getEmail())).isInstanceOf(RuntimeException.class);
    }

    @ParameterizedTest
    @EnumSource(value = StatutActivite.class, names = {"TERMINEE", "ANNULEE"})
    void terminalActivityIsReadOnly(StatutActivite status) {
        var activity = existing(false); activity.setStatut(status);
        assertThatThrownBy(() -> service.modifier(20L, request(), admin.getEmail())).hasMessageContaining("modifiée");
        assertThatThrownBy(() -> service.supprimer(20L, admin.getEmail())).hasMessageContaining("historique");
    }

    @Test
    void deadlineOmissionAndPendingCapacityAreProtected() {
        var activity = existing(false); var deadline = request().getDateDebut().minusHours(1);
        activity.setDateLimiteInscription(deadline);
        var request = request(); service.modifier(20L, request, admin.getEmail());
        assertThat(activity.getDateLimiteInscription()).isEqualTo(deadline);
        when(registrations.countByActiviteIdAndStatutIn(eq(20L), argThat(statuses -> statuses.contains(StatutInscription.EN_ATTENTE_PAIEMENT)))).thenReturn(4L);
        request.setCapaciteMax(3);
        assertThatThrownBy(() -> service.modifier(20L, request, admin.getEmail())).hasMessageContaining("capacité");
        assertThatThrownBy(() -> service.changerStatut(20L, StatutActivite.ANNULEE, null, admin.getEmail())).hasMessageContaining("paiement");
    }

    private Activite existing(boolean assigned) {
        Activite activity = new Activite();
        activity.setId(20L);
        activity.setCreateur(admin);
        activity.setTitre("Atelier");
        activity.setDescription("Description");
        activity.setLieu("Bruxelles");
        activity.setDateDebut(LocalDateTime.now().plusDays(1));
        activity.setDateFin(activity.getDateDebut().plusHours(1));
        activity.setCapaciteMax(10);
        if (assigned) {
            activity.setGroupe(group);
            activity.setReferentAssigne(referent);
        }
        when(activities.findByIdForUpdate(20L)).thenReturn(Optional.of(activity));
        when(activities.findById(20L)).thenReturn(Optional.of(activity));
        return activity;
    }

    private ActiviteRequest groupRequest() {
        ActiviteRequest request = request();
        request.setNature(ActiviteRequest.Nature.GROUPE);
        request.setGroupeId(10L);
        return request;
    }

    private ActiviteRequest request() {
        ActiviteRequest request = new ActiviteRequest();
        complete(request);
        return request;
    }

    private void complete(ActiviteRequest request) {
        request.setTitre("Atelier");
        request.setDescription("Description");
        request.setLieu("Bruxelles");
        request.setDateDebut(LocalDateTime.now().plusDays(1));
        request.setDateFin(request.getDateDebut().plusHours(1));
        request.setCapaciteMax(10);
    }

    private User user(Long id, Role role) {
        User user = new User();
        user.setId(id); user.setRole(role); user.setActif(true); user.setEmail(id + "@test.invalid");
        return user;
    }

    private Groupe group(Long id, User owner) {
        Groupe result = new Groupe();
        result.setId(id); result.setStatut(StatutGroupe.VALIDE); result.setActif(true); result.setReferent(owner);
        return result;
    }
}
