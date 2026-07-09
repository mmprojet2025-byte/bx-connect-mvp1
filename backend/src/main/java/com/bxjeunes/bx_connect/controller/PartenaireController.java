package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.SoutienRequest;
import com.bxjeunes.bx_connect.dto.SoutienResponse;
import com.bxjeunes.bx_connect.dto.AdminSoutienDecisionRequest;
import com.bxjeunes.bx_connect.dto.PagedResponse;
import com.bxjeunes.bx_connect.dto.PartenaireProfilRequest;
import com.bxjeunes.bx_connect.dto.PartenaireProfilResponse;
import com.bxjeunes.bx_connect.dto.PartenairePublicResponse;
import com.bxjeunes.bx_connect.entity.StatutPaiement;
import com.bxjeunes.bx_connect.service.PartenaireService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/partenaire")
public class PartenaireController {

    private final PartenaireService partenaireService;

    public PartenaireController(PartenaireService partenaireService) {
        this.partenaireService = partenaireService;
    }

    @GetMapping("/publics")
    public ResponseEntity<List<PartenairePublicResponse>> partenairesPublics() {
        return ResponseEntity.ok(partenaireService.partenairesPublics());
    }

    @GetMapping("/profil")
    @PreAuthorize("hasRole('PARTENAIRE')")
    public ResponseEntity<PartenaireProfilResponse> profil(Authentication auth) {
        return ResponseEntity.ok(partenaireService.getProfilInstitutionnel(auth.getName()));
    }

    @PutMapping("/profil")
    @PreAuthorize("hasRole('PARTENAIRE')")
    public ResponseEntity<PartenaireProfilResponse> modifierProfil(
            @Valid @RequestBody PartenaireProfilRequest request,
            Authentication auth) {
        return ResponseEntity.ok(
                partenaireService.enregistrerProfilInstitutionnel(request, auth.getName()));
    }

    // ─── P03 : Projets ouverts au soutien (public) ───────────────────────────
    @GetMapping("/projets-ouverts")
    @PreAuthorize("hasRole('PARTENAIRE')")
    public ResponseEntity<List<Map<String, Object>>> projetsSoutienOuverts() {
        return ResponseEntity.ok(partenaireService.projetsSoutienOuverts());
    }

    // ─── P04 : Activités ouvertes au soutien (public) ────────────────────────
    @GetMapping("/activites-ouvertes")
    public ResponseEntity<List<Map<String, Object>>> activitesSoutienOuverts() {
        return ResponseEntity.ok(partenaireService.activitesSoutienOuverts());
    }

    // ─── P05 : Soumettre un soutien à un projet ───────────────────────────────
    @PostMapping("/soutenir-projet")
    @PreAuthorize("hasRole('PARTENAIRE')")
    public ResponseEntity<SoutienResponse> soutenirProjet(
            @Valid @RequestBody SoutienRequest request,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(partenaireService.soutenirProjet(request, auth.getName()));
    }

    // ─── P06 : Soumettre un soutien à une activité ────────────────────────────
    @PostMapping("/soutenir-activite")
    @PreAuthorize("hasRole('PARTENAIRE')")
    public ResponseEntity<SoutienResponse> soutenirActivite(
            @Valid @RequestBody SoutienRequest request,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(partenaireService.soutenirActivite(request, auth.getName()));
    }

    // ─── P07 : Mes soutiens soumis ────────────────────────────────────────────
    @GetMapping("/mes-soutiens")
    @PreAuthorize("hasRole('PARTENAIRE')")
    public ResponseEntity<List<SoutienResponse>> mesSoutiens(Authentication auth) {
        return ResponseEntity.ok(partenaireService.mesSoutiens(auth.getName()));
    }

    @GetMapping("/mes-soutiens/page")
    @PreAuthorize("hasRole('PARTENAIRE')")
    public ResponseEntity<PagedResponse<SoutienResponse>> mesSoutiensPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(partenaireService.mesSoutiensPage(auth.getName(), page, size));
    }

    @PutMapping("/mes-soutiens/{id}")
    @PreAuthorize("hasRole('PARTENAIRE')")
    public ResponseEntity<SoutienResponse> modifierSoutien(
            @PathVariable Long id,
            @Valid @RequestBody SoutienRequest request,
            Authentication auth) {
        return ResponseEntity.ok(partenaireService.modifierSoutien(id, request, auth.getName()));
    }

    @PatchMapping("/mes-soutiens/{id}/annuler")
    @PreAuthorize("hasRole('PARTENAIRE')")
    public ResponseEntity<SoutienResponse> annulerSoutien(
            @PathVariable Long id,
            Authentication auth) {
        return ResponseEntity.ok(partenaireService.annulerSoutien(id, auth.getName()));
    }

    // ─── P09 : Statistiques du partenaire ────────────────────────────────────
    @GetMapping("/statistiques")
    @PreAuthorize("hasRole('PARTENAIRE')")
    public ResponseEntity<Map<String, Object>> statistiques(Authentication auth) {
        return ResponseEntity.ok(partenaireService.statistiques(auth.getName()));
    }

    // ─── Admin : Tous les soutiens (A24) ─────────────────────────────────────
    @GetMapping("/admin/tous")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SoutienResponse>> tousLesSoutiens() {
        return ResponseEntity.ok(partenaireService.tousLesSoutiens());
    }

    @GetMapping("/admin/tous/page")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PagedResponse<SoutienResponse>> tousLesSoutiensPage(
            @RequestParam(required = false) StatutPaiement statut,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(partenaireService.tousLesSoutiensPage(statut, page, size));
    }

    // ─── Admin : Valider un soutien (A25) ────────────────────────────────────
    @PatchMapping("/admin/{id}/valider")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SoutienResponse> valider(
            @PathVariable Long id,
            @RequestBody(required = false) AdminSoutienDecisionRequest request,
            Authentication auth) {
        String commentaire = request != null ? request.getCommentaireAdmin() : null;
        return ResponseEntity.ok(partenaireService.validerSoutien(id, commentaire, auth.getName()));
    }

    // ─── Admin : Refuser un soutien (A25) ────────────────────────────────────
    @PatchMapping("/admin/{id}/refuser")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SoutienResponse> refuser(
            @PathVariable Long id,
            @RequestBody(required = false) AdminSoutienDecisionRequest request,
            Authentication auth) {
        String commentaire = request != null ? request.getCommentaireAdmin() : null;
        return ResponseEntity.ok(partenaireService.refuserSoutien(id, commentaire, auth.getName()));
    }
}
