package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.PasswordResetTokenRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AccountAnonymizationService {

    static final int RETENTION_DAYS = 30;

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final ProfilePhotoFileService profilePhotoFileService;
    private final Clock clock;

    public AccountAnonymizationService(UserRepository userRepository,
                                       PasswordResetTokenRepository passwordResetTokenRepository,
                                       ProfilePhotoFileService profilePhotoFileService,
                                       Clock clock) {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.profilePhotoFileService = profilePhotoFileService;
        this.clock = clock;
    }

    @Transactional
    public int anonymizeEligibleAccounts() {
        LocalDateTime threshold = LocalDateTime.now(clock).minusDays(RETENTION_DAYS);
        List<User> users = userRepository.findByDeletionRequestedAtLessThanEqualAndAnonymizedAtIsNull(threshold);
        users.forEach(this::anonymize);
        return users.size();
    }

    private void anonymize(User user) {
        profilePhotoFileService.deleteOwnedProfilePhoto(user.getPhotoProfilUrl());
        passwordResetTokenRepository.deleteByUserId(user.getId());

        user.setPrenom("Compte");
        user.setNom("supprimé");
        user.setEmail("deleted-" + user.getId() + "-" + UUID.randomUUID() + "@anonymized.invalid");
        user.setDateNaissance(null);
        user.setMotDePasse(null);
        user.setPhotoProfilUrl(null);
        user.setCredentialsVersion(user.getCredentialsVersion() + 1);
        user.setActif(false);
        user.setAnonymizedAt(LocalDateTime.now(clock));
        userRepository.save(user);
    }
}
