package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.InscriptionRequest;
import com.bxjeunes.bx_connect.dto.InscriptionResponse;
import com.bxjeunes.bx_connect.service.InscriptionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inscriptions")
public class InscriptionController {

    private final InscriptionService inscriptionService;

    public InscriptionController(InscriptionService inscriptionService) {
        this.inscriptionService = inscriptionService;
    }

    // ─── MEMBRE : S'inscrire à une activité (M06 CDC) ───────────────────────
    @PostMapping
    @PreAuthorize("hasRole('MEMBRE')")
    public ResponseEntity<InscriptionResponse> inscrire(
            @Valid @RequestBody InscriptionRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        InscriptionResponse response = inscriptionService.inscrire(request, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ─── MEMBRE : Voir ses inscriptions (M11 CDC) ────────────────────────────
    @GetMapping("/mes-inscriptions")
    @PreAuthorize("hasRole('MEMBRE')")
    public ResponseEntity<List<InscriptionResponse>> mesInscriptions(
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(inscriptionService.mesInscriptions(email));
    }

    // ─── MEMBRE : Annuler son inscription (M12 CDC) ──────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MEMBRE')")
    public ResponseEntity<InscriptionResponse> annuler(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(inscriptionService.annuler(id, email));
    }

    // ─── ADMIN/REFERENT : Voir toutes les inscriptions d'une activité ────────
    @GetMapping("/activite/{activiteId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'REFERENT')")
    public ResponseEntity<List<InscriptionResponse>> inscriptionsParActivite(
            @PathVariable Long activiteId,
            Authentication authentication) {
        return ResponseEntity.ok(inscriptionService.inscriptionsParActivite(
                activiteId,
                authentication.getName()
        ));
    }
}
