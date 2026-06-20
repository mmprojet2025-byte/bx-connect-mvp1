package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.AnnonceController;
import com.bxjeunes.bx_connect.service.AnnonceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnnonceController.class)
@Import(SecurityConfig.class)
class AnnonceEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private AnnonceService annonceService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;

    @Test
    @DisplayName("PARTENAIRE peut appeler la creation d'opportunite")
    @WithMockUser(roles = "PARTENAIRE")
    void partenaire_peut_creer_opportunite() throws Exception {
        mockMvc.perform(post("/api/annonces/opportunites")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "titre":"Offre d'emploi",
                                  "contenu":"Une opportunité utile.",
                                  "categorieOpportunite":"EMPLOI"
                                }
                                """))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("MEMBRE ne peut pas creer d'opportunite partenaire")
    @WithMockUser(roles = "MEMBRE")
    void membre_ne_peut_pas_creer_opportunite() throws Exception {
        mockMvc.perform(post("/api/annonces/opportunites")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "titre":"Offre d'emploi",
                                  "contenu":"Une opportunité utile.",
                                  "categorieOpportunite":"EMPLOI"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PARTENAIRE ne peut pas publier directement une opportunite")
    @WithMockUser(roles = "PARTENAIRE")
    void partenaire_ne_peut_pas_publier_directement() throws Exception {
        mockMvc.perform(patch("/api/annonces/admin/10/publier"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ADMIN peut consulter les opportunites a moderer")
    @WithMockUser(roles = "ADMIN")
    void admin_peut_consulter_opportunites() throws Exception {
        mockMvc.perform(get("/api/annonces/admin/opportunites"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ADMIN peut publier une opportunite")
    @WithMockUser(roles = "ADMIN")
    void admin_peut_publier_opportunite() throws Exception {
        mockMvc.perform(patch("/api/annonces/admin/10/publier"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ADMIN peut refuser une opportunite")
    @WithMockUser(roles = "ADMIN")
    void admin_peut_refuser_opportunite() throws Exception {
        mockMvc.perform(patch("/api/annonces/admin/10/refuser"))
                .andExpect(status().isOk());
    }
}
