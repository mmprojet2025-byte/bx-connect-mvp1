package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.service.PrestationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/prestations")
public class PrestationController {

    private final PrestationService prestationService;

    public PrestationController(PrestationService prestationService) {
        this.prestationService = prestationService;
    }

    // POST /api/prestations — Membre encode une prestation
    @PostMapping
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> encoder(
            @RequestBody Map<String, Object> request,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(prestationService.encoderPrestation(request, auth.getName()));
    }

    // GET /api/prestations/mes-prestations — Mes prestations
    @GetMapping("/mes-prestations")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> mesPrestations(Authentication auth) {
        return ResponseEntity.ok(prestationService.mesPrestations(auth.getName()));
    }

    // GET /api/prestations/groupe/{id} — Prestations d'un groupe (référent)
    @GetMapping("/groupe/{groupeId}")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> prestationsGroupe(@PathVariable Long groupeId) {
        return ResponseEntity.ok(prestationService.prestationsGroupe(groupeId));
    }

    // GET /api/prestations/groupe/{id}/en-attente — En attente de validation
    @GetMapping("/groupe/{groupeId}/en-attente")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> enAttente(@PathVariable Long groupeId) {
        return ResponseEntity.ok(prestationService.prestationsEnAttente(groupeId));
    }

    // PATCH /api/prestations/{id}/valider — Référent valide
    @PatchMapping("/{id}/valider")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> valider(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication auth) {
        String commentaire = body != null && body.containsKey("commentaire")
                ? body.get("commentaire").toString() : "";
        return ResponseEntity.ok(prestationService.validerPrestation(id, commentaire, auth.getName()));
    }

    // PATCH /api/prestations/{id}/refuser — Référent refuse
    @PatchMapping("/{id}/refuser")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> refuser(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        String commentaire = body.getOrDefault("commentaire", "").toString();
        return ResponseEntity.ok(prestationService.refuserPrestation(id, commentaire, auth.getName()));
    }

    // GET /api/prestations/admin/toutes — Admin voit tout
    @GetMapping("/admin/toutes")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> toutesLesPrestations() {
        return ResponseEntity.ok(prestationService.toutesLesPrestations());
    }

    // GET /api/prestations/admin/stats — Statistiques bénévolat
    @GetMapping("/admin/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> statistiques() {
        return ResponseEntity.ok(prestationService.statistiques());
    }

    // GET /api/prestations/membre/{id}/stats — Stats d'un membre
    @GetMapping("/membre/{membreId}/stats")
    @PreAuthorize("hasAnyRole('REFERENT', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> statsMembre(@PathVariable Long membreId) {
        return ResponseEntity.ok(prestationService.statsMembre(membreId));
    }
}