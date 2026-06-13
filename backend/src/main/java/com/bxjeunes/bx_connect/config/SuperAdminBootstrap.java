package com.bxjeunes.bx_connect.config;

import com.bxjeunes.bx_connect.entity.Langue;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SuperAdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SuperAdminBootstrap.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    @Value("${bx.super-admin.email:superadmin@bx-connect.local}")
    private String email;

    @Value("${bx.super-admin.password:}")
    private String password;

    @Value("${bx.super-admin.prenom:System}")
    private String prenom;

    @Value("${bx.super-admin.nom:SuperAdmin}")
    private String nom;

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.existsByRole(Role.SUPER_ADMIN)) {
            return;
        }

        if (password == null || password.isBlank()) {
            log.warn("BX_SUPER_ADMIN_PASSWORD absent : aucun SUPER_ADMIN n'est cree automatiquement.");
            return;
        }

        if (userRepository.existsByEmail(email)) {
            throw new IllegalStateException(
                    "Impossible de bootstrapper le SUPER_ADMIN : email deja utilise par un autre compte.");
        }

        User superAdmin = User.builder()
                .prenom(prenom)
                .nom(nom)
                .email(email)
                .motDePasse(passwordEncoder.encode(password))
                .role(Role.SUPER_ADMIN)
                .languePreference(Langue.FR)
                .actif(true)
                .build();

        User saved = userRepository.save(superAdmin);
        auditLogService.logSystem(
                "BOOTSTRAP_SUPER_ADMIN_CREATED",
                saved,
                "Creation automatique du premier SUPER_ADMIN au demarrage.");
    }
}
