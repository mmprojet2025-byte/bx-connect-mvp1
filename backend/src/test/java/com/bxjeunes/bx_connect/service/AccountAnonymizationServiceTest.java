package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.PasswordResetTokenRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountAnonymizationServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-09-26T10:00:00Z"), ZoneOffset.UTC);

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private ProfilePhotoFileService profilePhotoFileService;

    private AccountAnonymizationService service;

    @BeforeEach
    void setUp() {
        service = new AccountAnonymizationService(userRepository, passwordResetTokenRepository,
                profilePhotoFileService, CLOCK);
    }

    @Test
    void leaves_a_request_younger_than_thirty_days_untouched() {
        LocalDateTime threshold = LocalDateTime.now(CLOCK).minusDays(30);
        when(userRepository.findByDeletionRequestedAtLessThanEqualAndAnonymizedAtIsNull(threshold))
                .thenReturn(List.of());

        assertThat(service.anonymizeEligibleAccounts()).isZero();
        verifyNoInteractions(passwordResetTokenRepository, profilePhotoFileService);
    }

    @Test
    void anonymizes_after_thirty_days_and_preserves_the_user_identifier_for_relations() {
        User user = User.builder()
                .id(42L).prenom("Amina").nom("Diallo").email("amina@example.org")
                .motDePasse("hash").photoProfilUrl("https://api.example.org/uploads/avatars/123e4567-e89b-12d3-a456-426614174000.webp")
                .dateNaissance(java.time.LocalDate.of(2000, 1, 1)).role(Role.MEMBRE)
                .credentialsVersion(3).actif(false)
                .deletionRequestedAt(LocalDateTime.now(CLOCK).minusDays(30)).build();
        LocalDateTime threshold = LocalDateTime.now(CLOCK).minusDays(30);
        when(userRepository.findByDeletionRequestedAtLessThanEqualAndAnonymizedAtIsNull(threshold))
                .thenReturn(List.of(user));

        assertThat(service.anonymizeEligibleAccounts()).isEqualTo(1);

        assertThat(user.getId()).isEqualTo(42L);
        assertThat(user.getPrenom()).isEqualTo("Compte");
        assertThat(user.getNom()).isEqualTo("supprimé");
        assertThat(user.getEmail()).matches("deleted-42-[0-9a-f-]+@anonymized\\.invalid");
        assertThat(user.getMotDePasse()).isNull();
        assertThat(user.getDateNaissance()).isNull();
        assertThat(user.getPhotoProfilUrl()).isNull();
        assertThat(user.getCredentialsVersion()).isEqualTo(4);
        assertThat(user.getAnonymizedAt()).isEqualTo(LocalDateTime.now(CLOCK));
        verify(profilePhotoFileService).deleteOwnedProfilePhoto("https://api.example.org/uploads/avatars/123e4567-e89b-12d3-a456-426614174000.webp");
        verify(passwordResetTokenRepository).deleteByUserId(42L);
        verify(userRepository).save(user);
    }
}
