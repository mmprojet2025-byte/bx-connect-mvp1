package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class JwtCredentialsVersionTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(
                jwtService,
                "secretKey",
                "012345678901234567890123456789012345678901234567");
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 3_600_000L);
    }

    @Test
    void passwordChangeInvalidatesPreviouslyIssuedToken() {
        User user = new User();
        user.setEmail("member@example.org");
        user.setRole(Role.MEMBRE);
        user.setActif(true);
        user.setCredentialsVersion(2);

        String token = jwtService.generateToken(user);
        assertThat(jwtService.isTokenValid(token, user)).isTrue();

        user.setCredentialsVersion(3);
        assertThat(jwtService.isTokenValid(token, user)).isFalse();
    }
}
