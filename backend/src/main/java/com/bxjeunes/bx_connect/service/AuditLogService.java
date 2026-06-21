package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.superadmin.AuditLogResponse;
import com.bxjeunes.bx_connect.entity.AuditLog;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

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
        return auditLogRepository.findTop50ByOrderByDateActionDesc().stream()
                .map(AuditLogResponse::fromEntity)
                .toList();
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
        return auditLogRepository.rechercher(
                        normaliser(action),
                        normaliser(cibleType),
                        normaliser(acteurRole),
                        dateDebut,
                        dateFin)
                .stream()
                .limit(safeLimit)
                .map(AuditLogResponse::fromEntity)
                .toList();
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
