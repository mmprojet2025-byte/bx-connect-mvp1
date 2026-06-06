package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.controller.PushDeviceController;
import com.bxjeunes.bx_connect.dto.PushPreferenceResponse;
import com.bxjeunes.bx_connect.service.PushDeviceService;
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
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PushDeviceController.class)
@Import(SecurityConfig.class)
class PushDeviceControllerSecurityTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private PushDeviceService pushDeviceService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UserDetailsService userDetailsService;

    @Test
    @DisplayName("Les preferences push exigent une authentification")
    void preferences_exigent_authentification() throws Exception {
        mockMvc.perform(get("/api/push/preferences"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "membre@test.be", roles = "MEMBRE")
    @DisplayName("Les preferences push sont lues pour l'utilisateur connecte")
    void preferences_utilisent_identite_connectee() throws Exception {
        when(pushDeviceService.getPreferences("membre@test.be"))
                .thenReturn(new PushPreferenceResponse(true, 1, 1));

        mockMvc.perform(get("/api/push/preferences"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.registeredDevices").value(1));

        verify(pushDeviceService).getPreferences("membre@test.be");
    }

    @Test
    @WithMockUser(username = "membre@test.be", roles = "MEMBRE")
    @DisplayName("La mise a jour push cible uniquement l'utilisateur connecte")
    void mise_a_jour_utilise_identite_connectee() throws Exception {
        when(pushDeviceService.mettreAJourPreferences("membre@test.be", false))
                .thenReturn(new PushPreferenceResponse(false, 1, 0));

        mockMvc.perform(put("/api/push/preferences")
                        .contentType("application/json")
                        .content("{\"enabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));

        verify(pushDeviceService).mettreAJourPreferences("membre@test.be", false);
    }
}
