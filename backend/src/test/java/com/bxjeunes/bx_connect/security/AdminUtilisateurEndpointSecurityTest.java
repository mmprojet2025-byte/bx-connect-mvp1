package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.AdminController;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.AdminReferentService;
import com.bxjeunes.bx_connect.service.GroupeService;
import com.bxjeunes.bx_connect.service.PrestationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;

import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.Mockito.when;

@WebMvcTest(AdminController.class)
@Import(SecurityConfig.class)
class AdminUtilisateurEndpointSecurityTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private UserRepository userRepository;
    @MockitoBean private ActiviteRepository activiteRepository;
    @MockitoBean private InscriptionRepository inscriptionRepository;
    @MockitoBean private GroupeRepository groupeRepository;
    @MockitoBean private GroupeService groupeService;
    @MockitoBean private AdminReferentService adminReferentService;
    @MockitoBean private PrestationService prestationService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("ADMIN peut appeler la liste utilisateurs paginee")
    void admin_peut_appeler_utilisateurs_page() throws Exception {
        when(userRepository.findByRoleIn(any(), any(Pageable.class))).thenReturn(Page.empty());

        mockMvc.perform(get("/api/admin/utilisateurs/page"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "MEMBRE")
    @DisplayName("MEMBRE ne peut pas appeler la liste utilisateurs paginee")
    void membre_ne_peut_pas_appeler_utilisateurs_page() throws Exception {
        mockMvc.perform(get("/api/admin/utilisateurs/page"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "REFERENT")
    @DisplayName("REFERENT ne peut pas appeler la liste utilisateurs paginee")
    void referent_ne_peut_pas_appeler_utilisateurs_page() throws Exception {
        mockMvc.perform(get("/api/admin/utilisateurs/page"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PARTENAIRE")
    @DisplayName("PARTENAIRE ne peut pas appeler la liste utilisateurs paginee")
    void partenaire_ne_peut_pas_appeler_utilisateurs_page() throws Exception {
        mockMvc.perform(get("/api/admin/utilisateurs/page"))
                .andExpect(status().isForbidden());
    }
}
