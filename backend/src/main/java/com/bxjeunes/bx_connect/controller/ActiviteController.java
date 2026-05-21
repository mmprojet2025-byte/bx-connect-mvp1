package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.ActiviteFiltreRequest;
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
import java.util.Map;

@RestController
@RequestMapping("/api/activites")
public class ActiviteController {

    private final ActiviteService activiteService;

    public ActiviteController(ActiviteService activiteService) {
        this.activiteService = activiteService;
    }

    // ─── PUBLIC : Lister les activités publiées (V02) ─────────────────────────
    @GetMapping
    public ResponseEntity<List<ActiviteResponse>> listerPubliees() {
        return ResponseEntity.ok(activiteService.listerPubliees());
    }

    // ─── PUBLIC : Détail d'une activité (V04) ────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<ActiviteResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(activiteService.getById(id));
    }

    // ─── PUBLIC : Recherche par mot-clé (V06 / M16) ──────────────────────────
    @GetMapping("/recherche")
    public ResponseEntity<List<ActiviteResponse>> rechercher(@RequestParam String q) {
        return ResponseEntity.ok(activiteService.rechercher(q));
    }

    // ─── PUBLIC : Filtres avancés (V03) ──────────────────────────────────────
    // GET /api/activites/filtrer?q=sport&categorie=Formation&lieu=Bruxelles
    @GetMapping("/filtrer")
    public ResponseEntity<List<ActiviteResponse>> filtrer(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String categorie,
            @RequestParam(required = false) String theme,
            @RequestParam(required = false) String lieu,
            @RequestParam(required = false) Boolean gratuite,
            @RequestParam(required = false) String dateDebut,
            @RequestParam(required = false) String dateFin) {

        ActiviteFiltreRequest filtre = new ActiviteFiltreRequest();
        filtre.setQ(q);
        filtre.setCategorie(categorie);
        filtre.setTheme(theme);
        filtre.setLieu(lieu);
        filtre.setGratuite(gratuite);

        if (dateDebut != null) {
            filtre.setDateDebut(java.time.LocalDateTime.parse(dateDebut));
        }
        if (dateFin != null) {
            filtre.setDateFin(java.time.LocalDateTime.parse(dateFin));
        }

        return ResponseEntity.ok(activiteService.filtrer(filtre));
    }

    // ─── PUBLIC : Options de filtres (catégories, thèmes, lieux) ─────────────
    @GetMapping("/options-filtres")
    public ResponseEntity<Map<String, List<String>>> getOptionsFiltres() {
        return ResponseEntity.ok(activiteService.getOptionsFiltre());
    }

    // ─── ADMIN/REFERENT : Lister toutes les activités ────────────────────────
    @GetMapping("/admin/toutes")
    @PreAuthorize("hasAnyRole('ADMIN', 'REFERENT')")
    public ResponseEntity<List<ActiviteResponse>> listerToutes() {
        return ResponseEntity.ok(activiteService.listerToutes());
    }

    // ─── REFERENT : Mes activités créées ─────────────────────────────────────
    @GetMapping("/mes-activites")
    @PreAuthorize("hasAnyRole('ADMIN', 'REFERENT')")
    public ResponseEntity<List<ActiviteResponse>> mesActivites(Authentication auth) {
        return ResponseEntity.ok(activiteService.mesActivites(auth.getName()));
    }

    // ─── ADMIN/REFERENT : Créer une activité (R01 / A04) ─────────────────────
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'REFERENT')")
    public ResponseEntity<ActiviteResponse> creer(
            @Valid @RequestBody ActiviteRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(activiteService.creer(request, authentication.getName()));
    }

    // ─── ADMIN/REFERENT : Modifier une activité (R02 / A05) ──────────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'REFERENT')")
    public ResponseEntity<ActiviteResponse> modifier(
            @PathVariable Long id,
            @Valid @RequestBody ActiviteRequest request) {
        return ResponseEntity.ok(activiteService.modifier(id, request));
    }

    // ─── ADMIN/REFERENT : Changer le statut ──────────────────────────────────
    @PatchMapping("/{id}/statut")
    @PreAuthorize("hasAnyRole('ADMIN', 'REFERENT')")
    public ResponseEntity<ActiviteResponse> changerStatut(
            @PathVariable Long id,
            @RequestParam StatutActivite statut) {
        return ResponseEntity.ok(activiteService.changerStatut(id, statut));
    }

    // ─── ADMIN/REFERENT : Supprimer une activité (R03 / A06) ─────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'REFERENT')")
    public ResponseEntity<Void> supprimer(@PathVariable Long id) {
        activiteService.supprimer(id);
        return ResponseEntity.noContent().build();
    }
}