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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
    @DisplayName("Visiteur peut appeler les projets publics pagines")
    void visiteur_peut_appeler_projets_publics_pages() throws Exception {
        mockMvc.perform(get("/api/projets/page"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Visiteur peut appeler les commentaires projet pagines")
    void visiteur_peut_appeler_commentaires_projet_pages() throws Exception {
        mockMvc.perform(get("/api/projets/1/commentaires/page"))
                .andExpect(status().isOk());
    }

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

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("ADMIN peut appeler les projets admin pagines")
    void admin_peut_appeler_projets_admin_pages() throws Exception {
        mockMvc.perform(get("/api/projets/admin/tous/page"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "REFERENT")
    @DisplayName("REFERENT ne peut pas appeler les projets admin pagines")
    void referent_ne_peut_pas_appeler_projets_admin_pages() throws Exception {
        mockMvc.perform(get("/api/projets/admin/tous/page"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PARTENAIRE")
    @DisplayName("PARTENAIRE ne peut pas appeler les projets admin pagines")
    void partenaire_ne_peut_pas_appeler_projets_admin_pages() throws Exception {
        mockMvc.perform(get("/api/projets/admin/tous/page"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "referent@test.be", roles = "REFERENT")
    @DisplayName("REFERENT peut appeler la modification dediee de ses projets")
    void referent_peut_appeler_modification_dediee() throws Exception {
        mockMvc.perform(put("/api/projets/referent/1")
                        .contentType("application/json")
                        .content("""
                                {
                                  "titre": "Projet modifie",
                                  "description": "Description",
                                  "groupeId": 10,
                                  "visibilite": "GROUPE"
                                }
                                """))
                .andExpect(status().isOk());

        verify(projetService).modifierProjetReferent(org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.eq("referent@test.be"));
    }

    @Test
    @WithMockUser(username = "referent@test.be", roles = "REFERENT")
    @DisplayName("REFERENT peut appeler la validation terrain de ses projets")
    void referent_peut_appeler_validation_terrain() throws Exception {
        mockMvc.perform(patch("/api/projets/referent/1/valider")
                        .param("commentaire", "ok terrain"))
                .andExpect(status().isOk());

        verify(projetService).validerProjetReferent(1L, "ok terrain", "referent@test.be");
    }

    @Test
    @WithMockUser(username = "referent@test.be", roles = "REFERENT")
    @DisplayName("REFERENT peut appeler le refus terrain de ses projets")
    void referent_peut_appeler_refus_terrain() throws Exception {
        mockMvc.perform(patch("/api/projets/referent/1/refuser")
                        .param("commentaire", "a revoir"))
                .andExpect(status().isOk());

        verify(projetService).refuserProjetReferent(1L, "a revoir", "referent@test.be");
    }

    @Test
    @WithMockUser(roles = "MEMBRE")
    @DisplayName("MEMBRE ne peut pas appeler la modification referent")
    void membre_ne_peut_pas_modifier_projet_referent() throws Exception {
        assertModifierProjetReferentForbidden();
    }

    @Test
    @WithMockUser(roles = "PARTENAIRE")
    @DisplayName("PARTENAIRE ne peut pas appeler la modification referent")
    void partenaire_ne_peut_pas_modifier_projet_referent() throws Exception {
        assertModifierProjetReferentForbidden();
    }

    @Test
    @WithMockUser(roles = "MEMBRE")
    @DisplayName("MEMBRE ne peut pas appeler la validation terrain referent")
    void membre_ne_peut_pas_valider_projet_referent() throws Exception {
        assertValidationProjetReferentForbidden();
    }

    @Test
    @WithMockUser(roles = "PARTENAIRE")
    @DisplayName("PARTENAIRE ne peut pas appeler la validation terrain referent")
    void partenaire_ne_peut_pas_valider_projet_referent() throws Exception {
        assertValidationProjetReferentForbidden();
    }

    private void assertRejoindreProjetForbidden() throws Exception {
        mockMvc.perform(post("/api/projets/1/rejoindre"))
                .andExpect(status().isForbidden());
    }

    private void assertModifierProjetReferentForbidden() throws Exception {
        mockMvc.perform(put("/api/projets/referent/1")
                        .contentType("application/json")
                        .content("""
                                {
                                  "titre": "Projet modifie",
                                  "groupeId": 10,
                                  "visibilite": "GROUPE"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    private void assertValidationProjetReferentForbidden() throws Exception {
        mockMvc.perform(patch("/api/projets/referent/1/valider"))
                .andExpect(status().isForbidden());
    }
}
