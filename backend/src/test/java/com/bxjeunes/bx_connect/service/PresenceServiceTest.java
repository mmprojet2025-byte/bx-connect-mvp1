package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.PresenceBulkRequest;
import com.bxjeunes.bx_connect.dto.PresenceRequest;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PresenceServiceTest {
    @Mock InscriptionRepository inscriptions;
    @Mock ActiviteRepository activites;
    @Mock UserRepository users;
    @Mock AuditLogService audit;
    @InjectMocks PresenceService service;
    User owner;
    Activite activity;
    Inscription active;

    @BeforeEach
    void setup() {
        owner = new User(); owner.setId(1L); owner.setRole(Role.REFERENT); owner.setEmail("referent@test.be");
        activity = new Activite(); activity.setId(42L); activity.setCreateur(owner);
        activity.setStatut(StatutActivite.PUBLIEE); activity.setDateDebut(LocalDateTime.now().minusMinutes(1));
        active = new Inscription(); active.setId(10L); active.setActivite(activity);
        active.setStatut(StatutInscription.CONFIRMEE);
        when(users.findByEmail(owner.getEmail())).thenReturn(Optional.of(owner));
    }

    private void writableActivity() {
        when(activites.findByIdForUpdate(42L)).thenReturn(Optional.of(activity));
    }

    private PresenceRequest request() {
        PresenceRequest request = new PresenceRequest(); request.setStatutPresence(StatutPresence.PRESENT);
        return request;
    }

    private PresenceBulkRequest bulk() {
        var item = new PresenceBulkRequest.PresenceBulkItemRequest();
        item.setInscriptionId(10L); item.setStatutPresence(StatutPresence.PRESENT);
        var bulk = new PresenceBulkRequest(); bulk.setPresences(List.of(item)); return bulk;
    }

    private void allWritesRefused(Class<? extends Throwable> error) {
        assertThatThrownBy(() -> service.modifierPresence(42L, 10L, request(), owner.getEmail())).isInstanceOf(error);
        assertThatThrownBy(() -> service.modifierPresencesBulk(42L, bulk(), owner.getEmail())).isInstanceOf(error);
        assertThatThrownBy(() -> service.cloturerPresences(42L, owner.getEmail())).isInstanceOf(error);
        verify(inscriptions, never()).save(any());
    }

    @ParameterizedTest
    @EnumSource(value = StatutActivite.class, names = {"BROUILLON", "ANNULEE", "TERMINEE"})
    void nonPublishedActivitiesRejectEveryWrite(StatutActivite status) {
        writableActivity(); activity.setStatut(status); allWritesRefused(IllegalArgumentException.class);
    }

    @Test
    void futureActivityRejectsEveryWrite() {
        writableActivity(); activity.setDateDebut(LocalDateTime.now().plusDays(1));
        allWritesRefused(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @EnumSource(value = Role.class, names = {"MEMBRE", "PARTENAIRE", "SUPER_ADMIN"})
    void otherRolesCannotReadOrWrite(Role role) {
        owner.setRole(role);
        if (role != Role.SUPER_ADMIN) {
            writableActivity(); when(activites.findById(42L)).thenReturn(Optional.of(activity));
        }
        allWritesRefused(AccessDeniedException.class);
        assertThatThrownBy(() -> service.listerPresences(42L, owner.getEmail())).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void nonOwnerCannotReadOrWrite() {
        writableActivity(); when(activites.findById(42L)).thenReturn(Optional.of(activity));
        User other = new User(); other.setId(2L); activity.setCreateur(other);
        allWritesRefused(AccessDeniedException.class);
        assertThatThrownBy(() -> service.listerPresences(42L, owner.getEmail())).isInstanceOf(AccessDeniedException.class);
    }

    @ParameterizedTest
    @EnumSource(value = Role.class, names = {"REFERENT", "ADMIN"})
    void startedActivityCanBeSavedAndValidatedWithoutEndingActivity(Role role) {
        owner.setRole(role); writableActivity();
        when(inscriptions.findByActiviteId(42L)).thenReturn(List.of(active));
        when(inscriptions.findByIdAndActiviteId(10L, 42L)).thenReturn(Optional.of(active));
        when(inscriptions.save(any())).thenAnswer(call -> call.getArgument(0));
        assertThat(service.modifierPresencesBulk(42L, bulk(), owner.getEmail()).getFirst().getStatutPresence()).isEqualTo(StatutPresence.PRESENT);
        assertThat(service.cloturerPresences(42L, owner.getEmail()).getFirst().getDateValidationPresence()).isNotNull();
        assertThat(activity.getStatut()).isEqualTo(StatutActivite.PUBLIEE);
    }

    @Test
    void cancelledRegistrationCannotBeEdited() {
        writableActivity(); active.setStatut(StatutInscription.ANNULEE);
        when(inscriptions.findByIdAndActiviteId(10L, 42L)).thenReturn(Optional.of(active));
        assertThatThrownBy(() -> service.modifierPresence(42L, 10L, request(), owner.getEmail())).hasMessageContaining("annulee");
        assertThatThrownBy(() -> service.modifierPresencesBulk(42L, bulk(), owner.getEmail())).hasMessageContaining("annulee");
        verify(inscriptions, never()).save(any());
    }

    @Test
    void absentRegistrationCannotBeAdded() {
        writableActivity();
        assertThatThrownBy(() -> service.modifierPresence(42L, 10L, request(), owner.getEmail())).hasMessageContaining("Inscription introuvable");
        assertThatThrownBy(() -> service.modifierPresencesBulk(42L, bulk(), owner.getEmail())).hasMessageContaining("Inscription introuvable");
        verify(inscriptions, never()).save(any());
    }

    @Test
    void incompleteSheetCannotBeValidated() {
        writableActivity(); when(inscriptions.findByActiviteId(42L)).thenReturn(List.of(active));
        assertThatThrownBy(() -> service.cloturerPresences(42L, owner.getEmail())).isInstanceOf(IllegalArgumentException.class);
        assertThat(active.getDateValidationPresence()).isNull(); verify(inscriptions, never()).save(any());
    }

    @Test
    void cancelledUnspecifiedRegistrationIsIgnoredAndExcludedFromAuditCount() {
        writableActivity(); active.setStatutPresence(StatutPresence.EXCUSE);
        Inscription cancelled = new Inscription(); cancelled.setStatut(StatutInscription.ANNULEE);
        when(inscriptions.findByActiviteId(42L)).thenReturn(List.of(active, cancelled));
        when(inscriptions.save(active)).thenReturn(active);
        assertThat(service.cloturerPresences(42L, owner.getEmail())).hasSize(1);
        assertThat(cancelled.getDateValidationPresence()).isNull();
        verify(audit).logStatusChange(any(), eq("ACTIVITY_ATTENDANCE_VALIDATED"), any(), any(), any(), any(), any(), any(), eq("{\"totalInscriptions\":1}"));
    }

    @Test
    void validatedSheetCannotBeEditedOrValidatedAgainButRemainsReadable() {
        writableActivity(); active.setDateValidationPresence(LocalDateTime.now());
        when(inscriptions.existsByActiviteIdAndDateValidationPresenceIsNotNull(42L)).thenReturn(true);
        when(inscriptions.findByActiviteId(42L)).thenReturn(List.of(active));
        when(activites.findById(42L)).thenReturn(Optional.of(activity));
        allWritesRefused(IllegalArgumentException.class);
        activity.setStatut(StatutActivite.TERMINEE);
        assertThat(service.listerPresences(42L, owner.getEmail())).hasSize(1);
    }

    @Test
    void sheetWithoutActiveRegistrationsCannotBeValidated() {
        writableActivity(); active.setStatut(StatutInscription.ANNULEE);
        when(inscriptions.findByActiviteId(42L)).thenReturn(List.of(active));
        assertThatThrownBy(() -> service.cloturerPresences(42L, owner.getEmail())).hasMessageContaining("Aucune inscription active");
    }
}
