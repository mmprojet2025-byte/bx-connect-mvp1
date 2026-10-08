package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.StripeController;
import com.bxjeunes.bx_connect.service.StripeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(value = StripeController.class, properties = "features.payments.stripe.enabled=true")
@Import(SecurityConfig.class)
class ActivityRecoveryEndpointTest {
    @Autowired MockMvc mvc;
    @MockitoBean StripeService stripe;
    @MockitoBean JwtService jwt;
    @MockitoBean UserDetailsService users;

    @Test void anonymousCannotRecover() throws Exception {
        mvc.perform(post("/api/stripe/activites/paiements/3/verifier")).andExpect(status().is4xxClientError());
        verifyNoInteractions(stripe);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "REFERENT", "PARTENAIRE", "SUPER_ADMIN"})
    void recoveryIsMemberOnly(String role) throws Exception {
        mvc.perform(post("/api/stripe/activites/paiements/3/verifier").with(user("actor").roles(role)))
                .andExpect(status().isForbidden());
        verifyNoInteractions(stripe);
    }

    @Test void usesAuthenticatedIdentityAndNeverAcceptsClientPaymentConfirmation() throws Exception {
        mvc.perform(post("/api/stripe/activites/paiements/3/verifier").with(user("owner").roles("MEMBRE"))
                .contentType("application/json").content("{\"email\":\"other\",\"paid\":true}"))
                .andExpect(status().isOk());
        verify(stripe).recupererPaiementActivite(3L, "owner");
    }

    @Test void foreignPaymentRemainsForbidden() throws Exception {
        when(stripe.recupererPaiementActivite(3L, "other"))
                .thenThrow(new org.springframework.security.access.AccessDeniedException("Forbidden"));
        mvc.perform(post("/api/stripe/activites/paiements/3/verifier").with(user("other").roles("MEMBRE")))
                .andExpect(status().isForbidden());
    }
}
