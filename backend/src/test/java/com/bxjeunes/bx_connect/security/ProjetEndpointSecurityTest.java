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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.Mockito.verify;

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

    @Test
    @WithMockUser(username = "referent@test.be", roles = "REFERENT")
    @DisplayName("REFERENT peut appeler la liste des projets de ses groupes")
    void referent_peut_lister_projets_de_ses_groupes() throws Exception {
        mockMvc.perform(get("/api/projets/referent/mes-groupes"))
                .andExpect(status().isOk());

        verify(projetService).projetsGroupesReferent("referent@test.be");
    }

    private void assertRejoindreProjetForbidden() throws Exception {
        mockMvc.perform(post("/api/projets/1/rejoindre"))
                .andExpect(status().isForbidden());
    }
}
