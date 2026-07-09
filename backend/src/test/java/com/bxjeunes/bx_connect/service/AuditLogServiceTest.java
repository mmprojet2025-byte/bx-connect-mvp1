package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.AuditLog;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    private AuditLogService auditLogService;

    @BeforeEach
    void setUp() {
        auditLogService = new AuditLogService(auditLogRepository);
    }

    @Test
    void logActionEnregistreLesChampsV2() {
        User acteur = user(1L, "admin@bx.test", Role.ADMIN, "Ada", "Admin");

        auditLogService.logAction(
                acteur,
                "GROUP_UPDATED",
                "GROUPE",
                10L,
                "Groupe Alpha",
                null,
                "Modification du groupe.",
                "{\"commune\":\"Bruxelles\"}");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        AuditLog log = captor.getValue();

        assertThat(log.getActeurId()).isEqualTo(1L);
        assertThat(log.getActeurEmail()).isEqualTo("admin@bx.test");
        assertThat(log.getActeurRole()).isEqualTo("ADMIN");
        assertThat(log.getAction()).isEqualTo("GROUP_UPDATED");
        assertThat(log.getCibleType()).isEqualTo("GROUPE");
        assertThat(log.getCibleId()).isEqualTo(10L);
        assertThat(log.getCibleNom()).isEqualTo("Groupe Alpha");
        assertThat(log.getMetadataJson()).isEqualTo("{\"commune\":\"Bruxelles\"}");
    }

    @Test
    void logStatusChangeEnregistreAncienEtNouveauStatut() {
        User acteur = user(2L, "referent@bx.test", Role.REFERENT, "Remy", "Referent");

        auditLogService.logStatusChange(
                acteur,
                "PROJECT_APPROVED",
                "PROJET",
                42L,
                "Projet STIB",
                "SOUMIS",
                "APPROUVE",
                "Projet approuve.",
                null);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        AuditLog log = captor.getValue();

        assertThat(log.getAction()).isEqualTo("PROJECT_APPROVED");
        assertThat(log.getAncienStatut()).isEqualTo("SOUMIS");
        assertThat(log.getNouveauStatut()).isEqualTo("APPROUVE");
        assertThat(log.getCibleNom()).isEqualTo("Projet STIB");
    }

    @Test
    void ancienneMethodeLogResteCompatible() {
        User acteur = user(3L, "super@bx.test", Role.SUPER_ADMIN, "Sam", "Root");
        User cible = user(4L, "admin@bx.test", Role.ADMIN, "Alice", "Admin");

        auditLogService.log(acteur, "CREATE_ADMIN", "USER", cible, "Creation admin.");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        AuditLog log = captor.getValue();

        assertThat(log.getActeurId()).isEqualTo(3L);
        assertThat(log.getCibleId()).isEqualTo(4L);
        assertThat(log.getCibleEmail()).isEqualTo("admin@bx.test");
        assertThat(log.getCibleNom()).isEqualTo("Alice Admin");
        assertThat(log.getDetails()).isEqualTo("Creation admin.");
    }

    @Test
    void rechercherDelegueLesFiltresAuRepository() {
        LocalDateTime debut = LocalDateTime.now().minusDays(1);
        LocalDateTime fin = LocalDateTime.now();
        AuditLog log = AuditLog.builder()
                .action("GROUP_VALIDATED")
                .cibleType("GROUPE")
                .acteurRole("ADMIN")
                .build();
        when(auditLogRepository.rechercher("GROUP_VALIDATED", "GROUPE", "ADMIN", debut, fin))
                .thenReturn(List.of(log));

        assertThat(auditLogService.rechercher("GROUP_VALIDATED", "GROUPE", "ADMIN", debut, fin))
                .hasSize(1)
                .first()
                .extracting("action")
                .isEqualTo("GROUP_VALIDATED");
    }

    @Test
    void rechercherPageDelegueLesFiltresEtLimiteLaTaille() {
        LocalDateTime debut = LocalDateTime.now().minusDays(1);
        LocalDateTime fin = LocalDateTime.now();
        AuditLog log = AuditLog.builder()
                .action("GROUP_VALIDATED")
                .cibleType("GROUPE")
                .acteurRole("ADMIN")
                .build();
        when(auditLogRepository.rechercherPage(
                eq("GROUP_VALIDATED"),
                eq("GROUPE"),
                eq("ADMIN"),
                eq(debut),
                eq(fin),
                any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(log)));

        var response = auditLogService.rechercherPage(
                " GROUP_VALIDATED ",
                " GROUPE ",
                " ADMIN ",
                debut,
                fin,
                0,
                500);

        assertThat(response.content()).hasSize(1);
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(auditLogRepository).rechercherPage(
                eq("GROUP_VALIDATED"),
                eq("GROUPE"),
                eq("ADMIN"),
                eq(debut),
                eq(fin),
                captor.capture());
        assertThat(captor.getValue().getPageSize()).isEqualTo(100);
        assertThat(captor.getValue().getSort().getOrderFor("dateAction").isDescending()).isTrue();
    }

    private User user(Long id, String email, Role role, String prenom, String nom) {
        return User.builder()
                .id(id)
                .email(email)
                .role(role)
                .prenom(prenom)
                .nom(nom)
                .actif(true)
                .build();
    }
}
