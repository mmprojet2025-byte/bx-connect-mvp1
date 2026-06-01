package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.*;
import com.bxjeunes.bx_connect.entity.StatutProjet;
import com.bxjeunes.bx_connect.service.ProjetService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projets")
public class ProjetController {

    private final ProjetService projetService;

    public ProjetController(ProjetService projetService) {
        this.projetService = projetService;
    }

    // ─── GET /api/projets — Liste publique (APPROUVE, EN_COURS, TERMINE) ─────

    @GetMapping
    public ResponseEntity<List<ProjetResponse>> listerProjetsPublics() {
        return ResponseEntity.ok(projetService.listerProjetsPublics());
    }

    // ─── GET /api/projets/admin/tous — Tous les projets (ADMIN / REFERENT) ───

    @GetMapping("/admin/tous")
    @PreAuthorize("hasAnyRole('ADMIN', 'REFERENT')")
    public ResponseEntity<List<ProjetResponse>> listerTousProjets() {
        return ResponseEntity.ok(projetService.listerTousProjets());
    }

    // ─── GET /api/projets/admin/soumis — Projets en attente de validation ────

    @GetMapping("/admin/soumis")
    @PreAuthorize("hasAnyRole('ADMIN', 'REFERENT')")
    public ResponseEntity<List<ProjetResponse>> projetsSoumis() {
        return ResponseEntity.ok(projetService.projetsSoumis());
    }

    // ─── GET /api/projets/{id} — Détail d'un projet ──────────────────────────

    @GetMapping("/{id}")
    public ResponseEntity<ProjetResponse> getProjet(@PathVariable Long id) {
        return ResponseEntity.ok(projetService.getProjet(id));
    }

    // ─── POST /api/projets — Proposer un projet (M24) ────────────────────────

    @PostMapping
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<ProjetResponse> proposerProjet(
            @Valid @RequestBody ProjetRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projetService.proposerProjet(request, authentication.getName()));
    }

    // ─── PUT /api/projets/{id} — Modifier un projet ───────────────────────────

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<ProjetResponse> modifierProjet(
            @PathVariable Long id,
            @Valid @RequestBody ProjetRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(projetService.modifierProjet(id, request, authentication.getName()));
    }

    // ─── PATCH /api/projets/{id}/soumettre — Soumettre pour validation ────────

    @PatchMapping("/{id}/soumettre")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<ProjetResponse> soumettreProjet(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(projetService.soumettreProjet(id, authentication.getName()));
    }

    // ─── PATCH /api/projets/{id}/valider — Approuver ou rejeter (A09, R13) ───

    @PatchMapping("/{id}/valider")
    @PreAuthorize("hasAnyRole('ADMIN', 'REFERENT')")
    public ResponseEntity<ProjetResponse> validerProjet(
            @PathVariable Long id,
            @RequestParam boolean approuver,
            @RequestParam(required = false) String commentaire,
            Authentication authentication) {
        return ResponseEntity.ok(projetService.validerProjet(id, approuver, commentaire, authentication.getName()));
    }

    // ─── PATCH /api/projets/{id}/statut — Changer le statut (A10) ────────────

    @PatchMapping("/{id}/statut")
    @PreAuthorize("hasAnyRole('ADMIN', 'REFERENT')")
    public ResponseEntity<ProjetResponse> changerStatut(
            @PathVariable Long id,
            @RequestParam StatutProjet statut,
            Authentication authentication) {
        return ResponseEntity.ok(projetService.changerStatut(id, statut, authentication.getName()));
    }

    // ─── DELETE /api/projets/{id} — Supprimer un projet (ADMIN uniquement) ───

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> supprimerProjet(@PathVariable Long id) {
        projetService.supprimerProjet(id);
        return ResponseEntity.noContent().build();
    }

    // ─── POST /api/projets/{id}/rejoindre — Rejoindre un projet (M26) ────────

    @PostMapping("/{id}/rejoindre")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<Void> rejoindrProjet(
            @PathVariable Long id,
            Authentication authentication) {
        projetService.rejoindrProjet(id, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    // ─── POST /api/projets/{id}/commentaires — Commenter un projet (M27) ─────

    @PostMapping("/{id}/commentaires")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'PARTENAIRE', 'ADMIN')")
    public ResponseEntity<CommentaireResponse> commenterProjet(
            @PathVariable Long id,
            @Valid @RequestBody CommentaireRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projetService.commenterProjet(id, request, authentication.getName()));
    }

    // ─── GET /api/projets/{id}/commentaires — Commentaires d'un projet ────────

    @GetMapping("/{id}/commentaires")
    public ResponseEntity<List<CommentaireResponse>> getCommentaires(@PathVariable Long id) {
        return ResponseEntity.ok(projetService.getCommentaires(id));
    }

    // ─── GET /api/projets/mes-projets — Mes projets (porteur) — M28 ──────────

    @GetMapping("/mes-projets")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<List<ProjetResponse>> mesProjets(Authentication authentication) {
        return ResponseEntity.ok(projetService.mesProjets(authentication.getName()));
    }

    // ─── GET /api/projets/mes-participations — Projets où je participe ────────

    @GetMapping("/mes-participations")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<List<ProjetResponse>> mesProjetsParticipation(Authentication authentication) {
        return ResponseEntity.ok(projetService.mesProjetsParticipation(authentication.getName()));
    }
}
