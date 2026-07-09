package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.ActiviteController;
import com.bxjeunes.bx_connect.controller.InscriptionController;
import com.bxjeunes.bx_connect.service.ActiviteService;
import com.bxjeunes.bx_connect.service.InscriptionService;
import com.bxjeunes.bx_connect.service.PresenceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {
        ActiviteController.class,
        InscriptionController.class
})
@Import(SecurityConfig.class)
class ActiviteEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private ActiviteService activiteService;
    @MockitoBean private InscriptionService inscriptionService;
    @MockitoBean private PresenceService presenceService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;

    @Test
    @DisplayName("Visiteur peut appeler les activites publiques paginees")
    void visiteur_peut_appeler_activites_publiques_pagees() throws Exception {
        mockMvc.perform(get("/api/activites/page"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("ADMIN peut appeler les activites admin paginees")
    void admin_peut_appeler_activites_admin_pagees() throws Exception {
        mockMvc.perform(get("/api/activites/admin/toutes/page"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "REFERENT")
    @DisplayName("REFERENT ne peut pas appeler les activites admin paginees")
    void referent_ne_peut_pas_appeler_activites_admin_pagees() throws Exception {
        mockMvc.perform(get("/api/activites/admin/toutes/page"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("ADMIN ne peut pas utiliser les endpoints d'inscription membre")
    void admin_ne_peut_pas_s_inscrire() throws Exception {
        assertInscriptionMembreEndpointsForbidden();
    }

    @Test
    @WithMockUser(roles = "REFERENT")
    @DisplayName("REFERENT ne peut pas utiliser les endpoints d'inscription membre")
    void referent_ne_peut_pas_s_inscrire() throws Exception {
        assertInscriptionMembreEndpointsForbidden();
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    @DisplayName("SUPER_ADMIN ne peut pas utiliser les endpoints d'inscription membre")
    void super_admin_ne_peut_pas_s_inscrire() throws Exception {
        assertInscriptionMembreEndpointsForbidden();
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    @DisplayName("SUPER_ADMIN recoit 403 sur les endpoints activite metier")
    void super_admin_recoit_403_sur_endpoints_activite_metier() throws Exception {
        mockMvc.perform(get("/api/activites/admin/toutes"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/activites/mes-activites"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/activites")
                        .contentType("application/json")
                        .content(activiteJson()))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/activites/1")
                        .contentType("application/json")
                        .content(activiteJson()))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/activites/1/statut?statut=PUBLIEE"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/activites/1"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/inscriptions/activite/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "MEMBRE")
    @DisplayName("MEMBRE ne peut pas gerer les presences")
    void membre_ne_peut_pas_gerer_presences() throws Exception {
        mockMvc.perform(get("/api/activites/1/presences"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/activites/1/presences/2")
                        .contentType("application/json")
                        .content("{\"statutPresence\":\"PRESENT\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/activites/1/presences/bulk")
                        .contentType("application/json")
                        .content("{\"presences\":[{\"inscriptionId\":2,\"statutPresence\":\"PRESENT\"}]}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/activites/1/presences/cloturer"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    @DisplayName("SUPER_ADMIN peut consulter mais pas gerer les presences")
    void super_admin_consulte_presences_sans_gerer() throws Exception {
        mockMvc.perform(get("/api/activites/1/presences"))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/api/activites/1/presences/2")
                        .contentType("application/json")
                        .content("{\"statutPresence\":\"PRESENT\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/activites/1/presences/bulk")
                        .contentType("application/json")
                        .content("{\"presences\":[{\"inscriptionId\":2,\"statutPresence\":\"PRESENT\"}]}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/activites/1/presences/cloturer"))
                .andExpect(status().isForbidden());
    }

    private void assertInscriptionMembreEndpointsForbidden() throws Exception {
        mockMvc.perform(post("/api/inscriptions")
                        .contentType("application/json")
                        .content("{\"activiteId\":1}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/inscriptions/mes-inscriptions"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/inscriptions/1"))
                .andExpect(status().isForbidden());
    }

    private String activiteJson() {
        return """
                {
                  "titre":"Atelier",
                  "description":"Description",
                  "dateDebut":"2026-06-10T10:00:00",
                  "dateFin":"2026-06-10T12:00:00",
                  "lieu":"Bruxelles",
                  "gratuite":true,
                  "capaciteMax":10,
                  "categorie":"Formation",
                  "theme":"Innovation"
                }
                """;
    }
}
