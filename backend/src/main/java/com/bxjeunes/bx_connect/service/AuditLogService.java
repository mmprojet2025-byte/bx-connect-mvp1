package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.superadmin.AuditLogResponse;
import com.bxjeunes.bx_connect.entity.AuditLog;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void log(User acteur, String action, String cibleType, User cible, String details) {
        auditLogRepository.save(AuditLog.builder()
                .acteurEmail(acteur.getEmail())
                .acteurRole(acteur.getRole().name())
                .action(action)
                .cibleType(cibleType)
                .cibleId(cible.getId())
                .cibleEmail(cible.getEmail())
                .details(details)
                .build());
    }

    public void logSystem(String action, User cible, String details) {
        auditLogRepository.save(AuditLog.builder()
                .acteurEmail("system")
                .acteurRole("SYSTEM")
                .action(action)
                .cibleType("USER")
                .cibleId(cible.getId())
                .cibleEmail(cible.getEmail())
                .details(details)
                .build());
    }

    public List<AuditLogResponse> derniersLogs() {
        return auditLogRepository.findTop50ByOrderByDateActionDesc().stream()
                .map(AuditLogResponse::fromEntity)
                .toList();
    }
}
