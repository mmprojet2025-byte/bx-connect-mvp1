package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.UserResponse;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final ActiviteRepository activiteRepository;
    private final InscriptionRepository inscriptionRepository;

    public AdminController(UserRepository userRepository,
                           ActiviteRepository activiteRepository,
                           InscriptionRepository inscriptionRepository) {
        this.userRepository = userRepository;
        this.activiteRepository = activiteRepository;
        this.inscriptionRepository = inscriptionRepository;
    }

    // ─── Statistiques globales ────────────────────────────────────────────────

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUtilisateurs", userRepository.count());
        stats.put("totalActivites", activiteRepository.count());
        stats.put("totalInscriptions", inscriptionRepository.count());
        stats.put("membresActifs", userRepository.countByActifTrue());
        stats.put("totalAdmins", userRepository.countByRole(Role.ADMIN));
        stats.put("totalReferents", userRepository.countByRole(Role.REFERENT));
        stats.put("totalMembres", userRepository.countByRole(Role.MEMBRE));
        stats.put("totalPartenaires", userRepository.countByRole(Role.PARTENAIRE));
        return ResponseEntity.ok(stats);
    }

    // ─── Gestion des utilisateurs ─────────────────────────────────────────────

    @GetMapping("/utilisateurs")
    public ResponseEntity<List<UserResponse>> getAllUtilisateurs() {
        List<UserResponse> users = userRepository.findAll()
                .stream()
                .map(UserResponse::fromEntity)
                .toList();
        return ResponseEntity.ok(users);
    }

    @PatchMapping("/utilisateurs/{id}/role")
    public ResponseEntity<UserResponse> changerRole(
            @PathVariable Long id,
            @RequestParam String role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        user.setRole(Role.valueOf(role.toUpperCase()));
        userRepository.save(user);
        return ResponseEntity.ok(UserResponse.fromEntity(user));
    }

    @PatchMapping("/utilisateurs/{id}/actif")
    public ResponseEntity<UserResponse> toggleActif(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        user.setActif(!user.isActif());
        userRepository.save(user);
        return ResponseEntity.ok(UserResponse.fromEntity(user));
    }

    @DeleteMapping("/utilisateurs/{id}")
    public ResponseEntity<Void> supprimerUtilisateur(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}