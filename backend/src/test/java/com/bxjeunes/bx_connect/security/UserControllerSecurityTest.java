package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.UserController;
import com.bxjeunes.bx_connect.service.UserService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@Import(SecurityConfig.class)
class UserControllerSecurityTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private UserService userService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;

    @Test
    @WithMockUser(username = "root@test.be", roles = "SUPER_ADMIN")
    @DisplayName("SUPER_ADMIN reste refuse sur les routes generales de profil")
    void super_admin_reste_refuse_sur_routes_generales_profil() throws Exception {
        mockMvc.perform(get("/api/users/me")).andExpect(status().isForbidden());
        mockMvc.perform(put("/api/users/me")
                        .contentType("application/json")
                        .content("{\"prenom\":\"Root\",\"nom\":\"Admin\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/users/me")).andExpect(status().isForbidden());

        verifyNoInteractions(userService);
    }

    @Test
    @WithMockUser(username = "root@test.be", roles = "SUPER_ADMIN")
    @DisplayName("SUPER_ADMIN peut changer uniquement son propre mot de passe")
    void super_admin_peut_changer_son_propre_mot_de_passe() throws Exception {
        mockMvc.perform(put("/api/users/me/password")
                        .contentType("application/json")
                        .content("{\"ancienMotDePasse\":\"AncienSecret123!\",\"nouveauMotDePasse\":\"NouveauSecret123!\"}"))
                .andExpect(status().isNoContent());

        verify(userService).changerMotDePasse(
                org.mockito.ArgumentMatchers.eq("root@test.be"),
                org.mockito.ArgumentMatchers.any(com.bxjeunes.bx_connect.dto.ChangePasswordRequest.class));
    }

    @Test
    @DisplayName("Visiteur anonyme reste refuse")
    void visiteur_anonyme_reste_refuse() throws Exception {
        mockMvc.perform(get("/api/users/me")).andExpect(status().isForbidden());
        verifyNoInteractions(userService);
    }

    @Test
    @WithMockUser(username = "admin@test.be", roles = "ADMIN")
    @DisplayName("ADMIN conserve l'acces a son profil general")
    void admin_conserve_acces_profil() throws Exception {
        mockMvc.perform(get("/api/users/me")).andExpect(status().isOk());
        verify(userService).getMonProfil("admin@test.be");
    }

    @Test
    @WithMockUser(username = "referent@test.be", roles = "REFERENT")
    @DisplayName("REFERENT conserve l'acces a son profil general")
    void referent_conserve_acces_profil() throws Exception {
        mockMvc.perform(get("/api/users/me")).andExpect(status().isOk());
        verify(userService).getMonProfil("referent@test.be");
    }

    @Test
    @WithMockUser(username = "partenaire@test.be", roles = "PARTENAIRE")
    @DisplayName("PARTENAIRE conserve l'acces a son profil general")
    void partenaire_conserve_acces_profil() throws Exception {
        mockMvc.perform(get("/api/users/me")).andExpect(status().isOk());
        verify(userService).getMonProfil("partenaire@test.be");
    }

    @Test
    @WithMockUser(username = "membre@test.be", roles = "MEMBRE")
    @DisplayName("MEMBRE conserve l'acces a son profil general")
    void membre_conserve_acces_profil() throws Exception {
        mockMvc.perform(get("/api/users/me")).andExpect(status().isOk());
        verify(userService).getMonProfil("membre@test.be");
    }
}
