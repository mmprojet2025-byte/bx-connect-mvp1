package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.RequestIdFilter;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.AuthController;
import com.bxjeunes.bx_connect.service.AuthService;
import com.bxjeunes.bx_connect.service.PasswordResetService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, RequestIdFilter.class})
class PasswordResetEndpointSecurityTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private AuthService authService;
    @MockitoBean private PasswordResetService passwordResetService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;

    @Test
    @DisplayName("La demande de reinitialisation est publique et repond de maniere neutre")
    void forgotPasswordIsPublicAndNeutral() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType("application/json")
                        .content("{\"email\":\"member@example.org\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(
                        "Si un compte existe avec cette adresse, les instructions de reinitialisation ont ete envoyees."));

        verify(passwordResetService).requestReset("member@example.org");
    }

    @Test
    @DisplayName("Une adresse invalide est rejetee sans appeler le service")
    void invalidEmailIsRejected() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType("application/json")
                        .content("{\"email\":\"invalid\"}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("La consommation du jeton est publique et valide la requete")
    void resetPasswordIsPublic() throws Exception {
        String rawToken = "valid-reset-token-with-more-than-thirty-two-characters";
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType("application/json")
                        .content("{\"token\":\"" + rawToken
                                + "\",\"nouveauMotDePasse\":\"NewSecure123!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Mot de passe reinitialise avec succes."));

        verify(passwordResetService).resetPassword(rawToken, "NewSecure123!");
    }
}
