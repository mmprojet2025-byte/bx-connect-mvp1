package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.PaiementRequest;
import com.bxjeunes.bx_connect.dto.PaiementResponse;
import com.bxjeunes.bx_connect.service.PayPalService;
import com.paypal.base.rest.PayPalRESTException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/paiements")
@Tag(name = "Paiements PayPal", description = "Gestion des soutiens financiers via PayPal")
@SecurityRequirement(name = "bearerAuth")
public class PaiementController {

    private final PayPalService payPalService;

    public PaiementController(PayPalService payPalService) {
        this.payPalService = payPalService;
    }

    // ─── POST /api/paiements/creer ────────────────────────────────────────────
    // Crée un paiement PayPal et retourne l'URL d'approbation
    @PostMapping("/creer")
    @PreAuthorize("hasAnyRole('MEMBRE', 'PARTENAIRE', 'REFERENT', 'ADMIN')")
    @Operation(summary = "Créer un paiement PayPal", description = "Initie un paiement et retourne l'URL d'approbation PayPal")
    public ResponseEntity<?> creerPaiement(@Valid @RequestBody PaiementRequest request) {
        try {
            PaiementResponse response = payPalService.creerPaiement(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (AccessDeniedException e) {
            throw e;
        } catch (PayPalRESTException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Erreur PayPal", "message", "Impossible de créer le paiement."));
        }
    }

    // ─── GET /api/paiements/confirmer ─────────────────────────────────────────
    // PayPal redirige ici après approbation (avec paymentId et PayerID)
    @GetMapping("/confirmer")
    @Operation(summary = "Confirmer un paiement PayPal", description = "Appelé automatiquement par PayPal après approbation")
    public ResponseEntity<?> confirmerPaiement(
            @RequestParam("paymentId") String paymentId,
            @RequestParam("PayerID") String payerId) {
        try {
            PaiementResponse response = payPalService.confirmerPaiement(paymentId, payerId);
            return ResponseEntity.ok(response);
        } catch (PayPalRESTException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Erreur confirmation PayPal", "message", "Impossible de confirmer le paiement."));
        }
    }

    // ─── GET /api/paiements/annuler ───────────────────────────────────────────
    // PayPal redirige ici si l'utilisateur annule
    @GetMapping("/annuler")
    @Operation(summary = "Annuler un paiement PayPal", description = "Appelé automatiquement par PayPal si l'utilisateur annule")
    public ResponseEntity<?> annulerPaiement(@RequestParam("paymentId") String paymentId) {
        PaiementResponse response = payPalService.annulerPaiement(paymentId);
        return ResponseEntity.ok(response);
    }

    // ─── GET /api/paiements/mes-soutiens ─────────────────────────────────────
    // Historique des soutiens de l'utilisateur connecté
    @GetMapping("/mes-soutiens")
    @PreAuthorize("hasAnyRole('MEMBRE', 'PARTENAIRE', 'REFERENT', 'ADMIN')")
    @Operation(summary = "Mes soutiens financiers", description = "Retourne l'historique des soutiens de l'utilisateur connecté")
    public ResponseEntity<List<PaiementResponse>> mesSoutiens() {
        return ResponseEntity.ok(payPalService.mesSoutiens());
    }

    // ─── GET /api/paiements/activite/{id} ────────────────────────────────────
    // Soutiens d'une activité (admin/référent uniquement)
    @GetMapping("/activite/{activiteId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'REFERENT')")
    @Operation(summary = "Soutiens d'une activité", description = "Liste tous les soutiens financiers pour une activité donnée")
    public ResponseEntity<List<PaiementResponse>> soutiensParActivite(@PathVariable Long activiteId) {
        return ResponseEntity.ok(payPalService.soutiensParActivite(activiteId));
    }
}
