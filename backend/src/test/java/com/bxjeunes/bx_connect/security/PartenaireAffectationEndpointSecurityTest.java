package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.AdminPartenaireAffectationController;
import com.bxjeunes.bx_connect.controller.PartenaireRelationsController;
import com.bxjeunes.bx_connect.controller.ReferentPartenaireController;
import com.bxjeunes.bx_connect.service.PartenaireAffectationService;
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

import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({
        AdminPartenaireAffectationController.class,
        ReferentPartenaireController.class,
        PartenaireRelationsController.class
})
@Import(SecurityConfig.class)
class PartenaireAffectationEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private PartenaireAffectationService partenaireAffectationService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;

    @Test
    @WithMockUser(username = "admin@test.be", roles = "ADMIN")
    @DisplayName("ADMIN peut affecter un partenaire a un referent")
    void admin_peut_affecter_partenaire_referent() throws Exception {
        mockMvc.perform(post("/api/admin/partenaires/10/referents/2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commentaire\":\"Suivi local\"}"))
                .andExpect(status().isOk());

        verify(partenaireAffectationService).affecterPartenaireAReferent(
                org.mockito.ArgumentMatchers.eq(10L),
                org.mockito.ArgumentMatchers.eq(2L),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.eq("admin@test.be"));
    }

    @Test
    @WithMockUser(username = "admin@test.be", roles = "ADMIN")
    @DisplayName("ADMIN peut affecter un partenaire a un groupe")
    void admin_peut_affecter_partenaire_groupe() throws Exception {
        mockMvc.perform(post("/api/admin/partenaires/10/groupes/20")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"typeLien\":\"MENTORAT\"}"))
                .andExpect(status().isOk());

        verify(partenaireAffectationService).affecterPartenaireAGroupe(
                org.mockito.ArgumentMatchers.eq(10L),
                org.mockito.ArgumentMatchers.eq(20L),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.eq("admin@test.be"));
    }

    @Test
    @WithMockUser(username = "admin@test.be", roles = "ADMIN")
    @DisplayName("ADMIN peut desactiver une affectation")
    void admin_peut_desactiver_affectation() throws Exception {
        mockMvc.perform(patch("/api/admin/partenaires/referents/100/desactiver"))
                .andExpect(status().isOk());

        verify(partenaireAffectationService).desactiverAffectationReferent(100L, "admin@test.be");
    }

    @Test
    @WithMockUser(roles = "MEMBRE")
    @DisplayName("MEMBRE ne peut pas gerer les affectations admin")
    void membre_ne_peut_pas_gerer_affectations() throws Exception {
        mockMvc.perform(post("/api/admin/partenaires/10/referents/2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "referent@test.be", roles = "REFERENT")
    @DisplayName("REFERENT peut consulter ses partenaires")
    void referent_peut_consulter_ses_partenaires() throws Exception {
        mockMvc.perform(get("/api/referent/partenaires"))
                .andExpect(status().isOk());

        verify(partenaireAffectationService).listerPartenairesReferent("referent@test.be");
    }

    @Test
    @WithMockUser(roles = "MEMBRE")
    @DisplayName("MEMBRE ne peut pas consulter les partenaires referent")
    void membre_ne_peut_pas_consulter_partenaires_referent() throws Exception {
        mockMvc.perform(get("/api/referent/partenaires"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "partenaire@test.be", roles = "PARTENAIRE")
    @DisplayName("PARTENAIRE peut consulter ses relations")
    void partenaire_peut_consulter_ses_relations() throws Exception {
        mockMvc.perform(get("/api/partenaire/mes-referents"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/partenaire/mes-groupes-lies"))
                .andExpect(status().isOk());

        verify(partenaireAffectationService).listerReferentsPartenaire("partenaire@test.be");
        verify(partenaireAffectationService).listerGroupesPartenaire("partenaire@test.be");
    }

    @Test
    @WithMockUser(roles = "MEMBRE")
    @DisplayName("MEMBRE ne peut pas consulter les relations partenaire")
    void membre_ne_peut_pas_consulter_relations_partenaire() throws Exception {
        mockMvc.perform(get("/api/partenaire/mes-referents"))
                .andExpect(status().isForbidden());
    }
}
