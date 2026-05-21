package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.ActiviteRequest;
import com.bxjeunes.bx_connect.dto.ActiviteResponse;
import com.bxjeunes.bx_connect.dto.ProjetResponse;
import com.bxjeunes.bx_connect.service.ActiviteService;
import com.bxjeunes.bx_connect.service.ReferentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/referent")
@PreAuthorize("hasAnyRole('REFERENT', 'ADMIN')")
public class ReferentController {

    private final ReferentService referentService;
    private final ActiviteService activiteService;

    public ReferentController(ReferentService referentService,
                              ActiviteService activiteService) {
        this.referentService = referentService;
        this.activiteService = activiteService;
    }

    // ─── Dashboard référent ───────────────────────────────────────────────────
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard(Authentication auth) {
        return ResponseEntity.ok(referentService.dashboard(auth.getName()));
    }

    // ─── R01 : Mes activités créées ───────────────────────────────────────────
    @GetMapping("/mes-activites")
    public ResponseEntity<List<ActiviteResponse>> mesActivites(Authentication auth) {
        return ResponseEntity.ok(referentService.mesActivites(auth.getName()));
    }

    // ─── R11 : Taux de remplissage ────────────────────────────────────────────
    @GetMapping("/taux-remplissage")
    public ResponseEntity<List<Map<String, Object>>> tauxRemplissage(Authentication auth) {
        return ResponseEntity.ok(referentService.tauxRemplissage(auth.getName()));
    }

    // ─── R07 : Exporter participants d'une activité ───────────────────────────
    @GetMapping("/activites/{activiteId}/participants")
    public ResponseEntity<List<Map<String, Object>>> exporterParticipants(
            @PathVariable Long activiteId,
            Authentication auth) {
        return ResponseEntity.ok(referentService.exporterParticipants(activiteId, auth.getName()));
    }

    // ─── R13 : Projets soumis en attente ─────────────────────────────────────
    @GetMapping("/projets-soumis")
    public ResponseEntity<List<ProjetResponse>> projetsSoumis() {
        return ResponseEntity.ok(referentService.projetsSoumis());
    }

    // ─── R13 : Valider un projet ──────────────────────────────────────────────
    @PatchMapping("/projets/{id}/valider")
    public ResponseEntity<ProjetResponse> validerProjet(@PathVariable Long id) {
        return ResponseEntity.ok(referentService.validerProjet(id));
    }

    // ─── R13 : Refuser un projet ──────────────────────────────────────────────
    @PatchMapping("/projets/{id}/refuser")
    public ResponseEntity<ProjetResponse> refuserProjet(@PathVariable Long id) {
        return ResponseEntity.ok(referentService.refuserProjet(id));
    }

    // ─── R17 : Soutiens financiers reçus ─────────────────────────────────────
    @GetMapping("/soutiens-recus")
    public ResponseEntity<List<Map<String, Object>>> soutiensRecus(Authentication auth) {
        return ResponseEntity.ok(referentService.soutiensRecus(auth.getName()));
    }
}