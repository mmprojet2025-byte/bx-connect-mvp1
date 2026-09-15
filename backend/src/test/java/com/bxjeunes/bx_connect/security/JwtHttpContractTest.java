package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtAuthFilter;
import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.config.SecurityConfig;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = JwtHttpContractTest.ContractController.class)
@Import({
        SecurityConfig.class,
        JwtAuthFilter.class,
        JwtService.class,
        JwtHttpContractTest.ContractControllerConfiguration.class
})
class JwtHttpContractTest {

    private static final String SECRET = "012345678901234567890123456789012345678901234567";

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @MockitoBean UserDetailsService userDetailsService;

    private User member;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(jwtService, "secretKey", SECRET);
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 3_600_000L);
        member = user("member@example.org", Role.MEMBRE, true, 2);
        when(userDetailsService.loadUserByUsername(member.getEmail())).thenReturn(member);
    }

    @Test
    void validSessionIsAuthenticated() throws Exception {
        mockMvc.perform(get("/api/session-contract/member")
                        .header("Authorization", bearer(jwtService.generateToken(member))))
                .andExpect(status().isOk());
    }

    @Test
    void expiredTokenReturnsUnauthorized() throws Exception {
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", -1L);
        String expired = jwtService.generateToken(member);
        mockMvc.perform(get("/api/session-contract/member")
                        .header("Authorization", bearer(expired)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void corruptTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/session-contract/member")
                        .header("Authorization", "Bearer corrupt.token.value"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void disabledAccountReturnsUnauthorized() throws Exception {
        String token = jwtService.generateToken(member);
        member.setActif(false);
        mockMvc.perform(get("/api/session-contract/member")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deletedAccountReturnsUnauthorized() throws Exception {
        String token = jwtService.generateToken(member);
        when(userDetailsService.loadUserByUsername(member.getEmail()))
                .thenThrow(new UsernameNotFoundException("deleted"));
        mockMvc.perform(get("/api/session-contract/member")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void technicalAccountLookupFailureIsNotReportedAsInvalidSession() {
        String token = jwtService.generateToken(member);
        when(userDetailsService.loadUserByUsername(member.getEmail()))
                .thenThrow(new IllegalStateException("database unavailable"));

        assertThrows(IllegalStateException.class, () ->
                mockMvc.perform(get("/api/session-contract/member")
                        .header("Authorization", bearer(token))));
    }

    @Test
    void tokenIssuedBeforePasswordChangeReturnsUnauthorized() throws Exception {
        String token = jwtService.generateToken(member);
        member.setCredentialsVersion(member.getCredentialsVersion() + 1);
        mockMvc.perform(get("/api/session-contract/member")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedUserWithoutPermissionKeepsForbiddenContract() throws Exception {
        mockMvc.perform(get("/api/session-contract/admin")
                        .header("Authorization", bearer(jwtService.generateToken(member))))
                .andExpect(status().isForbidden());
    }

    @Test
    void missingTokenKeepsExistingAnonymousForbiddenContract() throws Exception {
        mockMvc.perform(get("/api/session-contract/member"))
                .andExpect(status().isForbidden());
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private User user(String email, Role role, boolean active, int credentialsVersion) {
        User user = new User();
        user.setEmail(email);
        user.setRole(role);
        user.setActif(active);
        user.setCredentialsVersion(credentialsVersion);
        user.setMotDePasse("unused");
        return user;
    }

    @RestController
    public static class ContractController {
        @GetMapping("/api/session-contract/member")
        @PreAuthorize("hasRole('MEMBRE')")
        String member() {
            return "member";
        }

        @GetMapping("/api/session-contract/admin")
        @PreAuthorize("hasRole('ADMIN')")
        String admin() {
            return "admin";
        }
    }

    @TestConfiguration
    static class ContractControllerConfiguration {
        @Bean
        ContractController contractController() {
            return new ContractController();
        }
    }
}
