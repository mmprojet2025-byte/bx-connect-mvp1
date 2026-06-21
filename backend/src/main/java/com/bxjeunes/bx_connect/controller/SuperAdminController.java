package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.superadmin.AdminResponse;
import com.bxjeunes.bx_connect.dto.superadmin.AuditLogResponse;
import com.bxjeunes.bx_connect.dto.superadmin.CreateAdminRequest;
import com.bxjeunes.bx_connect.dto.superadmin.ResetAdminPasswordRequest;
import com.bxjeunes.bx_connect.dto.superadmin.SuperAdminDashboardResponse;
import com.bxjeunes.bx_connect.dto.UserResponse;
import com.bxjeunes.bx_connect.service.AuditLogService;
import com.bxjeunes.bx_connect.service.SuperAdminService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/super-admin")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
public class SuperAdminController {

    private final SuperAdminService superAdminService;
    private final AuditLogService auditLogService;

    @GetMapping("/dashboard")
    public ResponseEntity<SuperAdminDashboardResponse> dashboard() {
        return ResponseEntity.ok(superAdminService.dashboard());
    }

    @GetMapping("/admins")
    public ResponseEntity<List<AdminResponse>> listerAdmins() {
        return ResponseEntity.ok(superAdminService.listerAdmins());
    }

    @GetMapping("/utilisateurs")
    public ResponseEntity<List<UserResponse>> listerUtilisateursMetier() {
        return ResponseEntity.ok(superAdminService.listerUtilisateursMetier());
    }

    @PostMapping("/admins")
    public ResponseEntity<AdminResponse> creerAdmin(
            @Valid @RequestBody CreateAdminRequest request,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(superAdminService.creerAdmin(request, auth.getName()));
    }

    @PatchMapping("/admins/{id}/disable")
    public ResponseEntity<AdminResponse> desactiverAdmin(
            @PathVariable Long id,
            Authentication auth) {
        return ResponseEntity.ok(superAdminService.desactiverAdmin(id, auth.getName()));
    }

    @PatchMapping("/admins/{id}/enable")
    public ResponseEntity<AdminResponse> reactiverAdmin(
            @PathVariable Long id,
            Authentication auth) {
        return ResponseEntity.ok(superAdminService.reactiverAdmin(id, auth.getName()));
    }

    @PatchMapping("/admins/{id}/reset-password")
    public ResponseEntity<AdminResponse> resetPasswordAdmin(
            @PathVariable Long id,
            @Valid @RequestBody ResetAdminPasswordRequest request,
            Authentication auth) {
        return ResponseEntity.ok(superAdminService.resetPasswordAdmin(id, request, auth.getName()));
    }

    @GetMapping("/logs")
    public ResponseEntity<List<AuditLogResponse>> logs() {
        return ResponseEntity.ok(auditLogService.derniersLogs());
    }

    @GetMapping("/logs/search")
    public ResponseEntity<List<AuditLogResponse>> rechercherLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String cibleType,
            @RequestParam(required = false) String acteurRole,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateDebut,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateFin,
            @RequestParam(defaultValue = "100") int limit) {
        return ResponseEntity.ok(auditLogService.rechercher(
                action,
                cibleType,
                acteurRole,
                dateDebut,
                dateFin,
                limit));
    }
}
