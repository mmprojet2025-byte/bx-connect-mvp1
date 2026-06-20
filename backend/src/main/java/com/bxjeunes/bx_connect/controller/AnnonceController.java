package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.AnnonceRequest;
import com.bxjeunes.bx_connect.dto.AnnonceResponse;
import com.bxjeunes.bx_connect.dto.OpportunitePartenaireRequest;
import com.bxjeunes.bx_connect.service.AnnonceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/annonces")
public class AnnonceController {

    private final AnnonceService annonceService;

    public AnnonceController(AnnonceService annonceService) {
        this.annonceService = annonceService;
    }

    // GET /api/annonces/globales — Annonces globales (public)
    @GetMapping("/globales")
    public ResponseEntity<List<Map<String, Object>>> annoncesGlobales() {
        return ResponseEntity.ok(annonceService.annoncesGlobales());
    }

    // GET /api/annonces/mes-annonces — Annonces visibles pour l'utilisateur connecté
    @GetMapping("/mes-annonces")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> mesAnnonces(Authentication auth) {
        return ResponseEntity.ok(annonceService.annoncesVisibles(auth.getName()));
    }

    // GET /api/annonces/groupe/{id} — Annonces d'un groupe
    @GetMapping("/groupe/{groupeId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> annoncesGroupe(
            @PathVariable Long groupeId,
            Authentication auth) {
        return ResponseEntity.ok(annonceService.annoncesGroupe(groupeId, auth.getName()));
    }

    // GET /api/annonces/admin/toutes — Toutes les annonces (admin)
    @GetMapping("/admin/toutes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> toutesLesAnnonces() {
        return ResponseEntity.ok(annonceService.toutesLesAnnonces());
    }

    // POST /api/annonces — Créer une annonce (Admin ou Référent)
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'REFERENT')")
    public ResponseEntity<Map<String, Object>> creer(
            @Valid @RequestBody AnnonceRequest request,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(annonceService.creerAnnonce(request, auth.getName()));
    }

    @PostMapping("/opportunites")
    @PreAuthorize("hasRole('PARTENAIRE')")
    public ResponseEntity<AnnonceResponse> creerOpportunite(
            @Valid @RequestBody OpportunitePartenaireRequest request,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(annonceService.creerOpportunitePartenaire(request, auth.getName()));
    }

    @GetMapping("/partenaire/mes-opportunites")
    @PreAuthorize("hasRole('PARTENAIRE')")
    public ResponseEntity<List<AnnonceResponse>> mesOpportunites(Authentication auth) {
        return ResponseEntity.ok(annonceService.mesOpportunitesPartenaire(auth.getName()));
    }

    @GetMapping("/admin/opportunites")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AnnonceResponse>> opportunitesAdmin() {
        return ResponseEntity.ok(annonceService.opportunitesAdmin());
    }

    @PatchMapping("/admin/{id}/publier")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AnnonceResponse> publierOpportunite(@PathVariable Long id) {
        return ResponseEntity.ok(annonceService.publierOpportunite(id));
    }

    @PatchMapping("/admin/{id}/refuser")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AnnonceResponse> refuserOpportunite(@PathVariable Long id) {
        return ResponseEntity.ok(annonceService.refuserOpportunite(id));
    }

    // PATCH /api/annonces/{id}/epingler — Épingler/désépingler (Admin)
    @PatchMapping("/{id}/epingler")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> epingler(@PathVariable Long id) {
        return ResponseEntity.ok(annonceService.toggleEpingler(id));
    }

    // DELETE /api/annonces/{id} — Supprimer
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'REFERENT')")
    public ResponseEntity<Void> supprimer(@PathVariable Long id, Authentication auth) {
        annonceService.supprimer(id, auth.getName());
        return ResponseEntity.noContent().build();
    }
}
