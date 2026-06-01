package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.UserResponse;
import com.bxjeunes.bx_connect.dto.admin.CreateReferentRequest;
import com.bxjeunes.bx_connect.entity.Langue;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminReferentService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserResponse> listerReferents() {
        return userRepository.findByRole(Role.REFERENT).stream()
                .map(UserResponse::fromEntity)
                .toList();
    }

    public UserResponse creerReferent(CreateReferentRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Un compte existe deja avec cet email.");
        }

        User referent = User.builder()
                .prenom(request.getPrenom())
                .nom(request.getNom())
                .email(request.getEmail())
                .motDePasse(passwordEncoder.encode(request.getMotDePasseTemporaire()))
                .role(Role.REFERENT)
                .languePreference(Langue.FR)
                .actif(true)
                .build();

        return UserResponse.fromEntity(userRepository.save(referent));
    }

    public UserResponse nommerReferent(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (user.getRole() == Role.ADMIN || user.getRole() == Role.SUPER_ADMIN) {
            throw new AccessDeniedException("Impossible de nommer ce role comme REFERENT.");
        }

        user.setRole(Role.REFERENT);
        return UserResponse.fromEntity(userRepository.save(user));
    }
}
