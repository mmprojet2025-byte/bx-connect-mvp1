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
import java.util.Map;

@RestController
@RequestMapping("/api/groupes")
public class GroupeController {

    private final GroupeService groupeService;

    public GroupeController(GroupeService groupeService) {
        this.groupeService = groupeService;
    }

    // ─── PUBLIC ───────────────────────────────────────────────────────────────

    // GET /api/groupes — Groupes validés (public)
    @GetMapping
    public ResponseEntity<List<GroupeResponse>> listerGroupes(
            @RequestParam(required = false) String q) {

        if (q != null && !q.isBlank()) {
            return ResponseEntity.ok(groupeService.rechercherParNom(q));
        }

        return ResponseEntity.ok(groupeService.listerGroupes());
    }

    // GET /api/groupes/{id} — Détail d'un groupe (public)
    @GetMapping("/{id}")
    public ResponseEntity<GroupeResponse> getGroupe(@PathVariable Long id) {
        return ResponseEntity.ok(groupeService.getGroupe(id));
    }

    // GET /api/groupes/{id}/membres — Membres d'un groupe
    @GetMapping("/{id}/membres")
    public ResponseEntity<List<MembreGroupeResponse>> getMembres(
            @PathVariable Long id) {

        return ResponseEntity.ok(groupeService.getMembres(id));
    }

    // ─── RÉFÉRENT / ADMIN ─────────────────────────────────────────────────────

    // POST /api/groupes — Référent propose un groupe
    @PostMapping
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<GroupeResponse> proposerGroupe(
            @Valid @RequestBody GroupeRequest request,
            Authentication auth) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupeService.proposerGroupe(request, auth.getName()));
    }

    // PUT /api/groupes/{id} — Modifier un groupe
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<GroupeResponse> modifier(
            @PathVariable Long id,
            @Valid @RequestBody GroupeRequest request,
            Authentication auth) {

        return ResponseEntity.ok(
                groupeService.modifierGroupe(id, request, auth.getName())
        );
    }

    // GET /api/groupes/referent/mes-groupes
    @GetMapping("/referent/mes-groupes")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<GroupeResponse>> mesGroupes(
            Authentication auth) {

        return ResponseEntity.ok(
                groupeService.mesGroupes(auth.getName())
        );
    }

    // GET /api/groupes/{id}/demandes
    @GetMapping("/{id}/demandes")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<MembreGroupeResponse>> demandesEnAttente(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                groupeService.demandesEnAttente(id)
        );
    }

    // PATCH /api/groupes/adhesions/{id}/accepter
    @PatchMapping("/adhesions/{id}/accepter")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<MembreGroupeResponse> accepterAdhesion(
            @PathVariable Long id,
            Authentication auth) {

        return ResponseEntity.ok(
                groupeService.accepterAdhesion(id, auth.getName())
        );
    }

    // PATCH /api/groupes/adhesions/{id}/refuser
    @PatchMapping("/adhesions/{id}/refuser")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<MembreGroupeResponse> refuserAdhesion(
            @PathVariable Long id,
            Authentication auth) {

        return ResponseEntity.ok(
                groupeService.refuserAdhesion(id, auth.getName())
        );
    }

    // ─── ADMIN ────────────────────────────────────────────────────────────────

    // GET /api/groupes/admin/tous
    @GetMapping("/admin/tous")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<GroupeResponse>> tousLesGroupes() {

        return ResponseEntity.ok(
                groupeService.tousLesGroupes()
        );
    }

    // GET /api/groupes/admin/en-attente
    @GetMapping("/admin/en-attente")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<GroupeResponse>> groupesEnAttente() {

        return ResponseEntity.ok(
                groupeService.groupesEnAttente()
        );
    }

    // PATCH /api/groupes/{id}/valider
    @PatchMapping("/{id}/valider")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<GroupeResponse> valider(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                groupeService.validerGroupe(id)
        );
    }

    // PATCH /api/groupes/{id}/refuser
    @PatchMapping("/{id}/refuser")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<GroupeResponse> refuser(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {

        String motif =
                body != null
                        ? body.getOrDefault("motif", "Non précisé")
                        : "Non précisé";

        return ResponseEntity.ok(
                groupeService.refuserGroupe(id, motif)
        );
    }

    // DELETE /api/groupes/{id}
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> supprimer(
            @PathVariable Long id) {

        groupeService.supprimerGroupe(id);

        return ResponseEntity.noContent().build();
    }

    // ─── MEMBRE ───────────────────────────────────────────────────────────────

    // POST /api/groupes/{id}/rejoindre
    @PostMapping("/{id}/rejoindre")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<MembreGroupeResponse> rejoindre(
            @PathVariable Long id,
            Authentication auth) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupeService.rejoindreGroupe(id, auth.getName()));
    }

    // DELETE /api/groupes/{id}/quitter
    @DeleteMapping("/{id}/quitter")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<Void> quitter(
            @PathVariable Long id,
            Authentication auth) {

        groupeService.quitterGroupe(id, auth.getName());

        return ResponseEntity.noContent().build();
    }

    // GET /api/groupes/mes-groupes
    @GetMapping("/mes-groupes")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<GroupeResponse>> mesGroupesMembre(
            Authentication auth) {

        return ResponseEntity.ok(
                groupeService.mesGroupesMembre(auth.getName())
        );
    }
}