package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.GroupeResponse;
import com.bxjeunes.bx_connect.dto.UserResponse;
import com.bxjeunes.bx_connect.dto.admin.AdminGroupeRequest;
import com.bxjeunes.bx_connect.dto.admin.CreateReferentRequest;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutGroupe;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.GroupeService;
import com.bxjeunes.bx_connect.service.AdminReferentService;
import com.bxjeunes.bx_connect.service.PrestationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
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
    private final GroupeRepository groupeRepository;
    private final GroupeService groupeService;
    private final AdminReferentService adminReferentService;
    private final PrestationService prestationService;

    public AdminController(UserRepository userRepository,
                           ActiviteRepository activiteRepository,
                           InscriptionRepository inscriptionRepository,
                           GroupeRepository groupeRepository,
                           GroupeService groupeService,
                           AdminReferentService adminReferentService,
                           PrestationService prestationService) {
        this.userRepository       = userRepository;
        this.activiteRepository   = activiteRepository;
        this.inscriptionRepository = inscriptionRepository;
        this.groupeRepository     = groupeRepository;
        this.groupeService        = groupeService;
        this.adminReferentService = adminReferentService;
        this.prestationService    = prestationService;
    }

    // ─── Statistiques globales enrichies ─────────────────────────────────────
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();

        // Utilisateurs
        stats.put("totalUtilisateurs",  userRepository.countByRoleIn(
                List.of(Role.MEMBRE, Role.REFERENT, Role.PARTENAIRE)));
        stats.put("membresActifs",       userRepository.countByActifTrue());
        stats.put("totalAdmins",         userRepository.countByRole(Role.ADMIN));
        stats.put("totalReferents",      userRepository.countByRole(Role.REFERENT));
        stats.put("totalMembres",        userRepository.countByRole(Role.MEMBRE));
        stats.put("totalPartenaires",    userRepository.countByRole(Role.PARTENAIRE));

        // Activités
        stats.put("totalActivites",      activiteRepository.count());
        stats.put("totalInscriptions",   inscriptionRepository.count());

        // Groupes
        stats.put("totalGroupes",        groupeRepository.count());
        stats.put("groupesValides",      groupeRepository.findByStatut(StatutGroupe.VALIDE).size());
        stats.put("groupesEnAttente",    groupeRepository.findByStatut(StatutGroupe.EN_ATTENTE).size());

        // Bénévolat
        Map<String, Object> statsBenevolat = prestationService.statistiques();
        stats.put("prestationsEnAttente", statsBenevolat.get("enAttente"));
        stats.put("prestationsValidees",  statsBenevolat.get("validees"));

        return ResponseEntity.ok(stats);
    }

    // ─── Gestion des utilisateurs ─────────────────────────────────────────────

    @GetMapping("/utilisateurs")
    public ResponseEntity<List<UserResponse>> getAllUtilisateurs() {
        return ResponseEntity.ok(
            userRepository.findAll().stream()
                .filter(user -> user.getRole() != Role.ADMIN && user.getRole() != Role.SUPER_ADMIN)
                .map(UserResponse::fromEntity)
                .toList()
        );
    }

    @PatchMapping("/utilisateurs/{id}/role")
    public ResponseEntity<UserResponse> changerRole(
            @PathVariable Long id,
            @RequestParam String role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        verifierUtilisateurModifiableParAdmin(user);

        Role nouveauRole = Role.valueOf(role.toUpperCase());
        if (nouveauRole == Role.ADMIN || nouveauRole == Role.SUPER_ADMIN) {
            throw new AccessDeniedException("Un ADMIN ne peut pas creer ou promouvoir un ADMIN/SUPER_ADMIN.");
        }

        user.setRole(nouveauRole);
        userRepository.save(user);
        return ResponseEntity.ok(UserResponse.fromEntity(user));
    }

    @PatchMapping("/utilisateurs/{id}/actif")
    public ResponseEntity<UserResponse> toggleActif(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        verifierUtilisateurModifiableParAdmin(user);
        user.setActif(!user.isActif());
        userRepository.save(user);
        return ResponseEntity.ok(UserResponse.fromEntity(user));
    }

    @DeleteMapping("/utilisateurs/{id}")
    public ResponseEntity<Void> supprimerUtilisateur(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        verifierUtilisateurModifiableParAdmin(user);
        userRepository.delete(user);
        return ResponseEntity.noContent().build();
    }

    // ─── Gestion des referents ───────────────────────────────────────────────

    @GetMapping("/referents")
    public ResponseEntity<List<UserResponse>> listerReferents() {
        return ResponseEntity.ok(adminReferentService.listerReferents());
    }

    @PostMapping("/referents")
    public ResponseEntity<UserResponse> creerReferent(
            @Valid @RequestBody CreateReferentRequest request) {
        return ResponseEntity.ok(adminReferentService.creerReferent(request));
    }

    @PatchMapping("/utilisateurs/{id}/nommer-referent")
    public ResponseEntity<UserResponse> nommerReferent(@PathVariable Long id) {
        return ResponseEntity.ok(adminReferentService.nommerReferent(id));
    }

    private void verifierUtilisateurModifiableParAdmin(User user) {
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.SUPER_ADMIN) {
            throw new AccessDeniedException("Un ADMIN ne peut pas modifier un ADMIN ou un SUPER_ADMIN.");
        }
    }

    // ─── Gestion des groupes ──────────────────────────────────────────────────

    @GetMapping("/groupes")
    public ResponseEntity<List<GroupeResponse>> tousLesGroupesAdmin() {
        return ResponseEntity.ok(groupeService.tousLesGroupes());
    }

    @PostMapping("/groupes")
    public ResponseEntity<GroupeResponse> creerGroupe(
            @Valid @RequestBody AdminGroupeRequest request) {
        return ResponseEntity.ok(groupeService.creerGroupeParAdmin(request));
    }

    @PatchMapping("/groupes/{groupeId}/referent/{referentId}")
    public ResponseEntity<GroupeResponse> assignerReferent(
            @PathVariable Long groupeId,
            @PathVariable Long referentId) {
        return ResponseEntity.ok(groupeService.assignerReferent(groupeId, referentId));
    }

    // GET /api/admin/groupes/en-attente — Groupes en attente de validation
    @GetMapping("/groupes/en-attente")
    public ResponseEntity<List<GroupeResponse>> groupesEnAttente() {
        return ResponseEntity.ok(groupeService.groupesEnAttente());
    }

    // PATCH /api/admin/groupes/{id}/valider — Valider un groupe
    @PatchMapping("/groupes/{id}/valider")
    public ResponseEntity<GroupeResponse> validerGroupe(@PathVariable Long id) {
        return ResponseEntity.ok(groupeService.validerGroupe(id));
    }

    // PATCH /api/admin/groupes/{id}/refuser — Refuser un groupe
    @PatchMapping("/groupes/{id}/refuser")
    public ResponseEntity<GroupeResponse> refuserGroupe(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String motif = body != null ? body.getOrDefault("motif", "Non précisé") : "Non précisé";
        return ResponseEntity.ok(groupeService.refuserGroupe(id, motif));
    }

    // ─── Statistiques bénévolat ───────────────────────────────────────────────

    @GetMapping("/benevoles/stats")
    public ResponseEntity<Map<String, Object>> statsBenevolat() {
        return ResponseEntity.ok(prestationService.statistiques());
    }

    @GetMapping("/benevoles/prestations")
    public ResponseEntity<List<Map<String, Object>>> toutesLesPrestations() {
        return ResponseEntity.ok(prestationService.toutesLesPrestations());
    }
}
