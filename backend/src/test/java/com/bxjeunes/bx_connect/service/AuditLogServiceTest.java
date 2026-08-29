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
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
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
    void rechercherDelegueUniquementLesFiltresTechniquesAuRepository() {
        LocalDateTime debut = LocalDateTime.now().minusDays(1);
        LocalDateTime fin = LocalDateTime.now();
        AuditLog log = AuditLog.builder()
                .action("CREATE_ADMIN")
                .cibleType("USER")
                .acteurRole("SUPER_ADMIN")
                .build();
        when(auditLogRepository.rechercherTechnicalLogs(
                eq(AuditLogService.SUPER_ADMIN_ADMIN_ACTIONS),
                eq(AuditLogService.SUPER_ADMIN_BOOTSTRAP_ACTION),
                eq("USER"),
                eq("SUPER_ADMIN"),
                eq("SYSTEM"),
                eq("CREATE_ADMIN"),
                eq("USER"),
                eq("SUPER_ADMIN"),
                eq(debut),
                eq(fin),
                any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(log)));

        assertThat(auditLogService.rechercher("CREATE_ADMIN", "USER", "SUPER_ADMIN", debut, fin))
                .hasSize(1)
                .first()
                .extracting("action")
                .isEqualTo("CREATE_ADMIN");
    }

    @Test
    void filtresMetierNeContournentJamaisLaListeBlanche() {
        assertThat(auditLogService.rechercher(
                "PROJECT_APPROVED", "PROJECT", "ADMIN", null, null)).isEmpty();
        assertThat(auditLogService.rechercher(
                null, null, "MEMBRE", null, null)).isEmpty();
        assertThat(auditLogService.rechercher(
                null, null, "REFERENT", null, null)).isEmpty();
        assertThat(auditLogService.rechercher(
                null, null, "PARTENAIRE", null, null)).isEmpty();

        verify(auditLogRepository, never()).rechercherTechnicalLogs(
                anyCollection(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class));
    }

    @Test
    void rechercherPageTechniqueLimiteLaTaille() {
        LocalDateTime debut = LocalDateTime.now().minusDays(1);
        LocalDateTime fin = LocalDateTime.now();
        AuditLog log = AuditLog.builder()
                .action("RESET_ADMIN_PASSWORD")
                .cibleType("USER")
                .acteurRole("SUPER_ADMIN")
                .build();
        when(auditLogRepository.rechercherTechnicalLogs(
                eq(AuditLogService.SUPER_ADMIN_ADMIN_ACTIONS),
                eq(AuditLogService.SUPER_ADMIN_BOOTSTRAP_ACTION),
                eq("USER"),
                eq("SUPER_ADMIN"),
                eq("SYSTEM"),
                eq("RESET_ADMIN_PASSWORD"),
                eq("USER"),
                eq("SUPER_ADMIN"),
                eq(debut),
                eq(fin),
                any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(log)));

        var response = auditLogService.rechercherPage(
                " RESET_ADMIN_PASSWORD ",
                " USER ",
                " SUPER_ADMIN ",
                debut,
                fin,
                0,
                500);

        assertThat(response.content()).hasSize(1);
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(auditLogRepository).rechercherTechnicalLogs(
                eq(AuditLogService.SUPER_ADMIN_ADMIN_ACTIONS),
                eq(AuditLogService.SUPER_ADMIN_BOOTSTRAP_ACTION),
                eq("USER"),
                eq("SUPER_ADMIN"),
                eq("SYSTEM"),
                eq("RESET_ADMIN_PASSWORD"),
                eq("USER"),
                eq("SUPER_ADMIN"),
                eq(debut),
                eq(fin),
                captor.capture());
        assertThat(captor.getValue().getPageSize()).isEqualTo(100);
        assertThat(captor.getValue().getSort().getOrderFor("dateAction").isDescending()).isTrue();
    }

    @Test
    void dtoTechniqueNeTransmetAucuneDonneePersonnelleOuMetier() {
        AuditLog log = AuditLog.builder()
                .id(99L)
                .acteurId(1L)
                .acteurEmail("super@bx.test")
                .acteurRole("SUPER_ADMIN")
                .action("DISABLE_ADMIN")
                .cibleType("USER")
                .cibleId(2L)
                .cibleNom("Identite interdite")
                .cibleEmail("identite@bx.test")
                .ancienStatut("ACTIF")
                .nouveauStatut("INACTIF")
                .metadataJson("{\"businessId\":42}")
                .details("Detail libre interdit")
                .dateAction(LocalDateTime.now())
                .build();

        var response = com.bxjeunes.bx_connect.dto.superadmin.AuditLogResponse.fromEntity(log);

        assertThat(response.getId()).isEqualTo(99L);
        assertThat(response.getAction()).isEqualTo("DISABLE_ADMIN");
        assertThat(response.getActeurRole()).isEqualTo("SUPER_ADMIN");
        assertThat(response.getCibleType()).isEqualTo("USER");
        assertThat(response.getClass().getDeclaredFields())
                .extracting("name")
                .containsExactlyInAnyOrder("id", "acteurRole", "action", "cibleType", "dateAction");
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
