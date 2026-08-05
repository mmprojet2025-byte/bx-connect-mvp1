package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.AuthResponse;
import com.bxjeunes.bx_connect.dto.LoginRequest;
import com.bxjeunes.bx_connect.dto.RegisterRequest;
import com.bxjeunes.bx_connect.dto.ForgotPasswordRequest;
import com.bxjeunes.bx_connect.dto.ResetPasswordRequest;
import com.bxjeunes.bx_connect.service.AuthService;
import com.bxjeunes.bx_connect.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    private static final String RESET_REQUEST_MESSAGE =
            "Si un compte existe avec cette adresse, les instructions de reinitialisation ont ete envoyees.";

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        return ResponseEntity.ok(authService.register(request));
    }

    // POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<java.util.Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.getEmail());
        return ResponseEntity.ok(java.util.Map.of("message", RESET_REQUEST_MESSAGE));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<java.util.Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.getToken(), request.getNouveauMotDePasse());
        return ResponseEntity.ok(java.util.Map.of("message", "Mot de passe reinitialise avec succes."));
    }
}
