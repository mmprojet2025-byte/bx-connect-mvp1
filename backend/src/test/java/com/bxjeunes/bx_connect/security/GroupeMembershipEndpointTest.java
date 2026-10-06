package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.*;
import com.bxjeunes.bx_connect.controller.*;
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

@WebMvcTest({ReferentController.class, GroupeController.class})
@Import(SecurityConfig.class)
class GroupeMembershipEndpointTest {
    @Autowired MockMvc mvc;
    @MockitoBean GroupeService groups;
    @MockitoBean ReferentService referents;
    @MockitoBean ProjetService projects;
    @MockitoBean JwtService jwt;
    @MockitoBean UserDetailsService userDetails;

    @ParameterizedTest @ValueSource(strings={"ADMIN","MEMBRE","SUPER_ADMIN","PARTENAIRE"})
    void suspensionAndReactivationAreReservedToReferents(String role) throws Exception {
        for (String action : new String[]{"desactiver","reactiver"}) {
            mvc.perform(patch("/api/referent/groupes/10/membres/20/"+action).with(user("actor").roles(role)))
                    .andExpect(status().isForbidden());
        }
        verifyNoInteractions(groups);
    }
    @Test void referentUsesScopedMembershipEndpoints() throws Exception {
        mvc.perform(patch("/api/referent/groupes/10/membres/20/desactiver").with(user("ref@test.be").roles("REFERENT")))
                .andExpect(status().isOk());
        verify(groups).verifierDemandeDansGroupe(20L,10L);
        verify(groups).changerAppartenance(20L,"ref@test.be",false);
    }
    @Test void referentCannotArchiveGroup() throws Exception {
        mvc.perform(delete("/api/groupes/10").with(user("ref@test.be").roles("REFERENT"))).andExpect(status().isForbidden());
        verifyNoInteractions(groups);
    }
    @Test void adminCanArchiveGroup() throws Exception {
        mvc.perform(delete("/api/groupes/10").with(user("admin@test.be").roles("ADMIN"))).andExpect(status().isNoContent());
        verify(groups).supprimerGroupe(10L,"admin@test.be");
    }
}
