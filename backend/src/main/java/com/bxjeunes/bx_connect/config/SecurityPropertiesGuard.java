package com.bxjeunes.bx_connect.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

@Component
public class SecurityPropertiesGuard implements ApplicationRunner {

    private final Environment environment;

    public SecurityPropertiesGuard(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (isRelaxedProfile()) {
            return;
        }

        requireStrongSecret("jwt.secret", 32);
        requireRealSecret("stripe.secret-key");
        requireRealSecret("stripe.webhook-secret");
        requireRealSecret("paypal.client-id");
        requireRealSecret("paypal.client-secret");
    }

    private boolean isRelaxedProfile() {
        String[] profiles = environment.getActiveProfiles().length > 0
                ? environment.getActiveProfiles()
                : environment.getDefaultProfiles();
        return Arrays.stream(profiles)
                .anyMatch(profile -> profile.equals("dev") || profile.equals("local") || profile.equals("test"));
    }

    private void requireStrongSecret(String propertyName, int minBytes) {
        String value = requireRealSecret(propertyName);
        if (value.getBytes(StandardCharsets.UTF_8).length < minBytes) {
            throw new IllegalStateException(propertyName + " doit contenir au moins " + minBytes + " octets hors dev.");
        }
    }

    private String requireRealSecret(String propertyName) {
        String value = environment.getProperty(propertyName);
        if (value == null || value.isBlank() || value.contains("${") || isKnownDemoValue(value)) {
            throw new IllegalStateException(propertyName + " doit etre fourni via variable d'environnement hors dev.");
        }
        return value;
    }

    private boolean isKnownDemoValue(String value) {
        String normalized = value.toLowerCase();
        return normalized.equals("demo")
                || normalized.contains("change_me")
                || normalized.contains("local_secret")
                || normalized.endsWith("_demo");
    }
}
