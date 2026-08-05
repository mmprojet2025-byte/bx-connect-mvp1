package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.superadmin.AdminResponse;
import com.bxjeunes.bx_connect.dto.superadmin.CreateAdminRequest;
import com.bxjeunes.bx_connect.dto.superadmin.ResetAdminPasswordRequest;
import com.bxjeunes.bx_connect.dto.superadmin.SuperAdminDashboardResponse;
import com.bxjeunes.bx_connect.dto.UserResponse;
import com.bxjeunes.bx_connect.entity.Langue;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.AuditLogRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SuperAdminService {

    private static final Logger log = LoggerFactory.getLogger(SuperAdminService.class);
    private static final Set<String> ACTIONS_CRITIQUES = Set.of(
            "CREATE_ADMIN",
            "DISABLE_ADMIN",
            "ENABLE_ADMIN",
            "RESET_ADMIN_PASSWORD",
            "DELETE_USER",
            "CHANGE_USER_ROLE",
            "UPDATE_USER_ROLE");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final AuditLogRepository auditLogRepository;

    public SuperAdminDashboardResponse dashboard() {
        long adminsActifs = userRepository.countByRoleAndActifTrue(Role.ADMIN);
        long totalAdmins = userRepository.countByRole(Role.ADMIN);
        long adminsInactifs = totalAdmins - adminsActifs;
        long totalActionsCritiques = auditLogRepository.countByActionIn(ACTIONS_CRITIQUES);
        return new SuperAdminDashboardResponse(
                adminsActifs,
                adminsInactifs,
                totalActionsCritiques,
                auditLogService.derniersLogs());
    }

    public List<AdminResponse> listerAdmins() {
        return userRepository.findByRole(Role.ADMIN).stream()
                .map(AdminResponse::fromEntity)
                .toList();
    }

    public List<UserResponse> listerUtilisateursMetier() {
        return userRepository.findAll().stream()
                .filter(user -> user.getRole() != Role.ADMIN && user.getRole() != Role.SUPER_ADMIN)
                .map(UserResponse::fromEntity)
                .toList();
    }

    public AdminResponse creerAdmin(CreateAdminRequest request, String acteurEmail) {
        User acteur = getSuperAdmin(acteurEmail);

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Un compte existe deja avec cet email.");
        }

        User admin = User.builder()
                .prenom(request.getPrenom())
                .nom(request.getNom())
                .email(request.getEmail())
                .motDePasse(passwordEncoder.encode(request.getMotDePasseTemporaire()))
                .role(Role.ADMIN)
                .languePreference(Langue.FR)
                .actif(true)
                .build();

        User saved = userRepository.save(admin);
        auditerSuperAdmin(acteur, "CREATE_ADMIN", saved, "Creation d'un compte ADMIN.");
        return AdminResponse.fromEntity(saved);
    }

    public AdminResponse desactiverAdmin(Long id, String acteurEmail) {
        User acteur = getSuperAdmin(acteurEmail);
        User admin = getAdmin(id);

        if (!admin.isActif()) {
            return AdminResponse.fromEntity(admin);
        }

        if (userRepository.countByRoleAndActifTrue(Role.ADMIN) <= 1) {
            throw new AccessDeniedException("Impossible de desactiver le dernier ADMIN actif.");
        }

        admin.setActif(false);
        User saved = userRepository.save(admin);
        auditerSuperAdmin(acteur, "DISABLE_ADMIN", saved, "Desactivation d'un compte ADMIN.");
        return AdminResponse.fromEntity(saved);
    }

    public AdminResponse reactiverAdmin(Long id, String acteurEmail) {
        User acteur = getSuperAdmin(acteurEmail);
        User admin = getAdmin(id);

        if (admin.isActif()) {
            return AdminResponse.fromEntity(admin);
        }

        admin.setActif(true);
        User saved = userRepository.save(admin);
        auditerSuperAdmin(acteur, "ENABLE_ADMIN", saved, "Reactivation d'un compte ADMIN.");
        return AdminResponse.fromEntity(saved);
    }

    public AdminResponse resetPasswordAdmin(
            Long id,
            ResetAdminPasswordRequest request,
            String acteurEmail) {
        User acteur = getSuperAdmin(acteurEmail);
        User admin = getAdmin(id);

        admin.setMotDePasse(passwordEncoder.encode(request.getNouveauMotDePasseTemporaire()));
        admin.setCredentialsVersion(admin.getCredentialsVersion() + 1);
        User saved = userRepository.save(admin);
        auditerSuperAdmin(acteur, "RESET_ADMIN_PASSWORD", saved,
                "Reinitialisation du mot de passe d'un compte ADMIN.");
        return AdminResponse.fromEntity(saved);
    }

    private void auditerSuperAdmin(User acteur, String action, User cible, String details) {
        try {
            auditLogService.log(acteur, action, "USER", cible, details);
        } catch (RuntimeException ex) {
            log.warn("AuditLog non bloquant impossible pour l'action SUPER_ADMIN {} sur l'utilisateur {}: {}",
                    action,
                    cible != null ? cible.getId() : null,
                    ex.getMessage());
        }
    }

    private User getSuperAdmin(String email) {
        User acteur = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        if (acteur.getRole() != Role.SUPER_ADMIN) {
            throw new AccessDeniedException("Action reservee au SUPER_ADMIN.");
        }
        return acteur;
    }

    private User getAdmin(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        if (user.getRole() == Role.SUPER_ADMIN) {
            throw new AccessDeniedException("Impossible de modifier un SUPER_ADMIN.");
        }
        if (user.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Cette action concerne uniquement les ADMIN.");
        }
        return user;
    }
}
