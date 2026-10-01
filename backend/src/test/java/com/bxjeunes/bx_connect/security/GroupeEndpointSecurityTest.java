package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.GroupeController;
import com.bxjeunes.bx_connect.dto.GroupePublicResponse;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.Mockito.when;

import java.util.List;

@WebMvcTest(GroupeController.class)
@Import(SecurityConfig.class)
class GroupeEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private GroupeService groupeService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;

    @Test
    @DisplayName("Visiteur peut appeler les groupes publics pagines")
    void visiteur_peut_appeler_groupes_publics_pages() throws Exception {
        mockMvc.perform(get("/api/groupes/page"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Le catalogue public ne serialise ni referent ni informations d'effectif")
    void catalogue_public_ne_serialise_pas_les_donnees_internes() throws Exception {
        when(groupeService.listerGroupesPublics()).thenReturn(List.of(
                new GroupePublicResponse(1L, "Groupe public", "Description publique", "Culture", "Arts",
                        null, null, null, null, null)
        ));

        mockMvc.perform(get("/api/groupes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nom").value("Groupe public"))
                .andExpect(jsonPath("$[0].referentPrenom").doesNotExist())
                .andExpect(jsonPath("$[0].referentNom").doesNotExist())
                .andExpect(jsonPath("$[0].referentId").doesNotExist())
                .andExpect(jsonPath("$[0].nombreMembres").doesNotExist())
                .andExpect(jsonPath("$[0].capaciteMax").doesNotExist());
    }

    @Test
    @DisplayName("La fiche publique ne serialise ni referent ni informations d'effectif")
    void fiche_publique_ne_serialise_pas_les_donnees_internes() throws Exception {
        when(groupeService.getGroupePublic(1L)).thenReturn(
                new GroupePublicResponse(1L, "Groupe public", "Description publique", "Culture", "Arts",
                        null, null, null, null, null)
        );

        mockMvc.perform(get("/api/groupes/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nom").value("Groupe public"))
                .andExpect(jsonPath("$.referentPrenom").doesNotExist())
                .andExpect(jsonPath("$.referentNom").doesNotExist())
                .andExpect(jsonPath("$.referentId").doesNotExist())
                .andExpect(jsonPath("$.nombreMembres").doesNotExist())
                .andExpect(jsonPath("$.capaciteMax").doesNotExist());
    }

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
