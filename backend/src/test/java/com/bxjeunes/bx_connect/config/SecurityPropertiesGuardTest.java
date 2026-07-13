package com.bxjeunes.bx_connect.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SecurityPropertiesGuardTest {

    @Test
    void devProfileAllowsLocalDefaults() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("dev");
        environment.setProperty("jwt.secret", "short-dev-secret");
        environment.setProperty("stripe.secret-key", "sk_test_demo");
        environment.setProperty("stripe.webhook-secret", "whsec_demo");
        environment.setProperty("paypal.client-id", "demo");
        environment.setProperty("paypal.client-secret", "demo");

        assertThatCode(() -> guard(environment).validate())
                .doesNotThrowAnyException();
    }

    @Test
    void localProfileAllowsLocalDefaults() {
        MockEnvironment environment = relaxedEnvironment("local");

        assertThatCode(() -> guard(environment).validate())
                .doesNotThrowAnyException();
    }

    @Test
    void testProfileAllowsLocalDefaults() {
        MockEnvironment environment = relaxedEnvironment("test");

        assertThatCode(() -> guard(environment).validate())
                .doesNotThrowAnyException();
    }

    @Test
    void productionFlagRequiresProdProfile() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("dev");
        environment.setProperty("bx.production", "true");

        assertThatThrownBy(() -> guard(environment).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SPRING_PROFILES_ACTIVE=prod");
    }

    @Test
    void mixedProdDevProfileIsNotRelaxed() {
        MockEnvironment environment = relaxedEnvironment("prod", "dev");

        assertThatThrownBy(() -> guard(environment).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("jwt.secret");
    }

    @Test
    void mixedProdTestProfileIsNotRelaxed() {
        MockEnvironment environment = relaxedEnvironment("prod", "test");

        assertThatThrownBy(() -> guard(environment).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("jwt.secret");
    }

    @Test
    void mixedProdLocalProfileIsNotRelaxed() {
        MockEnvironment environment = relaxedEnvironment("prod", "local");

        assertThatThrownBy(() -> guard(environment).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("jwt.secret");
    }

    @Test
    void prodProfileRejectsMissingSecrets() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");

        assertThatThrownBy(() -> guard(environment).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("jwt.secret");
    }

    @Test
    void prodProfileRejectsLocalDatasource() {
        MockEnvironment environment = validProdEnvironment();
        environment.setProperty(
                "spring.datasource.url",
                "jdbc:mysql://localhost:3306/bxconnect_mvp1?createDatabaseIfNotExist=true&useSSL=false"
        );

        assertThatThrownBy(() -> guard(environment).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("spring.datasource.url");
    }

    @Test
    void prodProfileRejectsRemoteDatasourceWithSslDisabled() {
        MockEnvironment environment = validProdEnvironment();
        environment.setProperty(
                "spring.datasource.url",
                "jdbc:mysql://db.example.org:3306/bxconnect?useSSL=false&serverTimezone=UTC"
        );

        assertThatThrownBy(() -> guard(environment).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("spring.datasource.url");
    }

    @Test
    void prodProfileRejectsRemoteDatasourceWithPublicKeyRetrieval() {
        MockEnvironment environment = validProdEnvironment();
        environment.setProperty(
                "spring.datasource.url",
                "jdbc:mysql://db.example.org:3306/bxconnect?useSSL=true&allowPublicKeyRetrieval=true"
        );

        assertThatThrownBy(() -> guard(environment).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("spring.datasource.url");
    }

    @Test
    void prodProfileRejectsUnsafeCorsOrigins() {
        MockEnvironment environment = validProdEnvironment();
        environment.setProperty("app.cors.allowed-origins", "https://app.example.org,http://localhost:5173");

        assertThatThrownBy(() -> guard(environment).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.cors.allowed-origins");
    }

    @Test
    void prodProfileAcceptsExplicitSafeConfiguration() {
        MockEnvironment environment = validProdEnvironment();

        assertThatCode(() -> guard(environment).validate())
                .doesNotThrowAnyException();
    }

    private SecurityPropertiesGuard guard(MockEnvironment environment) {
        SecurityPropertiesGuard guard = new SecurityPropertiesGuard();
        guard.setEnvironment(environment);
        return guard;
    }

    private MockEnvironment relaxedEnvironment(String... profiles) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(profiles);
        environment.setProperty("jwt.secret", "short-dev-secret");
        environment.setProperty("stripe.secret-key", "sk_test_demo");
        environment.setProperty("stripe.webhook-secret", "whsec_demo");
        environment.setProperty("paypal.client-id", "demo");
        environment.setProperty("paypal.client-secret", "demo");
        return environment;
    }

    private MockEnvironment validProdEnvironment() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        environment.setProperty("bx.production", "true");
        environment.setProperty("jwt.secret", "01234567890123456789012345678901");
        environment.setProperty("stripe.secret-key", "sk_live_valid_secret");
        environment.setProperty("stripe.webhook-secret", "whsec_live_valid_secret");
        environment.setProperty("paypal.client-id", "paypal-live-client-id");
        environment.setProperty("paypal.client-secret", "paypal-live-client-secret");
        environment.setProperty("spring.datasource.url", "jdbc:mysql://db.example.org:3306/bxconnect?useSSL=true&serverTimezone=UTC");
        environment.setProperty("spring.datasource.username", "bxconnect_app");
        environment.setProperty("spring.datasource.password", "strong-db-password");
        environment.setProperty("app.cors.allowed-origins", "https://app.example.org,https://admin.example.org");
        environment.setProperty("frontend.url", "https://app.example.org");
        environment.setProperty("stripe.success-url", "https://app.example.org/paiement/succes");
        environment.setProperty("stripe.cancel-url", "https://app.example.org/paiement/annule");
        environment.setProperty("paypal.return-url", "https://api.example.org/api/paiements/confirmer");
        environment.setProperty("paypal.cancel-url", "https://api.example.org/api/paiements/annuler");
        return environment;
    }
}
