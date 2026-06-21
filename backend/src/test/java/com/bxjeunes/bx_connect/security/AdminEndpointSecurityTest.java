package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.controller.MessagerieController;
import com.bxjeunes.bx_connect.controller.SuperAdminController;
import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.service.AuditLogService;
import com.bxjeunes.bx_connect.service.MessagerieService;
import com.bxjeunes.bx_connect.service.SuperAdminService;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {
        SuperAdminController.class,
        MessagerieController.class
})
@Import(SecurityConfig.class)
class AdminEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private SuperAdminService superAdminService;
    @MockitoBean private AuditLogService auditLogService;
    @MockitoBean private MessagerieService messagerieService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("ADMIN recoit 403 sur les endpoints SUPER_ADMIN")
    void admin_recoit_403_sur_super_admin() throws Exception {
        mockMvc.perform(get("/api/super-admin/dashboard"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/super-admin/admins"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/super-admin/logs"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/super-admin/logs/search"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    @DisplayName("SUPER_ADMIN peut consulter les logs filtres")
    void super_admin_peut_consulter_logs_filtres() throws Exception {
        mockMvc.perform(get("/api/super-admin/logs/search")
                        .param("action", "PROJECT_APPROVED")
                        .param("cibleType", "PROJECT")
                        .param("acteurRole", "ADMIN"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("ADMIN recoit 403 sur les endpoints messagerie groupe")
    void admin_recoit_403_sur_messagerie_groupe() throws Exception {
        assertMessagerieEndpointsForbidden();
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    @DisplayName("SUPER_ADMIN recoit 403 sur les endpoints messagerie groupe")
    void super_admin_recoit_403_sur_messagerie_groupe() throws Exception {
        assertMessagerieEndpointsForbidden();
    }

    private void assertMessagerieEndpointsForbidden() throws Exception {
        mockMvc.perform(get("/api/messagerie/fils"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/messagerie/fils/type/GENERAL"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/messagerie/fils/1"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/messagerie/fils")
                        .contentType("application/json")
                        .content("{\"titre\":\"Discussion\",\"groupeId\":1}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/messagerie/fils/1"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/messagerie/mon-groupe"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/messagerie/fils/1/messages"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/messagerie/groupes/1/fil"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/messagerie/messages")
                        .contentType("application/json")
                        .content("{\"contenu\":\"Test\",\"filId\":1}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/messagerie/groupes/1/messages")
                        .contentType("application/json")
                        .content("{\"contenu\":\"Test\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/messagerie/messages/1/lu"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/messagerie/fils/1/non-lus"))
                .andExpect(status().isForbidden());
    }
}
