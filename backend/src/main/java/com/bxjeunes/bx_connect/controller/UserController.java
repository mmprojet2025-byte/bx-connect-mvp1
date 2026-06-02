package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.ChangePasswordRequest;
import com.bxjeunes.bx_connect.dto.UserProfileRequest;
import com.bxjeunes.bx_connect.dto.UserProfileResponse;
import com.bxjeunes.bx_connect.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // ─── GET /api/users/me — Voir son profil (M01 CDC) ──────────────────────
    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'PARTENAIRE', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<UserProfileResponse> getMonProfil(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(userService.getMonProfil(email));
    }

    // ─── PUT /api/users/me — Modifier son profil (M02/M03 CDC) ─────────────
    @PutMapping("/me")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'PARTENAIRE', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<UserProfileResponse> modifierMonProfil(
            @Valid @RequestBody UserProfileRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(userService.modifierMonProfil(email, request));
    }

    // ─── PUT /api/users/me/password — Changer mot de passe (M04 CDC) ────────
    @PutMapping("/me/password")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'PARTENAIRE', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> changerMotDePasse(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        userService.changerMotDePasse(email, request);
        return ResponseEntity.noContent().build();
    }

    // ─── DELETE /api/users/me — Demander suppression du compte (M05 CDC) ────
    @DeleteMapping("/me")
    @PreAuthorize("hasAnyRole('MEMBRE', 'REFERENT', 'PARTENAIRE', 'ADMIN')")
    public ResponseEntity<Void> demanderSuppression(Authentication authentication) {
        String email = authentication.getName();
        userService.demanderSuppression(email);
        return ResponseEntity.noContent().build();
    }
}
