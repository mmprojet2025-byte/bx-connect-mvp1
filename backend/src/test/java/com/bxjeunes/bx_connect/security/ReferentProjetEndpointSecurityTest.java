package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.ReferentController;
import com.bxjeunes.bx_connect.service.GroupeService;
import com.bxjeunes.bx_connect.service.ProjetService;
import com.bxjeunes.bx_connect.service.ReferentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReferentController.class)
@Import(SecurityConfig.class)
class ReferentProjetEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private ReferentService referentService;
    @MockitoBean private GroupeService groupeService;
    @MockitoBean private ProjetService projetService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;

    @Test
    @WithMockUser(roles = "REFERENT")
    @DisplayName("Validation projet par referent reste bloquee")
    void validation_projet_referent_reste_bloquee() throws Exception {
        mockMvc.perform(patch("/api/referent/projets/1/valider"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "REFERENT")
    @DisplayName("Refus projet par referent reste bloque")
    void refus_projet_referent_reste_bloque() throws Exception {
        mockMvc.perform(patch("/api/referent/projets/1/refuser"))
                .andExpect(status().isForbidden());
    }
}
