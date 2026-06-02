package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.ProjetController;
import com.bxjeunes.bx_connect.service.ProjetService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProjetController.class)
@Import(SecurityConfig.class)
class ProjetEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private ProjetService projetService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("ADMIN recoit 403 sur rejoindreProjet")
    void admin_recoit_403_sur_rejoindre_projet() throws Exception {
        assertRejoindreProjetForbidden();
    }

    @Test
    @WithMockUser(roles = "REFERENT")
    @DisplayName("REFERENT recoit 403 sur rejoindreProjet")
    void referent_recoit_403_sur_rejoindre_projet() throws Exception {
        assertRejoindreProjetForbidden();
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    @DisplayName("SUPER_ADMIN recoit 403 sur rejoindreProjet")
    void super_admin_recoit_403_sur_rejoindre_projet() throws Exception {
        assertRejoindreProjetForbidden();
    }

    private void assertRejoindreProjetForbidden() throws Exception {
        mockMvc.perform(post("/api/projets/1/rejoindre"))
                .andExpect(status().isForbidden());
    }
}
