package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountDeletionRequestTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private ProfilePhotoUrlValidator profilePhotoUrlValidator;

    @Test
    void disables_the_account_invalidates_existing_jwts_and_is_idempotent() {
        Clock clock = Clock.fixed(Instant.parse("2026-09-26T10:00:00Z"), ZoneOffset.UTC);
        UserService service = new UserService(userRepository, passwordEncoder, profilePhotoUrlValidator, clock);
        User user = User.builder().id(5L).email("member@example.org").role(Role.MEMBRE)
                .actif(true).credentialsVersion(7).build();
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));

        service.demanderSuppression(user.getEmail());
        service.demanderSuppression(user.getEmail());

        assertThat(user.isActif()).isFalse();
        assertThat(user.getCredentialsVersion()).isEqualTo(8);
        assertThat(user.getDeletionRequestedAt()).isNotNull();
        verify(userRepository, times(1)).save(user);
    }
}
