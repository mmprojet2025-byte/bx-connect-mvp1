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

    // PUBLIC
    @GetMapping
    public ResponseEntity<List<GroupeResponse>> listerGroupes(@RequestParam(required = false) String q) {
        if (q != null && !q.isBlank()) return ResponseEntity.ok(groupeService.rechercherParNom(q));
        return ResponseEntity.ok(groupeService.listerGroupes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GroupeResponse> getGroupe(@PathVariable Long id) {
        return ResponseEntity.ok(groupeService.getGroupe(id));
    }

    @GetMapping("/{id}/membres")
    @PreAuthorize("hasAnyRole('ADMIN', 'REFERENT')")
    public ResponseEntity<List<MembreGroupeResponse>> getMembres(
            @PathVariable Long id,
            Authentication auth) {
        return ResponseEntity.ok(groupeService.getMembresAdminOuReferent(id, auth.getName()));
    }

    // REFERENT / ADMIN
    @PostMapping
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN')")
    public ResponseEntity<GroupeResponse> proposerGroupe(
            @Valid @RequestBody GroupeRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupeService.proposerGroupe(request, auth.getName()));
    }

    // SECURITE : auth.getName() transmis — GroupeService verifie le perimetre
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN')")
    public ResponseEntity<GroupeResponse> modifier(
            @PathVariable Long id, @Valid @RequestBody GroupeRequest request, Authentication auth) {
        return ResponseEntity.ok(groupeService.modifierGroupe(id, request, auth.getName()));
    }

    @GetMapping("/referent/mes-groupes")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN')")
    public ResponseEntity<List<GroupeResponse>> mesGroupes(Authentication auth) {
        return ResponseEntity.ok(groupeService.mesGroupes(auth.getName()));
    }

    @GetMapping("/{id}/demandes")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN')")
    public ResponseEntity<List<MembreGroupeResponse>> demandesEnAttente(
            @PathVariable Long id,
            Authentication auth) {
        return ResponseEntity.ok(groupeService.demandesEnAttenteAdminOuReferent(id, auth.getName()));
    }

    // SECURITE : auth.getName() transmis — verifie que le referent gere bien ce groupe
    @PatchMapping("/adhesions/{id}/accepter")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN')")
    public ResponseEntity<MembreGroupeResponse> accepterAdhesion(
            @PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(groupeService.accepterAdhesion(id, auth.getName()));
    }

    // SECURITE : auth.getName() transmis — verifie que le referent gere bien ce groupe
    @PatchMapping("/adhesions/{id}/refuser")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN')")
    public ResponseEntity<MembreGroupeResponse> refuserAdhesion(
            @PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(groupeService.refuserAdhesion(id, auth.getName()));
    }

    // ADMIN
    @GetMapping("/admin/tous")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<GroupeResponse>> tousLesGroupes() {
        return ResponseEntity.ok(groupeService.tousLesGroupes());
    }

    @GetMapping("/admin/en-attente")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<GroupeResponse>> groupesEnAttente() {
        return ResponseEntity.ok(groupeService.groupesEnAttente());
    }

    @PatchMapping("/{id}/valider")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GroupeResponse> valider(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(groupeService.validerGroupe(id, auth.getName()));
    }

    @PatchMapping("/{id}/refuser")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GroupeResponse> refuser(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        String motif = body != null ? body.getOrDefault("motif", "Non precise") : "Non precise";
        return ResponseEntity.ok(groupeService.refuserGroupe(id, motif, auth.getName()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> supprimer(@PathVariable Long id, Authentication auth) {
        groupeService.supprimerGroupe(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    // MEMBRE
    @PostMapping("/{id}/rejoindre")
    @PreAuthorize("hasRole('MEMBRE')")
    public ResponseEntity<MembreGroupeResponse> rejoindre(
            @PathVariable Long id, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupeService.rejoindreGroupe(id, auth.getName()));
    }

    @DeleteMapping("/{id}/quitter")
    @PreAuthorize("hasRole('MEMBRE')")
    public ResponseEntity<Void> quitter(@PathVariable Long id, Authentication auth) {
        groupeService.quitterGroupe(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/mes-groupes")
    @PreAuthorize("hasRole('MEMBRE')")
    public ResponseEntity<List<GroupeResponse>> mesGroupesMembre(Authentication auth) {
        return ResponseEntity.ok(groupeService.mesGroupesMembre(auth.getName()));
    }

    @GetMapping("/mes-adhesions")
    @PreAuthorize("hasRole('MEMBRE')")
    public ResponseEntity<List<MembreGroupeResponse>> mesAdhesionsMembre(Authentication auth) {
        return ResponseEntity.ok(groupeService.mesAdhesionsMembre(auth.getName()));
    }
}
