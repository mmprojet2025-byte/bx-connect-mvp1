package com.bxjeunes.bx_connect.controller;
import com.bxjeunes.bx_connect.dto.ProjetPaiementResponse;
import com.bxjeunes.bx_connect.service.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.List;

@RestController
@RequestMapping("/api/projets-paiements")
public class ProjetPaiementController {
    private final ProjetParticipationPaiementService payments;
    private final ObjectProvider<ProjetStripeCheckoutService> stripe;
    public ProjetPaiementController(ProjetParticipationPaiementService payments, ObjectProvider<ProjetStripeCheckoutService> stripe) {
        this.payments=payments; this.stripe=stripe;
    }
    @PostMapping("/projets/{id}/checkout")
    @PreAuthorize("hasRole('MEMBRE')")
    public ProjetPaiementResponse checkout(@PathVariable Long id, Authentication auth) throws Exception {
        var service = stripe.getIfAvailable();
        if (service == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Paiement indisponible.");
        return service.checkout(id, auth.getName());
    }
    @GetMapping("/mes-factures")
    @PreAuthorize("hasRole('MEMBRE')")
    public List<ProjetPaiementResponse> mine(Authentication auth) { return payments.mine(auth.getName()); }
    @PostMapping("/{id}/verifier")
    @PreAuthorize("hasRole('MEMBRE')")
    public ProjetPaiementResponse recover(@PathVariable Long id, Authentication auth) throws Exception {
        var service = stripe.getIfAvailable();
        if (service == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Vérification Stripe indisponible.");
        return service.recover(id, auth.getName());
    }
    @GetMapping("/{id}/recu")
    @PreAuthorize("hasAnyRole('MEMBRE','ADMIN','REFERENT')")
    public ProjetPaiementResponse receipt(@PathVariable Long id, Authentication auth) { return payments.receipt(id, auth.getName()); }
    @GetMapping("/projets/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','REFERENT')")
    public List<ProjetPaiementResponse> project(@PathVariable Long id, Authentication auth) { return payments.forProject(id, auth.getName()); }
}
