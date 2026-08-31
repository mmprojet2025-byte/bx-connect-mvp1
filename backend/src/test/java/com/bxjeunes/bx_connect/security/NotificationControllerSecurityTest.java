package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.NotificationController;
import com.bxjeunes.bx_connect.service.NotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NotificationController.class)
@Import(SecurityConfig.class)
class NotificationControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private NotificationService notificationService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;

    @Test
    @WithMockUser(username = "super@test.be", roles = "SUPER_ADMIN")
    @DisplayName("SUPER_ADMIN recoit 403 sur tous les endpoints de notifications")
    void super_admin_recoit_403_sur_tous_les_endpoints() throws Exception {
        mockMvc.perform(get("/api/notifications")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/notifications/page")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/notifications/count")).andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/notifications/42/lue")).andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/notifications/toutes-lues")).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/notifications/42")).andExpect(status().isForbidden());

        verifyNoInteractions(notificationService);
    }

    @Test
    @DisplayName("Visiteur anonyme reste refuse")
    void visiteur_anonyme_reste_refuse() throws Exception {
        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(notificationService);
    }

    @Test
    @WithMockUser(username = "admin@test.be", roles = "ADMIN")
    @DisplayName("ADMIN conserve les notifications")
    void admin_conserve_les_notifications() throws Exception {
        assertRoleCanList("admin@test.be");
    }

    @Test
    @WithMockUser(username = "referent@test.be", roles = "REFERENT")
    @DisplayName("REFERENT conserve les notifications")
    void referent_conserve_les_notifications() throws Exception {
        assertRoleCanList("referent@test.be");
    }

    @Test
    @WithMockUser(username = "partenaire@test.be", roles = "PARTENAIRE")
    @DisplayName("PARTENAIRE conserve les notifications")
    void partenaire_conserve_les_notifications() throws Exception {
        assertRoleCanList("partenaire@test.be");
    }

    @Test
    @WithMockUser(username = "membre@test.be", roles = "MEMBRE")
    @DisplayName("MEMBRE conserve les notifications")
    void membre_conserve_les_notifications() throws Exception {
        assertRoleCanList("membre@test.be");
    }

    private void assertRoleCanList(String email) throws Exception {
        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isOk());

        verify(notificationService).mesNotifications(email);
    }
}
