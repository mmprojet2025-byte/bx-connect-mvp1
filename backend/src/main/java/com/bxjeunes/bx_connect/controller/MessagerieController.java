package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.FilDiscussionRequest;
import com.bxjeunes.bx_connect.dto.FilDiscussionResponse;
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
     * Liste tous les fils actifs (MEMBRE, PARTENAIRE, ADMIN, REFERENT)
     */
    @GetMapping("/fils")
    @PreAuthorize("hasAnyRole('MEMBRE', 'PARTENAIRE', 'ADMIN', 'REFERENT')")
    public ResponseEntity<List<FilDiscussionResponse>> listerFils() {
        return ResponseEntity.ok(messagerieService.listerTousLesFils());
    }

    /**
     * GET /api/messagerie/fils/type/{type}
     * Liste les fils par type (GENERAL, PROJET, EVENEMENT, ADMIN)
     */
    @GetMapping("/fils/type/{type}")
    @PreAuthorize("hasAnyRole('MEMBRE', 'PARTENAIRE', 'ADMIN', 'REFERENT')")
    public ResponseEntity<List<FilDiscussionResponse>> listerFilsParType(@PathVariable TypeFil type) {
        return ResponseEntity.ok(messagerieService.listerFilsParType(type));
    }

    /**
     * GET /api/messagerie/fils/{id}
     * Détail d'un fil
     */
    @GetMapping("/fils/{id}")
    @PreAuthorize("hasAnyRole('MEMBRE', 'PARTENAIRE', 'ADMIN', 'REFERENT')")
    public ResponseEntity<FilDiscussionResponse> getFilById(@PathVariable Long id) {
        return ResponseEntity.ok(messagerieService.getFilById(id));
    }

    /**
     * POST /api/messagerie/fils
     * Créer un nouveau fil (ADMIN, REFERENT uniquement)
     */
    @PostMapping("/fils")
    @PreAuthorize("hasAnyRole('ADMIN', 'REFERENT')")
    public ResponseEntity<FilDiscussionResponse> creerFil(
            @Valid @RequestBody FilDiscussionRequest request,
            Principal principal) {
        FilDiscussionResponse response = messagerieService.creerFil(request, principal.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * DELETE /api/messagerie/fils/{id}
     * Désactiver un fil (ADMIN uniquement)
     */
    @DeleteMapping("/fils/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> supprimerFil(@PathVariable Long id) {
        messagerieService.supprimerFil(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Messages ────────────────────────────────────────────────────────────

    /**
     * GET /api/messagerie/fils/{filId}/messages
     * Lister les messages d'un fil
     */
    @GetMapping("/fils/{filId}/messages")
    @PreAuthorize("hasAnyRole('MEMBRE', 'PARTENAIRE', 'ADMIN', 'REFERENT')")
    public ResponseEntity<List<MessageResponse>> listerMessages(@PathVariable Long filId) {
        return ResponseEntity.ok(messagerieService.listerMessages(filId));
    }

    /**
     * POST /api/messagerie/messages
     * Envoyer un message dans un fil
     */
    @PostMapping("/messages")
    @PreAuthorize("hasAnyRole('MEMBRE', 'PARTENAIRE', 'ADMIN', 'REFERENT')")
    public ResponseEntity<MessageResponse> envoyerMessage(
            @Valid @RequestBody MessageRequest request,
            Principal principal) {
        MessageResponse response = messagerieService.envoyerMessage(request, principal.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * PATCH /api/messagerie/messages/{id}/lu
     * Marquer un message comme lu
     */
    @PatchMapping("/messages/{id}/lu")
    @PreAuthorize("hasAnyRole('MEMBRE', 'PARTENAIRE', 'ADMIN', 'REFERENT')")
    public ResponseEntity<Void> marquerCommeLu(@PathVariable Long id, Principal principal) {
        messagerieService.marquerCommeLu(id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/messagerie/fils/{filId}/non-lus
     * Compter les messages non lus d'un fil
     */
    @GetMapping("/fils/{filId}/non-lus")
    @PreAuthorize("hasAnyRole('MEMBRE', 'PARTENAIRE', 'ADMIN', 'REFERENT')")
    public ResponseEntity<Long> compterNonLus(@PathVariable Long filId) {
        return ResponseEntity.ok(messagerieService.compterMessagesNonLus(filId));
    }
}