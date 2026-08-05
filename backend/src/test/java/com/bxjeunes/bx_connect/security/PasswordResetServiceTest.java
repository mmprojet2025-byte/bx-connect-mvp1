package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.entity.PasswordResetToken;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.PasswordResetTokenRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.PasswordResetEmailSender;
import com.bxjeunes.bx_connect.service.PasswordResetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository tokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private PasswordResetEmailSender emailSender;

    private PasswordResetService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new PasswordResetService(
                userRepository,
                tokenRepository,
                passwordEncoder,
                emailSender,
                Duration.ofMinutes(15));
        user = new User();
        user.setId(42L);
        user.setEmail("member@example.org");
        user.setActif(true);
    }

    @Test
    @DisplayName("La demande reste neutre pour une adresse inconnue")
    void unknownEmailDoesNotCreateOrSendToken() {
        when(userRepository.findByEmailIgnoreCase("unknown@example.org")).thenReturn(Optional.empty());

        service.requestReset(" Unknown@Example.org ");

        verify(tokenRepository, never()).save(any());
        verify(emailSender, never()).send(any(), anyString(), any());
    }

    @Test
    @DisplayName("Seul le hash SHA-256 du jeton est persiste")
    void requestPersistsOnlyTokenHash() throws Exception {
        when(userRepository.findByEmailIgnoreCase("member@example.org")).thenReturn(Optional.of(user));
        when(tokenRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.requestReset("MEMBER@example.org");

        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        ArgumentCaptor<String> rawTokenCaptor = ArgumentCaptor.forClass(String.class);
        verify(tokenRepository).save(tokenCaptor.capture());
        verify(emailSender).send(any(User.class), rawTokenCaptor.capture(), any(LocalDateTime.class));

        String rawToken = rawTokenCaptor.getValue();
        String expectedHash = HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        assertThat(rawToken).hasSizeGreaterThanOrEqualTo(43);
        assertThat(tokenCaptor.getValue().getTokenHash()).isEqualTo(expectedHash).doesNotContain(rawToken);
        assertThat(tokenCaptor.getValue().getExpiresAt())
                .isAfter(tokenCaptor.getValue().getCreatedAt())
                .isBeforeOrEqualTo(tokenCaptor.getValue().getCreatedAt().plusMinutes(15).plusSeconds(1));
        verify(tokenRepository).invalidateActiveTokens(any(), any());
    }

    @Test
    @DisplayName("Un jeton valide est consomme et change le mot de passe")
    void validTokenIsSingleUseAndChangesPassword() {
        PasswordResetToken token = token(LocalDateTime.now().plusMinutes(5));
        when(tokenRepository.findActiveForUpdate(anyString())).thenReturn(Optional.of(token));
        when(passwordEncoder.encode("NewSecure123!" )).thenReturn("bcrypt-hash");

        service.resetPassword("raw-reset-token-with-sufficient-length-123", "NewSecure123!");

        assertThat(user.getMotDePasse()).isEqualTo("bcrypt-hash");
        assertThat(user.getCredentialsVersion()).isEqualTo(1);
        verify(userRepository).save(user);
        verify(tokenRepository).invalidateActiveTokens(org.mockito.ArgumentMatchers.eq(user.getId()), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("Un jeton expire est invalide sans changer le mot de passe")
    void expiredTokenIsRejectedAndInvalidated() {
        PasswordResetToken token = token(LocalDateTime.now().minusSeconds(1));
        when(tokenRepository.findActiveForUpdate(anyString())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.resetPassword(
                "expired-reset-token-with-sufficient-length", "NewSecure123!"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("invalide ou expire");

        assertThat(token.getUsedAt()).isNotNull();
        verify(tokenRepository).save(token);
        verify(userRepository, never()).save(any());
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    @DisplayName("Un jeton deja utilise ou inconnu est refuse")
    void reusedTokenIsRejected() {
        when(tokenRepository.findActiveForUpdate(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.resetPassword(
                "already-used-token-with-sufficient-length", "NewSecure123!"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("invalide ou expire");
    }

    @Test
    @DisplayName("Un mot de passe faible est refuse avant toute lecture du jeton")
    void weakPasswordIsRejectedBeforeTokenLookup() {
        assertThatThrownBy(() -> service.resetPassword(
                "valid-looking-token-with-sufficient-length", "weakpassword"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("majuscule");

        verify(tokenRepository, never()).findActiveForUpdate(anyString());
    }

    private PasswordResetToken token(LocalDateTime expiresAt) {
        return PasswordResetToken.builder()
                .id(10L)
                .user(user)
                .tokenHash("hash")
                .createdAt(LocalDateTime.now().minusMinutes(1))
                .expiresAt(expiresAt)
                .build();
    }
}
