package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.ChangePasswordRequest;
import com.bxjeunes.bx_connect.dto.UserProfileRequest;
import com.bxjeunes.bx_connect.dto.UserProfileResponse;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ProfilePhotoUrlValidator profilePhotoUrlValidator;
    private final Clock clock;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       ProfilePhotoUrlValidator profilePhotoUrlValidator, Clock clock) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.profilePhotoUrlValidator = profilePhotoUrlValidator;
        this.clock = clock;
    }

    // ─── GET /api/users/me — Voir son profil (M01 CDC) ──────────────────────
    public UserProfileResponse getMonProfil(String email) {
        User user = requireGeneralUser(email);
        return UserProfileResponse.fromEntity(user);
    }

    // ─── PUT /api/users/me — Modifier son profil (M02/M03 CDC) ─────────────
    public UserProfileResponse modifierMonProfil(String email, UserProfileRequest request) {
        User user = requireGeneralUser(email);

        user.setPrenom(request.getPrenom());
        user.setNom(request.getNom());

        if (request.getLanguePreference() != null) {
            user.setLanguePreference(request.getLanguePreference());
        }
        if (request.getPhotoProfilUrl() != null) {
            user.setPhotoProfilUrl(profilePhotoUrlValidator.validateAndNormalize(request.getPhotoProfilUrl()));
        }

        userRepository.save(user);
        return UserProfileResponse.fromEntity(user);
    }

    // ─── PUT /api/users/me/password — Changer son mot de passe (M04 CDC) ────
    public void changerMotDePasse(String email, ChangePasswordRequest request) {
        User user = requireAuthenticatedUser(email);

        // Vérifier l'ancien mot de passe
        if (!passwordEncoder.matches(request.getAncienMotDePasse(), user.getMotDePasse())) {
            throw new RuntimeException("Ancien mot de passe incorrect");
        }

        PasswordPolicy.validate(request.getNouveauMotDePasse());
        user.setMotDePasse(passwordEncoder.encode(request.getNouveauMotDePasse()));
        user.setCredentialsVersion(user.getCredentialsVersion() + 1);
        userRepository.save(user);
    }

    // ─── DELETE /api/users/me — Demander suppression du compte (M05 CDC) ────
    @Transactional
    public void demanderSuppression(String email) {
        User user = requireGeneralUser(email);
        if (user.getDeletionRequestedAt() != null) {
            return;
        }

        user.setActif(false);
        user.setCredentialsVersion(user.getCredentialsVersion() + 1);
        user.setDeletionRequestedAt(LocalDateTime.now(clock));
        userRepository.save(user);
    }

    private User requireGeneralUser(String email) {
        User user = requireAuthenticatedUser(email);
        if (user.getRole() == Role.SUPER_ADMIN) {
            throw new AccessDeniedException("Le SUPER_ADMIN ne peut pas utiliser la gestion generale des utilisateurs.");
        }
        return user;
    }

    private User requireAuthenticatedUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
    }
}
