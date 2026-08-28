package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.BusinessConversationController;
import com.bxjeunes.bx_connect.service.BusinessConversationService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.Mockito.verifyNoInteractions;

@WebMvcTest(BusinessConversationController.class)
@Import(SecurityConfig.class)
class BusinessConversationControllerSecurityTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private BusinessConversationService businessConversationService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;

    @Test
    @DisplayName("La messagerie metier exige une authentification")
    void anonyme_interdit() throws Exception {
        mockMvc.perform(get("/api/conversations-metier"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "MEMBRE")
    @DisplayName("MEMBRE est interdit sur tous les endpoints de messagerie metier")
    void membre_interdit_partout() throws Exception {
        assertAllEndpointsForbidden();
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    @DisplayName("SUPER_ADMIN est interdit sur tous les endpoints de messagerie metier")
    void super_admin_interdit_partout() throws Exception {
        assertAllEndpointsForbidden();
        verifyNoInteractions(businessConversationService);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("ADMIN conserve l'acces aux conversations et a leur creation")
    void admin_conserve_ses_droits() throws Exception {
        mockMvc.perform(get("/api/conversations-metier"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/conversations-metier/admin-referent")
                        .contentType("application/json")
                        .content("{\"destinataireId\":2}"))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/conversations-metier/admin-partenaire")
                        .contentType("application/json")
                        .content("{\"destinataireId\":3}"))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(roles = "REFERENT")
    @DisplayName("REFERENT conserve l'acces aux conversations existantes")
    void referent_conserve_ses_droits() throws Exception {
        mockMvc.perform(get("/api/conversations-metier"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/conversations-metier/1/messages")
                        .contentType("application/json")
                        .content("{\"contenu\":\"Bonjour\"}"))
                .andExpect(status().isCreated());
        mockMvc.perform(patch("/api/conversations-metier/1/lu"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "PARTENAIRE")
    @DisplayName("PARTENAIRE conserve l'acces aux conversations existantes")
    void partenaire_conserve_ses_droits() throws Exception {
        mockMvc.perform(get("/api/conversations-metier/1"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/conversations-metier/1/messages"))
                .andExpect(status().isOk());
    }

    private void assertAllEndpointsForbidden() throws Exception {
        mockMvc.perform(get("/api/conversations-metier"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/conversations-metier/page"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/conversations-metier/1"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/conversations-metier/1/messages"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/conversations-metier/1/messages/page"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/conversations-metier/1/messages")
                        .contentType("application/json")
                        .content("{\"contenu\":\"Bonjour\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/conversations-metier/1/lu"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/conversations-metier/admin-referent")
                        .contentType("application/json")
                        .content("{\"destinataireId\":2}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/conversations-metier/admin-partenaire")
                        .contentType("application/json")
                        .content("{\"destinataireId\":3}"))
                .andExpect(status().isForbidden());
    }
}
