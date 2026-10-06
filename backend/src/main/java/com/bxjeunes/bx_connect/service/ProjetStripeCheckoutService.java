package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.ProjetPaiementResponse;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import com.stripe.net.RequestOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name="features.payments.stripe.enabled", havingValue="true")
public class ProjetStripeCheckoutService {
    private final ProjetParticipationPaiementService payments;
    @Value("${stripe.success-url}") private String successUrl;
    public ProjetStripeCheckoutService(ProjetParticipationPaiementService payments) { this.payments = payments; }

    public ProjetPaiementResponse checkout(Long projectId, String email) throws StripeException {
        var p = payments.prepare(projectId, email);
        if (p.getStripeSessionId() != null) {
            var remote = retrieve(p.getStripeSessionId());
            if ("expired".equals(remote.getStatus())) {
                payments.handle(remote, false);
                p = payments.prepare(projectId, email);
            } else return ProjetPaiementResponse.from(p);
        }
        // Never reuse an uncertain old attempt after Stripe's idempotency retention window.
        if (p.getExpiresAt() <= System.currentTimeMillis()/1000 + 1800)
            throw new IllegalArgumentException("Paiement en cours de vérification. Réessayez après confirmation de son expiration.");
        java.net.URI configured = java.net.URI.create(successUrl);
        String root = configured.getScheme() + "://" + configured.getRawAuthority();
        var params = SessionCreateParams.builder().setMode(SessionCreateParams.Mode.PAYMENT)
            .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
            .setExpiresAt(p.getExpiresAt())
            .setSuccessUrl(root + "/mes-factures?recu=" + p.getId())
            .setCancelUrl(root + "/mes-factures?recu=" + p.getId() + "&retour=annule")
            .putMetadata("project_participation_payment_id", p.getId().toString())
            .addLineItem(SessionCreateParams.LineItem.builder().setQuantity(1L)
                .setPriceData(SessionCreateParams.LineItem.PriceData.builder().setCurrency("eur")
                    .setUnitAmount(p.getMontant().movePointRight(2).longValueExact())
                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                        .setName("Participation — " + p.getTitreProjet()).build()).build()).build())
            .build();
        return payments.attach(p.getId(), create(params, p.getRequestKey()));
    }
    Session create(SessionCreateParams params, String key) throws StripeException {
        return Session.create(params, RequestOptions.builder().setIdempotencyKey("project-" + key).build());
    }
    Session retrieve(String id) throws StripeException { return Session.retrieve(id); }
}
