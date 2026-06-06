package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.PartenaireProfil;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PartenaireProfilRepository extends JpaRepository<PartenaireProfil, Long> {
    Optional<PartenaireProfil> findByUtilisateurId(Long utilisateurId);
    Optional<PartenaireProfil> findByUtilisateurEmail(String email);
    boolean existsByUtilisateurId(Long utilisateurId);
}
