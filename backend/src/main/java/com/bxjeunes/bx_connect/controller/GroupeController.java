package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.GroupeRequest;
import com.bxjeunes.bx_connect.dto.GroupeResponse;
import com.bxjeunes.bx_connect.dto.MembreGroupeResponse;
import com.bxjeunes.bx_connect.service.GroupeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groupes")
public class GroupeController {

    private final GroupeService groupeService;

    public GroupeController(GroupeService groupeService) {
        this.groupeService = groupeService;
    }

    // ─── GET /api/groupes — Liste publique ───────────────────────────────────
    @GetMapping
    public ResponseEntity<List<GroupeResponse>> listerGroupes() {
        return ResponseEntity.ok(groupeService.listerGroupes());
    }

    // ─── GET /api/groupes/recherche?q=nom — Recherche (M17) ─────────────────
    @GetMapping("/recherche")
    public ResponseEntity<List<GroupeResponse>> rechercher(@RequestParam String q) {
        return ResponseEntity.ok(groupeService.rechercherParNom(q));
    }

    // ─── GET /api/groupes/{id} — Détail ─────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<GroupeResponse> getGroupe(@PathVariable Long id) {
        return ResponseEntity.ok(groupeService.getGroupe(id));
    }

    // ─── POST /api/groupes — Créer (REFERENT / ADMIN) ────────────────────────
    @PostMapping
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN')")
    public ResponseEntity<GroupeResponse> creerGroupe(
            @Valid @RequestBody GroupeRequest request,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupeService.creerGroupe(request, auth.getName()));
    }

    // ─── PUT /api/groupes/{id} — Modifier (REFERENT propriétaire / ADMIN) ───
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN')")
    public ResponseEntity<GroupeResponse> modifierGroupe(
            @PathVariable Long id,
            @Valid @RequestBody GroupeRequest request,
            Authentication auth) {
        return ResponseEntity.ok(groupeService.modifierGroupe(id, request, auth.getName()));
    }

    // ─── DELETE /api/groupes/{id} — Supprimer (ADMIN) ────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> supprimerGroupe(@PathVariable Long id) {
        groupeService.supprimerGroupe(id);
        return ResponseEntity.noContent().build();
    }

    // ─── POST /api/groupes/{id}/rejoindre — Rejoindre (M18) ─────────────────
    @PostMapping("/{id}/rejoindre")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<MembreGroupeResponse> rejoindre(
            @PathVariable Long id,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupeService.rejoindrGroupe(id, auth.getName()));
    }

    // ─── DELETE /api/groupes/{id}/quitter — Quitter (M19) ───────────────────
    @DeleteMapping("/{id}/quitter")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<Void> quitter(
            @PathVariable Long id,
            Authentication auth) {
        groupeService.quitterGroupe(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    // ─── GET /api/groupes/{id}/membres — Membres acceptés (M20) ─────────────
    @GetMapping("/{id}/membres")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<List<MembreGroupeResponse>> getMembres(@PathVariable Long id) {
        return ResponseEntity.ok(groupeService.getMembresAcceptes(id));
    }

    // ─── GET /api/groupes/{id}/demandes — Demandes en attente (R04) ──────────
    @GetMapping("/{id}/demandes")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN')")
    public ResponseEntity<List<MembreGroupeResponse>> getDemandesEnAttente(
            @PathVariable Long id,
            Authentication auth) {
        return ResponseEntity.ok(groupeService.getDemandesEnAttente(id, auth.getName()));
    }

    // ─── PATCH /api/groupes/demandes/{membreGroupeId} — Accepter/Refuser (R04)
    @PatchMapping("/demandes/{membreGroupeId}")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN')")
    public ResponseEntity<MembreGroupeResponse> traiterDemande(
            @PathVariable Long membreGroupeId,
            @RequestParam boolean accepter,
            Authentication auth) {
        return ResponseEntity.ok(groupeService.traiterDemande(membreGroupeId, accepter, auth.getName()));
    }

    // ─── GET /api/groupes/mes-groupes — Mes groupes (membre connecté) ────────
    @GetMapping("/mes-groupes")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<List<GroupeResponse>> mesGroupes(Authentication auth) {
        return ResponseEntity.ok(groupeService.mesGroupes(auth.getName()));
    }

    // ─── GET /api/groupes/mes-groupes-referent — Groupes gérés ──────────────
    @GetMapping("/mes-groupes-referent")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN')")
    public ResponseEntity<List<GroupeResponse>> mesGroupesReferent(Authentication auth) {
        return ResponseEntity.ok(groupeService.groupesParReferent(auth.getName()));
    }
}