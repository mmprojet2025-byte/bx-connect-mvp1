package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.ActiviteRequest;
import com.bxjeunes.bx_connect.dto.ActiviteResponse;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import com.bxjeunes.bx_connect.service.ActiviteService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activites")
public class ActiviteController {

    private final ActiviteService activiteService;

    public ActiviteController(ActiviteService activiteService) {
        this.activiteService = activiteService;
    }

    // ─── PUBLIC : Lister les activités publiées (V02 CDC) ───────────────────
    // Accessible sans token — visiteurs et membres
    @GetMapping
    public ResponseEntity<List<ActiviteResponse>> listerPubliees() {
        return ResponseEntity.ok(activiteService.listerPubliees());
    }

    // ─── PUBLIC : Consulter le détail d'une activité (V04 CDC) ──────────────
    @GetMapping("/{id}")
    public ResponseEntity<ActiviteResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(activiteService.getById(id));
    }

    // ─── PUBLIC : Recherche par mot-clé (V06 / M16 CDC) ────────────────────
    @GetMapping("/recherche")
    public ResponseEntity<List<ActiviteResponse>> rechercher(@RequestParam String q) {
        return ResponseEntity.ok(activiteService.rechercher(q));
    }

    // ─── ADMIN/REFERENT : Lister toutes les activités (tous statuts) ────────
    @GetMapping("/admin/toutes")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'REFERENT')")
    public ResponseEntity<List<ActiviteResponse>> listerToutes() {
        return ResponseEntity.ok(activiteService.listerToutes());
    }

    // ─── ADMIN/REFERENT : Créer une activité (R01 / A04 CDC) ────────────────
    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'REFERENT')")
    public ResponseEntity<ActiviteResponse> creer(
            @Valid @RequestBody ActiviteRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        ActiviteResponse response = activiteService.creer(request, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ─── ADMIN/REFERENT : Modifier une activité (R02 / A05 CDC) ────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'REFERENT')")
    public ResponseEntity<ActiviteResponse> modifier(
            @PathVariable Long id,
            @Valid @RequestBody ActiviteRequest request) {
        return ResponseEntity.ok(activiteService.modifier(id, request));
    }

    // ─── ADMIN/REFERENT : Changer le statut (publier, annuler...) ───────────
    @PatchMapping("/{id}/statut")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'REFERENT')")
    public ResponseEntity<ActiviteResponse> changerStatut(
            @PathVariable Long id,
            @RequestParam StatutActivite statut) {
        return ResponseEntity.ok(activiteService.changerStatut(id, statut));
    }

    // ─── ADMIN/REFERENT : Supprimer une activité (R03 / A06 CDC) ────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'REFERENT')")
    public ResponseEntity<Void> supprimer(@PathVariable Long id) {
        activiteService.supprimer(id);
        return ResponseEntity.noContent().build();
    }
}