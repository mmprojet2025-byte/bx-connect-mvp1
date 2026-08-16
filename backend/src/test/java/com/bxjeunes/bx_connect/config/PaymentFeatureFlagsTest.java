package com.bxjeunes.bx_connect.config;

import com.bxjeunes.bx_connect.controller.PaiementController;
import com.bxjeunes.bx_connect.controller.StripeController;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.ProjetRepository;
import com.bxjeunes.bx_connect.repository.SoutienFinancierRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.PayPalService;
import com.bxjeunes.bx_connect.service.StripeService;
import com.paypal.base.rest.APIContext;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.http.HttpMessageConvertersAutoConfiguration;
import org.springframework.boot.autoconfigure.web.servlet.DispatcherServletAutoConfiguration;
import org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration;
import org.springframework.boot.test.context.assertj.AssertableApplicationContext;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PaymentFeatureFlagsTest {

    private final ApplicationContextRunner paymentContext = new ApplicationContextRunner()
            .withUserConfiguration(
                    StripeConfig.class,
                    StripeService.class,
                    StripeController.class,
                    PayPalConfig.class,
                    PayPalService.class,
                    PaiementController.class
            )
            .withBean(SoutienFinancierRepository.class, () -> mock(SoutienFinancierRepository.class))
            .withBean(UserRepository.class, () -> mock(UserRepository.class))
            .withBean(ActiviteRepository.class, () -> mock(ActiviteRepository.class))
            .withBean(ProjetRepository.class, () -> mock(ProjetRepository.class));

    @Test
    void absentFlagsDisableBothPaymentChains() {
        paymentContext.run(context -> assertPaymentChainsAbsent(context));
    }

    @Test
    void falseFlagsDisableBothPaymentChainsEvenWhenCredentialsArePresent() {
        paymentContext
                .withPropertyValues(
                        "features.payments.stripe.enabled=false",
                        "features.payments.paypal.enabled=false",
                        "stripe.secret-key=test-only-present-stripe-key",
                        "paypal.client-id=test-only-present-paypal-id"
                )
                .run(context -> assertPaymentChainsAbsent(context));
    }

    @Test
    void stripeCanBeEnabledWithoutPayPal() {
        paymentContext
                .withPropertyValues(validStripeProperties())
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(StripeConfig.class);
                    assertThat(context).hasSingleBean(StripeService.class);
                    assertThat(context).hasSingleBean(StripeController.class);
                    assertThat(context).doesNotHaveBean(PayPalConfig.class);
                    assertThat(context).doesNotHaveBean(PayPalService.class);
                    assertThat(context).doesNotHaveBean(PaiementController.class);
                    assertThat(context).doesNotHaveBean(APIContext.class);
                });
    }

    @Test
    void paypalCanBeEnabledWithoutStripe() {
        paymentContext
                .withPropertyValues(validPayPalProperties())
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(PayPalConfig.class);
                    assertThat(context).hasSingleBean(PayPalService.class);
                    assertThat(context).hasSingleBean(PaiementController.class);
                    assertThat(context).hasSingleBean(APIContext.class);
                    assertThat(context).doesNotHaveBean(StripeConfig.class);
                    assertThat(context).doesNotHaveBean(StripeService.class);
                    assertThat(context).doesNotHaveBean(StripeController.class);
                });
    }

    @Test
    void disabledPaymentEndpointsReturnNotFound() {
        new WebApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(
                        DispatcherServletAutoConfiguration.class,
                        WebMvcAutoConfiguration.class,
                        HttpMessageConvertersAutoConfiguration.class
                ))
                .withUserConfiguration(StripeController.class, PaiementController.class)
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    var mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
                    mockMvc.perform(get("/api/stripe/config"))
                            .andExpect(status().isNotFound());
                    mockMvc.perform(get("/api/paiements/confirmer"))
                            .andExpect(status().isNotFound());
                });
    }

    private void assertPaymentChainsAbsent(AssertableApplicationContext context) {
        assertThat(context).doesNotHaveBean(StripeConfig.class);
        assertThat(context).doesNotHaveBean(StripeService.class);
        assertThat(context).doesNotHaveBean(StripeController.class);
        assertThat(context).doesNotHaveBean(PayPalConfig.class);
        assertThat(context).doesNotHaveBean(PayPalService.class);
        assertThat(context).doesNotHaveBean(PaiementController.class);
        assertThat(context).doesNotHaveBean(APIContext.class);
    }

    private String[] validStripeProperties() {
        return new String[]{
                "features.payments.stripe.enabled=true",
                "features.payments.paypal.enabled=false",
                "stripe.secret-key=test-only-valid-stripe-secret-key",
                "stripe.publishable-key=test-only-valid-stripe-publishable-key",
                "stripe.webhook-secret=test-only-valid-stripe-webhook-key",
                "stripe.success-url=https://app.example.org/paiement/succes",
                "stripe.cancel-url=https://app.example.org/paiement/annule"
        };
    }

    private String[] validPayPalProperties() {
        return new String[]{
                "features.payments.paypal.enabled=true",
                "features.payments.stripe.enabled=false",
                "paypal.client-id=test-only-valid-paypal-client-id",
                "paypal.client-secret=test-only-valid-paypal-client-key",
                "paypal.mode=sandbox",
                "paypal.return-url=https://api.example.org/api/paiements/confirmer",
                "paypal.cancel-url=https://api.example.org/api/paiements/annuler"
        };
    }
}
