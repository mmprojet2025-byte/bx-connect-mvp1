package com.bxjeunes.bx_connect.security;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.controller.ProjetPaiementController;
import com.bxjeunes.bx_connect.service.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
@WebMvcTest(ProjetPaiementController.class)
@Import(SecurityConfig.class)
class ProjetPaiementEndpointTest {
    @Autowired MockMvc mvc;
    @MockitoBean ProjetParticipationPaiementService payments;
    @MockitoBean ProjetStripeCheckoutService stripe;
    @MockitoBean JwtService jwt;
    @MockitoBean UserDetailsService users;
    @Test void anonymousCannotAccessAnyFinancialEndpoint() throws Exception {
        for (String path : new String[]{"/mes-factures","/3/recu","/projets/2"})
            mvc.perform(get("/api/projets-paiements"+path)).andExpect(status().is4xxClientError());
        mvc.perform(post("/api/projets-paiements/projets/2/checkout")).andExpect(status().is4xxClientError());
        verifyNoInteractions(payments,stripe);
    }
    @ParameterizedTest @ValueSource(strings={"ADMIN","REFERENT","PARTENAIRE","SUPER_ADMIN"})
    void checkoutAndPersonalInvoicesAreMemberOnly(String role) throws Exception {
        mvc.perform(post("/api/projets-paiements/projets/2/checkout").with(user("actor").roles(role))).andExpect(status().isForbidden());
        mvc.perform(get("/api/projets-paiements/mes-factures").with(user("actor").roles(role))).andExpect(status().isForbidden());
        verifyNoInteractions(payments,stripe);
    }
    @Test void memberCannotReadProjectLedger() throws Exception {
        mvc.perform(get("/api/projets-paiements/projets/2").with(user("member").roles("MEMBRE"))).andExpect(status().isForbidden());
    }
    @Test void memberIdentityComesFromSessionNotRequest() throws Exception {
        mvc.perform(post("/api/projets-paiements/projets/2/checkout").with(user("member").roles("MEMBRE"))
            .contentType("application/json").content("{\"montant\":0.01,\"membreId\":999}")).andExpect(status().isOk());
        verify(stripe).checkout(2L,"member");
    }
    @ParameterizedTest @ValueSource(strings={"ADMIN","REFERENT"})
    void managersDelegateProjectScopeCheck(String role) throws Exception {
        mvc.perform(get("/api/projets-paiements/projets/2").with(user("manager").roles(role))).andExpect(status().isOk());
        verify(payments).forProject(2L,"manager");
    }
}
