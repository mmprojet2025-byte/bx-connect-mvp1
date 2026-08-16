package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.PaiementRequest;
import com.bxjeunes.bx_connect.dto.PaiementResponse;
import com.bxjeunes.bx_connect.service.StripeService;
import com.stripe.exception.StripeException;
import jakarta.validation.Valid;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stripe")
@ConditionalOnProperty(
        name = "features.payments.stripe.enabled",
        havingValue = "true",
        matchIfMissing = false
)
public class StripeController {

    private final StripeService stripeService;

    public StripeController(StripeService stripeService) {
        this.stripeService = stripeService;
    }

    // ─── Clé publique Stripe (pour le frontend) ───────────────────────────────
    // GET /api/stripe/config
    @GetMapping("/config")
    public ResponseEntity<Map<String, String>> getConfig() {
        return ResponseEntity.ok(Map.of(
            "publishableKey", stripeService.getPublishableKey()
        ));
    }

    // ─── Créer une session Checkout Stripe ───────────────────────────────────
    // POST /api/stripe/checkout
    @PostMapping("/checkout")
    @PreAuthorize("hasAnyRole('MEMBRE', 'PARTENAIRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<?> creerCheckout(@Valid @RequestBody PaiementRequest request) {
        try {
            PaiementResponse response = stripeService.creerSessionCheckout(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (AccessDeniedException e) {
            throw e;
        } catch (StripeException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Erreur Stripe", "message", "Impossible de créer la session de paiement."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Erreur", "message", "Paiement impossible pour cette demande."));
        }
    }

    // ─── Vérifier le statut d'une session après retour Stripe ────────────────
    // GET /api/stripe/session/{sessionId}
    @GetMapping("/session/{sessionId}")
    @PreAuthorize("hasAnyRole('MEMBRE', 'PARTENAIRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<?> verifierSession(
            @PathVariable String sessionId,
            Authentication auth) {
        try {
            PaiementResponse response = stripeService.verifierSession(sessionId, auth.getName());
            return ResponseEntity.ok(response);
        } catch (AccessDeniedException e) {
            throw e;
        } catch (StripeException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Erreur Stripe", "message", "Impossible de vérifier la session de paiement."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Session introuvable", "message", "Session de paiement introuvable."));
        }
    }

    // ─── Webhook Stripe (appelé automatiquement par Stripe) ──────────────────
    // POST /api/stripe/webhook
    // ⚠️ Route publique — Stripe envoie les événements ici
    @PostMapping("/webhook")
    public ResponseEntity<String> webhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {
        try {
            stripeService.traiterWebhook(payload, sigHeader);
            return ResponseEntity.ok("Webhook traité");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Webhook invalide");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erreur webhook");
        }
    }

    // ─── Historique Stripe de l'utilisateur connecté ─────────────────────────
    // GET /api/stripe/mes-paiements
    @GetMapping("/mes-paiements")
    @PreAuthorize("hasAnyRole('MEMBRE', 'PARTENAIRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<List<PaiementResponse>> mesPaiements() {
        return ResponseEntity.ok(stripeService.mesPaymentsStripe());
    }

    // ─── Historique complet (PayPal + Stripe) ────────────────────────────────
    // GET /api/stripe/historique
    @GetMapping("/historique")
    @PreAuthorize("hasAnyRole('MEMBRE', 'PARTENAIRE', 'REFERENT', 'ADMIN')")
    public ResponseEntity<List<PaiementResponse>> historique() {
        return ResponseEntity.ok(stripeService.tousLesPaiements());
    }
}
