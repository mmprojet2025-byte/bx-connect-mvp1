package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.PasswordResetToken;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.PasswordResetTokenRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetEmailSender emailSender;
    private final Duration tokenTtl;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            PasswordResetEmailSender emailSender,
            @Value("${app.password-reset.token-ttl:PT15M}") Duration tokenTtl) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
        this.tokenTtl = tokenTtl;
    }

    @Transactional
    public void requestReset(String email) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .filter(User::isActif)
                .orElse(null);

        if (user == null) {
            performTimingWork();
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        tokenRepository.invalidateActiveTokens(user.getId(), now);

        String rawToken = generateToken();
        LocalDateTime expiresAt = now.plus(tokenTtl);
        tokenRepository.save(PasswordResetToken.builder()
                .user(user)
                .tokenHash(hash(rawToken))
                .createdAt(now)
                .expiresAt(expiresAt)
                .build());

        try {
            emailSender.send(user, rawToken, expiresAt);
        } catch (RuntimeException exception) {
            log.error("Password reset email delivery failed without exposing recipient or token data.");
        }
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        PasswordPolicy.validate(newPassword);
        LocalDateTime now = LocalDateTime.now();
        PasswordResetToken resetToken = tokenRepository.findActiveForUpdate(hash(rawToken))
                .orElseThrow(this::invalidToken);

        if (!resetToken.getExpiresAt().isAfter(now) || !resetToken.getUser().isActif()) {
            resetToken.setUsedAt(now);
            tokenRepository.save(resetToken);
            throw invalidToken();
        }

        User user = resetToken.getUser();
        user.setMotDePasse(passwordEncoder.encode(newPassword));
        user.setCredentialsVersion(user.getCredentialsVersion() + 1);
        userRepository.save(user);

        tokenRepository.invalidateActiveTokens(user.getId(), now);
        log.info("Password reset completed using a single-use token; no account or token data logged.");
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponible", exception);
        }
    }

    private void performTimingWork() {
        byte[] bytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        hash(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes));
    }

    private IllegalArgumentException invalidToken() {
        return new IllegalArgumentException("Le lien de reinitialisation est invalide ou expire.");
    }
}
