package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.config.JwtService;
import com.bxjeunes.bx_connect.dto.AuthResponse;
import com.bxjeunes.bx_connect.dto.LoginRequest;
import com.bxjeunes.bx_connect.dto.RegisterRequest;
import com.bxjeunes.bx_connect.entity.Langue;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    /**
     * Inscription publique.
     * SECURITE : role force a MEMBRE — jamais depuis le client.
     */
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Un compte existe deja avec cet email.");
        }

        User user = User.builder()
                .prenom(request.getPrenom())
                .nom(request.getNom())
                .email(request.getEmail())
                .motDePasse(passwordEncoder.encode(request.getMotDePasse()))
                .role(Role.MEMBRE)  // SECURITE : toujours MEMBRE, jamais depuis le client
                .languePreference(Langue.FR)
                .actif(true)
                .build();

        userRepository.save(user);
        String token = jwtService.generateToken(user);

        return AuthResponse.builder()
                .token(token)
                .prenom(user.getPrenom())
                .nom(user.getNom())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(), request.getMotDePasse()));
        } catch (DisabledException e) {
            throw new RuntimeException("Ce compte est desactive.");
        } catch (BadCredentialsException e) {
            throw new RuntimeException("Email ou mot de passe incorrect.");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable."));

        if (!user.isActif()) {
            throw new RuntimeException("Ce compte est desactive.");
        }

        String token = jwtService.generateToken(user);

        return AuthResponse.builder()
                .token(token)
                .prenom(user.getPrenom())
                .nom(user.getNom())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}
