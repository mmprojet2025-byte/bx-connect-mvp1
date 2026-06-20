package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.PartenaireController;
import com.bxjeunes.bx_connect.service.PartenaireService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.http.MediaType;

@WebMvcTest(PartenaireController.class)
@Import(SecurityConfig.class)
class PartenaireProjetEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private PartenaireService partenaireService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;

    @Test
    @DisplayName("Visiteur peut consulter les partenaires publics")
    void visiteur_peut_lister_partenaires_publics() throws Exception {
        mockMvc.perform(get("/api/partenaire/publics"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Visiteur ne peut pas consulter les projets partenaires")
    void visiteur_ne_peut_pas_lister_projets_partenaires() throws Exception {
        mockMvc.perform(get("/api/partenaire/projets-ouverts"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "MEMBRE")
    @DisplayName("MEMBRE ne peut pas consulter le catalogue partenaire")
    void membre_ne_peut_pas_lister_projets_partenaires() throws Exception {
        mockMvc.perform(get("/api/partenaire/projets-ouverts"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PARTENAIRE")
    @DisplayName("PARTENAIRE peut consulter les projets ouverts au soutien")
    void partenaire_peut_lister_projets_partenaires() throws Exception {
        mockMvc.perform(get("/api/partenaire/projets-ouverts"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "MEMBRE")
    @DisplayName("MEMBRE ne peut pas consulter une fiche partenaire")
    void membre_ne_peut_pas_consulter_fiche_partenaire() throws Exception {
        mockMvc.perform(get("/api/partenaire/profil"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PARTENAIRE")
    @DisplayName("PARTENAIRE peut consulter sa fiche institutionnelle")
    void partenaire_peut_consulter_sa_fiche() throws Exception {
        mockMvc.perform(get("/api/partenaire/profil"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "PARTENAIRE")
    @DisplayName("PARTENAIRE peut appeler la modification de son soutien")
    void partenaire_peut_appeler_modification_soutien() throws Exception {
        mockMvc.perform(put("/api/partenaire/mes-soutiens/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"montant\":25,\"message\":\"Message mis à jour\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "MEMBRE")
    @DisplayName("MEMBRE ne peut pas modifier un soutien partenaire")
    void membre_ne_peut_pas_modifier_soutien_partenaire() throws Exception {
        mockMvc.perform(put("/api/partenaire/mes-soutiens/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"montant\":25,\"message\":\"Message mis à jour\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PARTENAIRE")
    @DisplayName("PARTENAIRE peut appeler l'annulation de son soutien")
    void partenaire_peut_appeler_annulation_soutien() throws Exception {
        mockMvc.perform(patch("/api/partenaire/mes-soutiens/10/annuler"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "MEMBRE")
    @DisplayName("MEMBRE ne peut pas annuler un soutien partenaire")
    void membre_ne_peut_pas_annuler_soutien_partenaire() throws Exception {
        mockMvc.perform(patch("/api/partenaire/mes-soutiens/10/annuler"))
                .andExpect(status().isForbidden());
    }
}
