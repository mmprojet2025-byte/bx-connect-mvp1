package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.entity.StatutPaiement;
import com.bxjeunes.bx_connect.repository.SoutienFinancierRepository;
import com.bxjeunes.bx_connect.service.StripeService;
import com.bxjeunes.bx_connect.service.PayPalService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/** Activity UI facade only; payment execution stays in the existing provider services. */
@RestController
@RequestMapping("/api/activites")
public class ActivityPaymentController {
    private final ObjectProvider<StripeService> stripe;
    private final ObjectProvider<PayPalService> paypal;
    private final SoutienFinancierRepository payments;
    public ActivityPaymentController(ObjectProvider<StripeService> stripe, ObjectProvider<PayPalService> paypal,
                                     SoutienFinancierRepository payments) {
        this.stripe = stripe; this.paypal = paypal; this.payments = payments;
    }
    @GetMapping("paiement-options")
    public Map<String, Boolean> options() {
        return Map.of("STRIPE", stripe.getIfAvailable() != null, "PAYPAL", paypal.getIfAvailable() != null);
    }
    @PostMapping("/{id}/paiement/annuler")
    @PreAuthorize("hasRole('MEMBRE')")
    public void cancel(@PathVariable Long id, Authentication auth) throws Exception {
        var payment = payments.findByActiviteId(id).stream()
                .filter(p -> p.getDonateur().getEmail().equals(auth.getName()) && p.getStatutPaiement() == StatutPaiement.EN_ATTENTE)
                .findFirst().orElseThrow(() -> new IllegalArgumentException("Aucun paiement en attente."));
        if ("STRIPE".equals(payment.getFournisseur())) {
            stripe.getObject().annulerPaiementActivite(payment.getId());
        } else {
            if (payment.getPaypalPaymentId() == null)
                throw new IllegalArgumentException("Le paiement est encore en cours de vérification.");
            paypal.getObject().annulerPaiement(payment.getPaypalPaymentId());
        }
    }
}
