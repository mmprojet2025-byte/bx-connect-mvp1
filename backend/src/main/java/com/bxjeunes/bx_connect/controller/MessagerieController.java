package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.FilDiscussionRequest;
import com.bxjeunes.bx_connect.dto.FilDiscussionResponse;
import com.bxjeunes.bx_connect.dto.GroupeResponse;
import com.bxjeunes.bx_connect.dto.MessageRequest;
import com.bxjeunes.bx_connect.dto.MessageResponse;
import com.bxjeunes.bx_connect.entity.TypeFil;
import com.bxjeunes.bx_connect.service.MessagerieService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/messagerie")
public class MessagerieController {

    private final MessagerieService messagerieService;

    public MessagerieController(MessagerieService messagerieService) {
        this.messagerieService = messagerieService;
    }

    // ─── Fils de discussion ──────────────────────────────────────────────────

    /**
     * GET /api/messagerie/fils
     * Liste les fils de groupe accessibles a l'utilisateur connecte.
     */
    @GetMapping("/fils")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT')")
    public ResponseEntity<List<FilDiscussionResponse>> listerFils(Principal principal) {
        return ResponseEntity.ok(messagerieService.listerTousLesFils(principal.getName()));
    }

    /**
     * GET /api/messagerie/fils/type/{type}
     * Liste les fils accessibles par type.
     */
    @GetMapping("/fils/type/{type}")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT')")
    public ResponseEntity<List<FilDiscussionResponse>> listerFilsParType(
            @PathVariable TypeFil type,
            Principal principal) {
        return ResponseEntity.ok(messagerieService.listerFilsParType(type, principal.getName()));
    }

    /**
     * GET /api/messagerie/fils/{id}
     * Détail d'un fil
     */
    @GetMapping("/fils/{id}")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT')")
    public ResponseEntity<FilDiscussionResponse> getFilById(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(messagerieService.getFilById(id, principal.getName()));
    }

    /**
     * POST /api/messagerie/fils
     * Créer un nouveau fil de groupe (REFERENT du groupe uniquement)
     */
    @PostMapping("/fils")
    @PreAuthorize("hasRole('REFERENT')")
    public ResponseEntity<FilDiscussionResponse> creerFil(
            @Valid @RequestBody FilDiscussionRequest request,
            Principal principal) {
        FilDiscussionResponse response = messagerieService.creerFil(request, principal.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * DELETE /api/messagerie/fils/{id}
     * Désactiver un fil de groupe (REFERENT du groupe uniquement)
     */
    @DeleteMapping("/fils/{id}")
    @PreAuthorize("hasRole('REFERENT')")
    public ResponseEntity<Void> supprimerFil(@PathVariable Long id, Principal principal) {
        messagerieService.supprimerFil(id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/mon-groupe")
    @PreAuthorize("hasRole('MEMBRE')")
    public ResponseEntity<GroupeResponse> monGroupe(Principal principal) {
        return ResponseEntity.ok(messagerieService.monGroupe(principal.getName()));
    }

    @GetMapping("/groupes/{groupeId}/fil")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT')")
    public ResponseEntity<FilDiscussionResponse> getFilGroupe(
            @PathVariable Long groupeId,
            Principal principal) {
        return ResponseEntity.ok(messagerieService.getFilGroupe(groupeId, principal.getName()));
    }

    // ─── Messages ────────────────────────────────────────────────────────────

    /**
     * GET /api/messagerie/fils/{filId}/messages
     * Lister les messages d'un fil
     */
    @GetMapping("/fils/{filId}/messages")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT')")
    public ResponseEntity<List<MessageResponse>> listerMessages(
            @PathVariable Long filId,
            Principal principal) {
        return ResponseEntity.ok(messagerieService.listerMessages(filId, principal.getName()));
    }

    /**
     * POST /api/messagerie/messages
     * Envoyer un message dans un fil
     */
    @PostMapping("/messages")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT')")
    public ResponseEntity<MessageResponse> envoyerMessage(
            @Valid @RequestBody MessageRequest request,
            Principal principal) {
        MessageResponse response = messagerieService.envoyerMessage(request, principal.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/groupes/{groupeId}/messages")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT')")
    public ResponseEntity<MessageResponse> envoyerMessageGroupe(
            @PathVariable Long groupeId,
            @RequestBody MessageRequest request,
            Principal principal) {
        MessageResponse response = messagerieService.envoyerMessageGroupe(
                groupeId,
                request.getContenu(),
                principal.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * PATCH /api/messagerie/messages/{id}/lu
     * Marquer un message comme lu
     */
    @PatchMapping("/messages/{id}/lu")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT')")
    public ResponseEntity<Void> marquerCommeLu(@PathVariable Long id, Principal principal) {
        messagerieService.marquerCommeLu(id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/messagerie/fils/{filId}/non-lus
     * Compter les messages non lus d'un fil
     */
    @GetMapping("/fils/{filId}/non-lus")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT')")
    public ResponseEntity<Long> compterNonLus(@PathVariable Long filId, Principal principal) {
        return ResponseEntity.ok(messagerieService.compterMessagesNonLus(filId, principal.getName()));
    }
}
