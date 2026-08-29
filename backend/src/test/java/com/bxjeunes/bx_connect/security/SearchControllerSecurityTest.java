package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.SearchController;
import com.bxjeunes.bx_connect.service.SearchService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SearchController.class)
@Import(SecurityConfig.class)
class SearchControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private SearchService searchService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;

    @Test
    @WithMockUser(username = "super@test.be", roles = "SUPER_ADMIN")
    @DisplayName("SUPER_ADMIN recoit 403 sur la recherche globale")
    void super_admin_recoit_403() throws Exception {
        mockMvc.perform(get("/api/search").param("q", "membre"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(searchService);
    }

    @Test
    @DisplayName("Visiteur anonyme reste refuse sur la recherche globale")
    void visiteur_anonyme_reste_refuse() throws Exception {
        mockMvc.perform(get("/api/search").param("q", "membre"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(searchService);
    }

    @Test
    @WithMockUser(username = "admin@test.be", roles = "ADMIN")
    @DisplayName("ADMIN conserve la recherche globale")
    void admin_conserve_la_recherche() throws Exception {
        assertRoleCanSearch("admin@test.be");
    }

    @Test
    @WithMockUser(username = "referent@test.be", roles = "REFERENT")
    @DisplayName("REFERENT conserve la recherche globale")
    void referent_conserve_la_recherche() throws Exception {
        assertRoleCanSearch("referent@test.be");
    }

    @Test
    @WithMockUser(username = "partenaire@test.be", roles = "PARTENAIRE")
    @DisplayName("PARTENAIRE conserve la recherche globale")
    void partenaire_conserve_la_recherche() throws Exception {
        assertRoleCanSearch("partenaire@test.be");
    }

    @Test
    @WithMockUser(username = "membre@test.be", roles = "MEMBRE")
    @DisplayName("MEMBRE conserve la recherche globale")
    void membre_conserve_la_recherche() throws Exception {
        assertRoleCanSearch("membre@test.be");
    }

    private void assertRoleCanSearch(String email) throws Exception {
        mockMvc.perform(get("/api/search")
                        .param("q", "bx")
                        .param("types", "ACTIVITE")
                        .param("limit", "10"))
                .andExpect(status().isOk());

        verify(searchService).search(eq(email), eq("bx"), eq(List.of("ACTIVITE")), eq(10));
    }
}
