package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.PagedResponse;
import com.bxjeunes.bx_connect.dto.superadmin.AuditLogResponse;
import com.bxjeunes.bx_connect.entity.AuditLog;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.AuditLogRepository;
import com.bxjeunes.bx_connect.util.PaginationUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    public static final Set<String> SUPER_ADMIN_ADMIN_ACTIONS = Set.of(
            "CREATE_ADMIN",
            "DISABLE_ADMIN",
            "ENABLE_ADMIN",
            "RESET_ADMIN_PASSWORD");
    public static final String SUPER_ADMIN_BOOTSTRAP_ACTION = "BOOTSTRAP_SUPER_ADMIN_CREATED";
    private static final Set<String> SUPER_ADMIN_TECHNICAL_ACTIONS = Set.of(
            "CREATE_ADMIN",
            "DISABLE_ADMIN",
            "ENABLE_ADMIN",
            "RESET_ADMIN_PASSWORD",
            SUPER_ADMIN_BOOTSTRAP_ACTION);
    private static final String TECHNICAL_CIBLE_TYPE = "USER";
    private static final String SUPER_ADMIN_ROLE = "SUPER_ADMIN";
    private static final String SYSTEM_ROLE = "SYSTEM";

    private final AuditLogRepository auditLogRepository;

    public void log(User acteur, String action, String cibleType, User cible, String details) {
        logAction(
                acteur,
                action,
                cibleType,
                cible.getId(),
                nomUtilisateur(cible),
                cible.getEmail(),
                details,
                null);
    }

    public void logAction(
            User acteur,
            String action,
            String cibleType,
            Long cibleId,
            String cibleNom,
            String cibleEmail,
            String details) {
        logAction(acteur, action, cibleType, cibleId, cibleNom, cibleEmail, details, null);
    }

    public void logAction(
            User acteur,
            String action,
            String cibleType,
            Long cibleId,
            String cibleNom,
            String cibleEmail,
            String details,
            String metadataJson) {
        auditLogRepository.save(AuditLog.builder()
                .acteurId(acteur != null ? acteur.getId() : null)
                .acteurEmail(acteur != null ? acteur.getEmail() : "system")
                .acteurRole(acteur != null ? acteur.getRole().name() : "SYSTEM")
                .action(action)
                .cibleType(cibleType)
                .cibleId(cibleId)
                .cibleNom(cibleNom)
                .cibleEmail(cibleEmail)
                .details(details)
                .metadataJson(metadataJson)
                .build());
    }

    public void logStatusChange(
            User acteur,
            String action,
            String cibleType,
            Long cibleId,
            String cibleNom,
            String ancienStatut,
            String nouveauStatut,
            String details,
            String metadataJson) {
        auditLogRepository.save(AuditLog.builder()
                .acteurId(acteur != null ? acteur.getId() : null)
                .acteurEmail(acteur != null ? acteur.getEmail() : "system")
                .acteurRole(acteur != null ? acteur.getRole().name() : "SYSTEM")
                .action(action)
                .cibleType(cibleType)
                .cibleId(cibleId)
                .cibleNom(cibleNom)
                .ancienStatut(ancienStatut)
                .nouveauStatut(nouveauStatut)
                .details(details)
                .metadataJson(metadataJson)
                .build());
    }

    public void logSystem(String action, User cible, String details) {
        logSystem(
                action,
                "USER",
                cible.getId(),
                nomUtilisateur(cible),
                cible.getEmail(),
                details,
                null);
    }

    public void logSystem(
            String action,
            String cibleType,
            Long cibleId,
            String cibleNom,
            String cibleEmail,
            String details,
            String metadataJson) {
        auditLogRepository.save(AuditLog.builder()
                .acteurEmail("system")
                .acteurRole("SYSTEM")
                .action(action)
                .cibleType(cibleType)
                .cibleId(cibleId)
                .cibleNom(cibleNom)
                .cibleEmail(cibleEmail)
                .details(details)
                .metadataJson(metadataJson)
                .build());
    }

    public List<AuditLogResponse> derniersLogs() {
        return rechercherTechnicalLogs(null, null, null, null, null, 0, 50).content();
    }

    public long compterActionsTechniques() {
        return auditLogRepository.countTechnicalLogs(
                SUPER_ADMIN_ADMIN_ACTIONS,
                SUPER_ADMIN_BOOTSTRAP_ACTION,
                TECHNICAL_CIBLE_TYPE,
                SUPER_ADMIN_ROLE,
                SYSTEM_ROLE);
    }

    public List<AuditLogResponse> rechercher(
            String action,
            String cibleType,
            String acteurRole,
            LocalDateTime dateDebut,
            LocalDateTime dateFin) {
        return rechercher(action, cibleType, acteurRole, dateDebut, dateFin, 100);
    }

    public List<AuditLogResponse> rechercher(
            String action,
            String cibleType,
            String acteurRole,
            LocalDateTime dateDebut,
            LocalDateTime dateFin,
            int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 200));
        return rechercherTechnicalLogs(action, cibleType, acteurRole, dateDebut, dateFin, 0, safeLimit).content();
    }

    public PagedResponse<AuditLogResponse> rechercherPage(
            String action,
            String cibleType,
            String acteurRole,
            LocalDateTime dateDebut,
            LocalDateTime dateFin,
            int page,
            int size) {
        return rechercherTechnicalLogs(action, cibleType, acteurRole, dateDebut, dateFin, page, size);
    }

    private PagedResponse<AuditLogResponse> rechercherTechnicalLogs(
            String action,
            String cibleType,
            String acteurRole,
            LocalDateTime dateDebut,
            LocalDateTime dateFin,
            int page,
            int size) {
        String normalizedAction = normaliser(action);
        String normalizedCibleType = normaliser(cibleType);
        String normalizedActeurRole = normaliser(acteurRole);
        if ((normalizedAction != null && !SUPER_ADMIN_TECHNICAL_ACTIONS.contains(normalizedAction))
                || (normalizedCibleType != null && !TECHNICAL_CIBLE_TYPE.equals(normalizedCibleType))
                || (normalizedActeurRole != null
                    && !SUPER_ADMIN_ROLE.equals(normalizedActeurRole)
                    && !SYSTEM_ROLE.equals(normalizedActeurRole))) {
            return emptyPage(page, size);
        }

        return PagedResponse.fromPage(auditLogRepository.rechercherTechnicalLogs(
                SUPER_ADMIN_ADMIN_ACTIONS,
                SUPER_ADMIN_BOOTSTRAP_ACTION,
                TECHNICAL_CIBLE_TYPE,
                SUPER_ADMIN_ROLE,
                SYSTEM_ROLE,
                normalizedAction,
                normalizedCibleType,
                normalizedActeurRole,
                dateDebut,
                dateFin,
                PaginationUtils.pageRequest(page, size, Sort.by(Sort.Direction.DESC, "dateAction")))
                .map(AuditLogResponse::fromEntity));
    }

    private PagedResponse<AuditLogResponse> emptyPage(int page, int size) {
        var pageable = PaginationUtils.pageRequest(page, size, Sort.by(Sort.Direction.DESC, "dateAction"));
        return new PagedResponse<>(List.of(), pageable.getPageNumber(), pageable.getPageSize(), 0, 0, true);
    }

    private String normaliser(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String nomUtilisateur(User user) {
        String nomComplet = ((user.getPrenom() == null ? "" : user.getPrenom()) + " "
                + (user.getNom() == null ? "" : user.getNom())).trim();
        return nomComplet.isBlank() ? user.getEmail() : nomComplet;
    }
}
