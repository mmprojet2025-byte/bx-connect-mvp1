package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.*;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ActiviteVisibilityTest {
    @Mock ActiviteRepository activities;
    @Mock UserRepository users;
    @Mock InscriptionRepository inscriptions;
    @Mock SoutienFinancierRepository payments;
    @Mock NotificationService notifications;
    @Mock AuditLogService audit;
    ActiviteService service;
    User owner;
    Activite publique;
    Activite membres;

    @BeforeEach
    void setup() {
        service = new ActiviteService(activities, users, inscriptions, notifications, audit, mock(com.bxjeunes.bx_connect.repository.GroupeRepository.class), org.mockito.Mockito.mock(com.bxjeunes.bx_connect.repository.MembreGroupeRepository.class));
        ReflectionTestUtils.setField(service, "paiements", payments);
        owner = user(1L, Role.REFERENT);
        publique = activity(10L, VisibiliteActivite.PUBLIC);
        membres = activity(11L, VisibiliteActivite.MEMBRES);
    }

    @ParameterizedTest
    // Historical MEMBRES drafts retain their visibility; no new MEMBRES activity is created.
    @EnumSource(value = VisibiliteActivite.class, names = {"PUBLIC", "MEMBRES"})
    void ownerPublishesWithExplicitVisibility(VisibiliteActivite visibility) {
        publique.setVisibilite(visibility);
        publique.setStatut(StatutActivite.BROUILLON);
        when(activities.findByIdForUpdate(10L)).thenReturn(Optional.of(publique));
        when(users.findByEmail(owner.getEmail())).thenReturn(Optional.of(owner));
        when(activities.save(publique)).thenAnswer(call -> {
            assertThat(publique.getStatut()).isEqualTo(StatutActivite.PUBLIEE);
            assertThat(publique.getVisibilite()).isEqualTo(visibility);
            return publique;
        });
        var response = service.changerStatut(10L, StatutActivite.PUBLIEE, visibility, owner.getEmail());
        assertThat(response.getVisibilite()).isEqualTo(visibility);
        verify(activities).save(publique);
    }

    @Test
    void adminPublishesWithoutApprovalAndLaterTransitionPreservesVisibility() {
        publique.setVisibilite(VisibiliteActivite.MEMBRES);
        User admin = user(3L, Role.ADMIN);
        publique.setStatut(StatutActivite.BROUILLON);
        when(activities.findByIdForUpdate(10L)).thenReturn(Optional.of(publique));
        when(users.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(activities.save(publique)).thenReturn(publique);
        service.changerStatut(10L, StatutActivite.PUBLIEE, VisibiliteActivite.MEMBRES, admin.getEmail());
        assertThatThrownBy(() -> service.changerStatut(10L, StatutActivite.PUBLIEE, VisibiliteActivite.PUBLIC, admin.getEmail()))
                .isInstanceOf(IllegalArgumentException.class);
        var response = service.changerStatut(10L, StatutActivite.ANNULEE, null, admin.getEmail());
        assertThat(response.getStatut()).isEqualTo(StatutActivite.ANNULEE);
        assertThat(response.getVisibilite()).isEqualTo(VisibiliteActivite.MEMBRES);
    }

    @Test
    void missingVisibilityDoesNotPublishOrSave() {
        publique.setStatut(StatutActivite.BROUILLON);
        when(activities.findByIdForUpdate(10L)).thenReturn(Optional.of(publique));
        when(users.findByEmail(owner.getEmail())).thenReturn(Optional.of(owner));
        assertThatThrownBy(() -> service.changerStatut(10L, StatutActivite.PUBLIEE, null, owner.getEmail()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(publique.getStatut()).isEqualTo(StatutActivite.BROUILLON);
        verify(activities, never()).save(any());
    }

    @ParameterizedTest
    @EnumSource(value = Role.class, names = {"MEMBRE", "PARTENAIRE", "SUPER_ADMIN", "REFERENT"})
    void readerCannotPublishSomeoneElsesActivity(Role role) {
        User reader = user(2L, role);
        publique.setStatut(StatutActivite.BROUILLON);
        when(activities.findByIdForUpdate(10L)).thenReturn(Optional.of(publique));
        when(users.findByEmail(reader.getEmail())).thenReturn(Optional.of(reader));
        assertThatThrownBy(() -> service.changerStatut(10L, StatutActivite.PUBLIEE, VisibiliteActivite.PUBLIC, reader.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        verify(activities, never()).save(any());
    }

    @ParameterizedTest
    @EnumSource(value = Role.class, names = {"MEMBRE", "PARTENAIRE", "SUPER_ADMIN", "REFERENT", "ADMIN"})
    void authenticatedReaderSeesBothVisibilities(Role role) {
        User reader = user(2L, role);
        when(users.findByEmail(reader.getEmail())).thenReturn(Optional.of(reader));
        when(activities.findByStatut(StatutActivite.PUBLIEE)).thenReturn(List.of(publique, membres));
        when(activities.findById(11L)).thenReturn(Optional.of(membres));
        assertThat(service.listerPubliees(reader.getEmail())).extracting(ActiviteResponse::getId).containsExactly(10L, 11L);
        var detail = service.getById(11L, reader.getEmail());
        assertThat(detail.getVisibilite()).isEqualTo(VisibiliteActivite.MEMBRES);
        assertThat(detail.isPeutSInscrire()).isEqualTo(role == Role.MEMBRE);
    }

    @Test
    void anonymousListSearchAndDetailNeverExposeMembersActivity() {
        when(activities.findByStatut(StatutActivite.PUBLIEE)).thenReturn(List.of(publique, membres));
        when(activities.rechercherMultiChamps(StatutActivite.PUBLIEE, "atelier")).thenReturn(List.of(publique, membres));
        when(activities.findById(11L)).thenReturn(Optional.of(membres));
        when(activities.findById(10L)).thenReturn(Optional.of(publique));
        assertThat(service.listerPubliees(null)).extracting(ActiviteResponse::getId).containsExactly(10L);
        assertThat(service.rechercher("atelier", null)).extracting(ActiviteResponse::getId).containsExactly(10L);
        assertThat(service.getById(10L, null).getVisibilite()).isEqualTo(VisibiliteActivite.PUBLIC);
        assertThatThrownBy(() -> service.getById(11L, null)).hasMessageContaining("introuvable");
    }

    @ParameterizedTest
    @ValueSource(strings = {"texte", "dates", "categorieTheme", "categorie", "theme", "lieu", "gratuite", "aucun"})
    void eachFilterBranchEnforcesVisibility(String branch) {
        ActiviteFiltreRequest filter = new ActiviteFiltreRequest();
        List<Activite> found = List.of(publique, membres);
        switch (branch) {
            case "texte" -> filter.setQ("atelier");
            case "dates" -> { filter.setDateDebut(LocalDateTime.now()); filter.setDateFin(LocalDateTime.now().plusDays(3)); }
            case "categorieTheme" -> { filter.setCategorie("Sport"); filter.setTheme("Collectif"); }
            case "categorie" -> filter.setCategorie("Sport");
            case "theme" -> filter.setTheme("Collectif");
            case "lieu" -> filter.setLieu("Bruxelles");
            case "gratuite" -> filter.setGratuite(true);
            default -> { }
        }
        when(activities.filtrerCombines(StatutActivite.PUBLIEE, filter.getQ(), filter.getCategorie(),
                filter.getTheme(), filter.getLieu(), filter.getDateDebut(), filter.getDateFin(), filter.getGratuite()))
                .thenReturn(found);
        when(users.findByEmail(owner.getEmail())).thenReturn(Optional.of(owner));
        assertThat(service.filtrer(filter, null)).extracting(ActiviteResponse::getId).containsExactly(10L);
        assertThat(service.filtrer(filter, owner.getEmail())).extracting(ActiviteResponse::getId).containsExactly(10L, 11L);
    }

    @Test
    void paginationFiltersBeforeCountingAndPaging() {
        when(activities.findAll(any(org.springframework.data.jpa.domain.Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(publique)));
        var page = service.listerPublieesPage(null, 0, 20);
        assertThat(page.totalElements()).isEqualTo(1);
        assertThat(page.content()).extracting(ActiviteResponse::getId).containsExactly(10L);
        verify(activities, never()).findByStatut(any(), any(Pageable.class));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void filterOptionsUseAuthenticationScope(boolean authenticated) {
        publique.setCategorie("Sport"); publique.setTheme("Collectif");
        when(activities.findByStatut(StatutActivite.PUBLIEE)).thenReturn(List.of(publique));
        if (authenticated) when(users.findByEmail(owner.getEmail())).thenReturn(Optional.of(owner));
        var options = service.getOptionsFiltre(authenticated ? owner.getEmail() : null);
        assertThat(options.get("categories")).containsExactly("Sport");
        assertThat(options.get("themes")).containsExactly("Collectif");
        assertThat(options.get("lieux")).containsExactly("Bruxelles");
    }

    @Test
    void draftRemainsPrivateExceptForOwnerAndAdmin() {
        publique.setStatut(StatutActivite.BROUILLON);
        when(activities.findById(10L)).thenReturn(Optional.of(publique));
        when(users.findByEmail(owner.getEmail())).thenReturn(Optional.of(owner));
        User admin = user(3L, Role.ADMIN);
        when(users.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        User other = user(2L, Role.REFERENT);
        when(users.findByEmail(other.getEmail())).thenReturn(Optional.of(other));
        assertThat(service.getById(10L, owner.getEmail()).getId()).isEqualTo(10L);
        assertThat(service.getById(10L, admin.getEmail()).getId()).isEqualTo(10L);
        assertThatThrownBy(() -> service.getById(10L, null)).hasMessageContaining("introuvable");
        assertThatThrownBy(() -> service.getById(10L, other.getEmail())).hasMessageContaining("introuvable");
    }

    @Test
    void publicPartnerEndpointFiltersBeforeMapping() {
        var partner = new PartenaireService(mock(SoutienFinancierRepository.class), users,
                mock(ProjetRepository.class), activities, mock(PartenaireProfilRepository.class), notifications, audit);
        when(activities.findByStatut(StatutActivite.PUBLIEE)).thenReturn(List.of(publique, membres));
        assertThat(partner.activitesSoutienOuverts(false)).extracting(row -> row.get("id")).containsExactly(10L);
        assertThat(partner.activitesSoutienOuverts(true)).extracting(row -> row.get("id")).containsExactly(10L, 11L);
    }

    @Test
    void paidCancelledRegistrationIsExplicitInDetailAndCatalogueWithoutChangingHistory() {
        User member = user(2L, Role.MEMBRE);
        var payment = registrationPayment(member, StatutInscription.ANNULEE, StatutPaiement.PAYE);
        when(users.findByEmail(member.getEmail())).thenReturn(Optional.of(member));
        when(activities.findById(10L)).thenReturn(Optional.of(publique));
        when(activities.findByStatut(StatutActivite.PUBLIEE)).thenReturn(List.of(publique));
        when(inscriptions.findByMembreIdAndActiviteIdOrderByDateInscriptionDesc(2L, 10L))
                .thenReturn(List.of(payment.getInscription()));
        when(payments.findByActiviteId(10L)).thenReturn(List.of(payment));

        for (var response : List.of(service.getById(10L, member.getEmail()), service.listerPubliees(member.getEmail()).get(0))) {
            assertThat(response.isInscrit()).isFalse();
            assertThat(response.isPeutSInscrire()).isFalse();
            assertThat(response.getRaisonIndisponible()).isEqualTo("PAID_REGISTRATION_CANCELLED");
            assertThat(response.getInscriptionId()).isNull();
            assertThat(response.getStatutInscription()).isNull();
            assertThat(response.getPaiementActiviteId()).isNull();
        }
        assertThat(payment.getStatutPaiement()).isEqualTo(StatutPaiement.PAYE);
        assertThat(payment.getInscription().getStatut()).isEqualTo(StatutInscription.ANNULEE);
        verify(payments, never()).save(any());
        verify(payments, never()).delete(any());
        verify(inscriptions, never()).save(any());
        verify(inscriptions, never()).delete(any());
    }

    @ParameterizedTest
    @EnumSource(value = StatutInscription.class, names = {"PAYEE", "EN_ATTENTE_PAIEMENT"})
    void activeRegistrationKeepsItsRealState(StatutInscription status) {
        User member = user(2L, Role.MEMBRE);
        var payment = registrationPayment(member, status,
                status == StatutInscription.PAYEE ? StatutPaiement.PAYE : StatutPaiement.EN_ATTENTE);
        when(users.findByEmail(member.getEmail())).thenReturn(Optional.of(member));
        when(activities.findById(10L)).thenReturn(Optional.of(publique));
        when(inscriptions.findByMembreIdAndActiviteIdOrderByDateInscriptionDesc(2L, 10L))
                .thenReturn(List.of(payment.getInscription()));
        if (status == StatutInscription.EN_ATTENTE_PAIEMENT) {
            when(payments.findByActiviteId(10L)).thenReturn(List.of(payment));
        }
        var response = service.getById(10L, member.getEmail());
        assertThat(response.isInscrit()).isTrue();
        assertThat(response.isPeutSInscrire()).isFalse();
        assertThat(response.getRaisonIndisponible()).isEqualTo("DEJA_INSCRIT");
        assertThat(response.getStatutInscription()).isEqualTo(status);
        assertThat(response.getPaiementActiviteId()).isEqualTo(status == StatutInscription.PAYEE ? null : 30L);
    }

    @ParameterizedTest
    @ValueSource(strings = {"pending", "cancelled", "refunded", "otherMember", "noRegistration"})
    void unrelatedPaymentDoesNotClaimMemberHasPaidAndCancelled(String scenario) {
        User member = user(2L, Role.MEMBRE);
        var payment = registrationPayment("otherMember".equals(scenario) ? user(4L, Role.MEMBRE) : member,
                StatutInscription.ANNULEE, StatutPaiement.PAYE);
        if ("pending".equals(scenario)) payment.setStatutPaiement(StatutPaiement.EN_ATTENTE);
        if ("cancelled".equals(scenario)) payment.setStatutPaiement(StatutPaiement.ANNULE);
        if ("refunded".equals(scenario)) payment.setStatutPaiement(StatutPaiement.REMBOURSE);
        if ("noRegistration".equals(scenario)) payment.setInscription(null);
        when(users.findByEmail(member.getEmail())).thenReturn(Optional.of(member));
        when(activities.findById(10L)).thenReturn(Optional.of(publique));
        when(payments.findByActiviteId(10L)).thenReturn(List.of(payment));

        var response = service.getById(10L, member.getEmail());
        assertThat(response.isInscrit()).isFalse();
        assertThat(response.isPeutSInscrire()).isTrue();
        assertThat(response.getRaisonIndisponible()).isNull();
    }

    private SoutienFinancier registrationPayment(User member, StatutInscription registrationStatus, StatutPaiement paymentStatus) {
        publique.setGratuite(false);
        publique.setPrix(java.math.BigDecimal.TEN);
        Inscription inscription = new Inscription();
        inscription.setId(20L); inscription.setMembre(member); inscription.setActivite(publique); inscription.setStatut(registrationStatus);
        SoutienFinancier payment = new SoutienFinancier();
        payment.setId(30L); payment.setDonateur(member); payment.setActivite(publique); payment.setInscription(inscription);
        payment.setFournisseur("STRIPE"); payment.setStatutPaiement(paymentStatus);
        return payment;
    }

    private Activite activity(Long id, VisibiliteActivite visibility) {
        Activite a = new Activite();
        a.setId(id); a.setTitre("Atelier"); a.setDescription("Description"); a.setLieu("Bruxelles"); a.setCreateur(owner); a.setStatut(StatutActivite.PUBLIEE);
        a.setVisibilite(visibility); a.setCapaciteMax(1); a.setDateDebut(LocalDateTime.now().plusDays(1));
        a.setDateFin(LocalDateTime.now().plusDays(1).plusHours(1));
        return a;
    }

    private User user(Long id, Role role) {
        User u = new User(); u.setId(id); u.setRole(role); u.setEmail(id + "@test.invalid"); return u;
    }
}
