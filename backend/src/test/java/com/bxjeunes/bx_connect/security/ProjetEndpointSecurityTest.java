package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.ProjetController;
import com.bxjeunes.bx_connect.dto.ProjetAdminResponse;
import com.bxjeunes.bx_connect.dto.ProjetResponse;
import com.bxjeunes.bx_connect.entity.Projet;
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

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

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
    @DisplayName("Le catalogue public ne serialise jamais les champs administratifs")
    void catalogue_public_masque_champs_administratifs() throws Exception {
        ProjetResponse response = ProjetResponse.fromEntity(new Projet());
        when(projetService.listerProjetsVisibles(null)).thenReturn(List.of(response));

        mockMvc.perform(get("/api/projets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].justificationAdmin").doesNotExist())
                .andExpect(jsonPath("$[0].bilan").doesNotExist())
                .andExpect(jsonPath("$[0].version").doesNotExist());
    }

    @Test
    @WithMockUser(username = "admin@test.be", roles = "ADMIN")
    @DisplayName("Seul ADMIN obtient justification et bilan par le detail dedie")
    void admin_obtient_detail_administratif() throws Exception {
        ProjetResponse response = ProjetResponse.fromEntity(new Projet());
        when(projetService.getProjetAdmin(1L, "admin@test.be"))
                .thenReturn(new ProjetAdminResponse(response, "Justification", "Bilan"));

        mockMvc.perform(get("/api/projets/admin/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.justificationAdmin").value("Justification"))
                .andExpect(jsonPath("$.bilan").value("Bilan"))
                .andExpect(jsonPath("$.version").doesNotExist());
    }

    @Test
    @WithMockUser(roles = "MEMBRE")
    @DisplayName("Un role non ADMIN ne peut pas obtenir le detail administratif")
    void membre_ne_peut_pas_obtenir_detail_administratif() throws Exception {
        mockMvc.perform(get("/api/projets/admin/1")).andExpect(status().isForbidden());
        verifyNoInteractions(projetService);
    }

    @Test
    @WithMockUser(roles = "PARTENAIRE")
    @DisplayName("PARTENAIRE ne peut pas obtenir le detail administratif")
    void partenaire_ne_peut_pas_obtenir_detail_administratif() throws Exception {
        mockMvc.perform(get("/api/projets/admin/1")).andExpect(status().isForbidden());
        verifyNoInteractions(projetService);
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    @DisplayName("SUPER_ADMIN ne peut pas obtenir le detail administratif")
    void super_admin_ne_peut_pas_obtenir_detail_administratif() throws Exception {
        mockMvc.perform(get("/api/projets/admin/1")).andExpect(status().isForbidden());
        verifyNoInteractions(projetService);
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
    @WithMockUser(username = "super@test.be", roles = "SUPER_ADMIN")
    @DisplayName("SUPER_ADMIN utilise les endpoints de catalogue sans privilege metier")
    void super_admin_utilise_catalogue_projets() throws Exception {
        mockMvc.perform(get("/api/projets")).andExpect(status().isOk());
        mockMvc.perform(get("/api/projets/page")).andExpect(status().isOk());
        mockMvc.perform(get("/api/projets/42")).andExpect(status().isOk());

        verify(projetService).listerProjetsVisibles("super@test.be");
        verify(projetService).listerProjetsVisiblesPage("super@test.be", 0, 20);
        verify(projetService).getProjet(42L, "super@test.be");
    }

    @Test
    @WithMockUser(username = "super@test.be", roles = "SUPER_ADMIN")
    @DisplayName("SUPER_ADMIN recoit 403 sur toutes les routes de commentaires projet")
    void super_admin_recoit_403_sur_commentaires() throws Exception {
        mockMvc.perform(get("/api/projets/42/commentaires")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/projets/42/commentaires/page")).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/projets/42/commentaires")
                        .contentType("application/json")
                        .content("{\"contenu\":\"Commentaire interdit\"}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(projetService);
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
                        .contentType("application/json")
                        .content("{\"texte\":\"ok terrain\"}"))
                .andExpect(status().isOk());

        verify(projetService).validerProjetReferent(1L, "ok terrain", "referent@test.be");
    }

    @Test
    @WithMockUser(username = "referent@test.be", roles = "REFERENT")
    @DisplayName("REFERENT peut appeler le refus terrain de ses projets")
    void referent_peut_appeler_refus_terrain() throws Exception {
        mockMvc.perform(patch("/api/projets/referent/1/refuser")
                        .contentType("application/json")
                        .content("{\"texte\":\"a revoir\"}"))
                .andExpect(status().isOk());

        verify(projetService).refuserProjetReferent(1L, "a revoir", "referent@test.be");
    }

    @Test
    @WithMockUser(username = "admin@test.be", roles = "ADMIN")
    @DisplayName("ADMIN utilise un corps JSON pour correction, rejet, fin et annulation")
    void admin_utilise_corps_json_pour_textes_transition() throws Exception {
        String body = "{\"texte\":\"Motif controle\"}";

        mockMvc.perform(patch("/api/projets/1/correction-admin").contentType("application/json").content(body))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/api/projets/1/valider").param("approuver", "false")
                        .contentType("application/json").content(body))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/api/projets/1/terminer").contentType("application/json").content(body))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/api/projets/1/annuler").contentType("application/json").content(body))
                .andExpect(status().isOk());

        verify(projetService).demanderCorrectionAdmin(1L, "Motif controle", "admin@test.be");
        verify(projetService).validerProjet(1L, false, "Motif controle", "admin@test.be");
        verify(projetService).terminerProjet(1L, "Motif controle", "admin@test.be");
        verify(projetService).annulerProjet(1L, "Motif controle", "admin@test.be");
    }

    @Test
    @WithMockUser(username = "referent@test.be", roles = "REFERENT")
    @DisplayName("Les textes de transition depassant 500 caracteres sont refuses")
    void texte_transition_trop_long_est_refuse() throws Exception {
        String body = "{\"texte\":\"" + "x".repeat(501) + "\"}";

        mockMvc.perform(patch("/api/projets/referent/1/correction")
                        .contentType("application/json").content(body))
                .andExpect(status().isUnprocessableEntity());

        verifyNoInteractions(projetService);
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
