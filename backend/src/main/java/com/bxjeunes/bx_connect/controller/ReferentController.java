package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.ActiviteResponse;
import com.bxjeunes.bx_connect.dto.GroupeResponse;
import com.bxjeunes.bx_connect.dto.MembreGroupeResponse;
import com.bxjeunes.bx_connect.dto.ProjetResponse;
import com.bxjeunes.bx_connect.service.GroupeService;
import com.bxjeunes.bx_connect.service.ReferentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/referent")
@PreAuthorize("hasRole('REFERENT')")
public class ReferentController {

    private final ReferentService referentService;
    private final GroupeService groupeService;

    public ReferentController(ReferentService referentService,
                              GroupeService groupeService) {
        this.referentService = referentService;
        this.groupeService = groupeService;
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

    // ─── Groupes du referent ─────────────────────────────────────────────────
    @GetMapping("/groupes")
    public ResponseEntity<List<GroupeResponse>> mesGroupes(Authentication auth) {
        return ResponseEntity.ok(groupeService.mesGroupes(auth.getName()));
    }

    @GetMapping("/groupes/{groupeId}/membres")
    public ResponseEntity<List<MembreGroupeResponse>> membresGroupe(
            @PathVariable Long groupeId,
            Authentication auth) {
        return ResponseEntity.ok(groupeService.getMembresReferent(groupeId, auth.getName()));
    }

    @GetMapping("/groupes/{groupeId}/demandes")
    public ResponseEntity<List<MembreGroupeResponse>> demandesGroupe(
            @PathVariable Long groupeId,
            Authentication auth) {
        return ResponseEntity.ok(groupeService.demandesEnAttenteReferent(groupeId, auth.getName()));
    }

    @PatchMapping("/groupes/{groupeId}/demandes/{demandeId}/accepter")
    public ResponseEntity<MembreGroupeResponse> accepterDemande(
            @PathVariable Long groupeId,
            @PathVariable Long demandeId,
            Authentication auth) {
        groupeService.verifierDemandeDansGroupe(demandeId, groupeId);
        return ResponseEntity.ok(groupeService.accepterAdhesion(demandeId, auth.getName()));
    }

    @PatchMapping("/groupes/{groupeId}/demandes/{demandeId}/refuser")
    public ResponseEntity<MembreGroupeResponse> refuserDemande(
            @PathVariable Long groupeId,
            @PathVariable Long demandeId,
            Authentication auth) {
        groupeService.verifierDemandeDansGroupe(demandeId, groupeId);
        return ResponseEntity.ok(groupeService.refuserAdhesion(demandeId, auth.getName()));
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
