package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    // GET /api/notifications — Mes notifications
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> mesNotifications(Authentication auth) {
        return ResponseEntity.ok(notificationService.mesNotifications(auth.getName()));
    }

    // GET /api/notifications/count — Compteur non lues (badge)
    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> compterNonLues(Authentication auth) {
        long count = notificationService.compterNonLues(auth.getName());
        return ResponseEntity.ok(Map.of("nonLues", count));
    }

    // PATCH /api/notifications/{id}/lue — Marquer comme lue
    @PatchMapping("/{id}/lue")
    public ResponseEntity<Void> marquerLue(@PathVariable Long id, Authentication auth) {
        notificationService.marquerLue(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    // PATCH /api/notifications/toutes-lues — Tout marquer lu
    @PatchMapping("/toutes-lues")
    public ResponseEntity<Void> marquerToutesLues(Authentication auth) {
        notificationService.marquerToutesLues(auth.getName());
        return ResponseEntity.noContent().build();
    }

    // DELETE /api/notifications/{id} — Supprimer
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(@PathVariable Long id, Authentication auth) {
        notificationService.supprimer(id, auth.getName());
        return ResponseEntity.noContent().build();
    }
}
