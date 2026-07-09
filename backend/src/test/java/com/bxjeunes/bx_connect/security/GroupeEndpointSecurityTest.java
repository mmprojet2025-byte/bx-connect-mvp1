package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.GroupeController;
import com.bxjeunes.bx_connect.service.GroupeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GroupeController.class)
@Import(SecurityConfig.class)
class GroupeEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private GroupeService groupeService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;

    @Test
    @DisplayName("L'acces public aux membres d'un groupe est refuse")
    void acces_public_refuse_aux_membres_du_groupe() throws Exception {
        mockMvc.perform(get("/api/groupes/1/membres"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("ADMIN peut appeler les groupes admin pagines")
    void admin_peut_appeler_groupes_admin_pages() throws Exception {
        mockMvc.perform(get("/api/groupes/admin/tous/page"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "REFERENT")
    @DisplayName("REFERENT ne peut pas appeler les groupes admin pagines")
    void referent_ne_peut_pas_appeler_groupes_admin_pages() throws Exception {
        mockMvc.perform(get("/api/groupes/admin/tous/page"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PARTENAIRE")
    @DisplayName("PARTENAIRE ne peut pas appeler les groupes admin pagines")
    void partenaire_ne_peut_pas_appeler_groupes_admin_pages() throws Exception {
        mockMvc.perform(get("/api/groupes/admin/tous/page"))
                .andExpect(status().isForbidden());
    }
}
