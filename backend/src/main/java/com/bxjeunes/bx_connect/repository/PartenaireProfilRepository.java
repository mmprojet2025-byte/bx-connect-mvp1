package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.PartenaireProfil;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface PartenaireProfilRepository extends JpaRepository<PartenaireProfil, Long> {
    Optional<PartenaireProfil> findByUtilisateurId(Long utilisateurId);
    Optional<PartenaireProfil> findByUtilisateurEmail(String email);
    boolean existsByUtilisateurId(Long utilisateurId);

    @Query("""
            select p
            from PartenaireProfil p
            join fetch p.utilisateur u
            where u.actif = true
              and u.role = com.bxjeunes.bx_connect.entity.Role.PARTENAIRE
              and p.nomOrganisation is not null
              and trim(p.nomOrganisation) <> ''
            order by p.dateCreation desc
            """)
    List<PartenaireProfil> findPublicActiveProfiles();
}
