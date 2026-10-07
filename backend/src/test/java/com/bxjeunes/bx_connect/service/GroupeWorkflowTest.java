package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

@ExtendWith(MockitoExtension.class)
class GroupeWorkflowTest {
    @Mock GroupeRepository groups;
    @Mock MembreGroupeRepository memberships;
    @Mock UserRepository users;
    @Mock NotificationService notifications;
    @Mock AuditLogService audit;
    @InjectMocks GroupeService service;
    User referent, member;
    Groupe group;
    MembreGroupe membership;

    @BeforeEach void setup() {
        referent = new User(); referent.setId(1L); referent.setRole(Role.REFERENT); referent.setEmail("ref@test.be");
        member = new User(); member.setId(2L); member.setRole(Role.MEMBRE); member.setEmail("member@test.be"); member.setActif(true);
        group = new Groupe(); group.setId(10L); group.setNom("Groupe"); group.setReferent(referent); group.setStatut(StatutGroupe.VALIDE); group.setActif(true);
        membership = new MembreGroupe(member, group); membership.setId(20L);
        lenient().when(users.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        lenient().when(users.findByEmail(member.getEmail())).thenReturn(Optional.of(member));
        lenient().when(users.findByIdForUpdate(2L)).thenReturn(Optional.of(member));
        lenient().when(groups.findById(10L)).thenReturn(Optional.of(group));
        lenient().when(groups.findByIdForUpdate(10L)).thenReturn(Optional.of(group));
        lenient().when(memberships.findByIdForUpdate(20L)).thenReturn(Optional.of(membership));
        lenient().when(memberships.findByUserIdAndGroupeId(2L, 10L)).thenReturn(Optional.of(membership));
        lenient().when(memberships.save(any())).thenAnswer(i -> i.getArgument(0));
        lenient().when(groups.save(any())).thenAnswer(i -> i.getArgument(0));
    }
    @Test void adminRequestRequiresNameReferentAndNonNegativeCapacity() {
        try (var factory = jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            var request = new com.bxjeunes.bx_connect.dto.admin.AdminGroupeRequest();
            request.setCapaciteMax(-1);
            assertThat(factory.getValidator().validate(request)).extracting(v -> v.getPropertyPath().toString())
                    .contains("nom", "referentId", "capaciteMax");
            request.setNom("Groupe"); request.setReferentId(1L); request.setCapaciteMax(0);
            assertThat(factory.getValidator().validate(request)).isEmpty();
        }
    }
    @Test void ownerAcceptsPendingRequest() {
        assertThat(service.accepterAdhesion(20L, referent.getEmail()).getStatut()).isEqualTo(StatutMembre.ACCEPTE);
    }
    @Test void ownerRefusesPendingRequest() {
        assertThat(service.refuserAdhesion(20L, referent.getEmail()).getStatut()).isEqualTo(StatutMembre.REFUSE);
    }
    @ParameterizedTest @EnumSource(value=StatutMembre.class, names={"ACCEPTE","REFUSE","QUITTE","SUSPENDU"})
    void processedRequestsCannotBeAcceptedOrRefusedAgain(StatutMembre status) {
        membership.setStatut(status);
        assertThatThrownBy(() -> service.accepterAdhesion(20L, referent.getEmail())).hasMessageContaining("plus en attente");
        assertThatThrownBy(() -> service.refuserAdhesion(20L, referent.getEmail())).hasMessageContaining("plus en attente");
        verify(memberships, never()).save(any());
    }
    @Test void suspensionAndReactivationNeverChangeAccount() {
        membership.setStatut(StatutMembre.ACCEPTE);
        assertThat(service.changerAppartenance(20L, referent.getEmail(), false).getStatut()).isEqualTo(StatutMembre.SUSPENDU);
        assertThat(member.isActif()).isTrue();
        assertThat(service.changerAppartenance(20L, referent.getEmail(), true).getStatut()).isEqualTo(StatutMembre.ACCEPTE);
        verify(users, never()).save(any());
    }
    @Test void suspensionRequiresAcceptedMembership() {
        assertThatThrownBy(() -> service.changerAppartenance(20L, referent.getEmail(), false)).hasMessageContaining("Transition");
    }
    @Test void reactivationRequiresSuspendedMembership() {
        membership.setStatut(StatutMembre.REFUSE);
        assertThatThrownBy(() -> service.changerAppartenance(20L, referent.getEmail(), true)).hasMessageContaining("Transition");
    }
    @Test void anotherReferentCannotDecideOrSuspend() {
        User other = new User(); other.setId(99L); other.setRole(Role.REFERENT);
        when(users.findByEmail("other@test.be")).thenReturn(Optional.of(other));
        assertThatThrownBy(() -> service.accepterAdhesion(20L, "other@test.be")).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.refuserAdhesion(20L, "other@test.be")).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.changerAppartenance(20L, "other@test.be", false)).isInstanceOf(AccessDeniedException.class);
    }
    @Test void acceptanceAndReactivationEnforceCapacity() {
        group.setCapaciteMax(1);
        when(memberships.countByGroupeIdAndStatut(10L, StatutMembre.ACCEPTE)).thenReturn(1L);
        assertThatThrownBy(() -> service.accepterAdhesion(20L, referent.getEmail())).hasMessageContaining("capacité");
        membership.setStatut(StatutMembre.SUSPENDU);
        assertThatThrownBy(() -> service.changerAppartenance(20L, referent.getEmail(), true)).hasMessageContaining("capacité");
    }
    @Test void reactivationCannotCreateTwoActiveMemberships() {
        membership.setStatut(StatutMembre.SUSPENDU);
        Groupe other = new Groupe(); other.setId(11L);
        when(memberships.findFirstByUserIdAndStatut(2L, StatutMembre.ACCEPTE)).thenReturn(Optional.of(new MembreGroupe(member, other)));
        assertThatThrownBy(() -> service.changerAppartenance(20L, referent.getEmail(), true)).hasMessageContaining("autre groupe");
    }
    @Test void archivePreservesMembershipsAndNeverDeletesGroup() {
        group.getMembres().add(membership);
        service.supprimerGroupe(10L);
        assertThat(group.getStatut()).isEqualTo(StatutGroupe.ARCHIVE);
        assertThat(group.isActif()).isFalse();
        assertThat(group.getMembres()).containsExactly(membership);
        verify(groups, never()).deleteById(anyLong());
        verifyNoInteractions(memberships);
    }
    @Test void archivedGroupRejectsMembershipOperations() {
        group.setStatut(StatutGroupe.ARCHIVE); group.setActif(false);
        assertThatThrownBy(() -> service.rejoindreGroupe(10L, member.getEmail())).hasMessageContaining("pas disponible");
        assertThatThrownBy(() -> service.accepterAdhesion(20L, referent.getEmail())).hasMessageContaining("pas actif");
        assertThatThrownBy(() -> service.refuserAdhesion(20L, referent.getEmail())).hasMessageContaining("pas actif");
        assertThatThrownBy(() -> service.changerAppartenance(20L, referent.getEmail(), true)).hasMessageContaining("pas actif");
    }
    @Test void leavingPreservesMembershipAndAllowsNewRequestWithSameId() {
        membership.setStatut(StatutMembre.ACCEPTE);
        service.quitterGroupe(10L, member.getEmail());
        assertThat(membership.getStatut()).isEqualTo(StatutMembre.QUITTE);
        assertThat(service.rejoindreGroupe(10L, member.getEmail()).getId()).isEqualTo(20L);
        assertThat(membership.getStatut()).isEqualTo(StatutMembre.EN_ATTENTE);
        verify(memberships, never()).delete(any());
    }
    @ParameterizedTest @EnumSource(value=StatutGroupe.class, names={"VALIDE","REFUSE","ARCHIVE"})
    void groupDecisionRequiresPendingStatus(StatutGroupe status) {
        group.setStatut(status);
        assertThatThrownBy(() -> service.validerGroupe(10L)).hasMessageContaining("plus en attente");
        assertThatThrownBy(() -> service.refuserGroupe(10L,"motif")).hasMessageContaining("plus en attente");
    }
    @Test void validButInactiveGroupCannotBeReadPublicly() {
        group.setActif(false);
        assertThatThrownBy(() -> service.getGroupePublic(10L)).hasMessageContaining("introuvable");
    }
}
