package com.bxjeunes.bx_connect.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(
        name = "features.payments.stripe.enabled",
        havingValue = "true",
        matchIfMissing = false
)
public class StripeConfig {

    @Value("${stripe.secret-key}")
    private String secretKey;

    @Value("${stripe.publishable-key}")
    private String publishableKey;

    // ─── Initialise la clé secrète Stripe au démarrage ────────────────────────
    @PostConstruct
    public void init() {
        Stripe.apiKey = secretKey;
    }

    public String getPublishableKey() {
        return publishableKey;
    }
}
