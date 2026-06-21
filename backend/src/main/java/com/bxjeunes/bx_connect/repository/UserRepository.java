package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    long countByActifTrue();

    long countByRole(Role role);

    long countByRoleIn(List<Role> roles);

    long countByRoleAndActifTrue(Role role);

    boolean existsByRole(Role role);

    List<User> findByRole(Role role);

    List<User> findByRoleAndActifTrue(Role role);

    @Query("SELECT u FROM User u WHERE u.actif = true AND u.role IN :roles AND (" +
           "LOWER(u.prenom) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(u.nom) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%')))")
    List<User> searchActiveUsersByRoles(@Param("q") String q, @Param("roles") List<Role> roles);

    @Query("""
            SELECT DISTINCT u
            FROM MembreGroupe mg
            JOIN mg.user u
            JOIN mg.groupe g
            WHERE g.referent.id = :referentId
              AND mg.statut = com.bxjeunes.bx_connect.entity.StatutMembre.ACCEPTE
              AND u.actif = true
              AND (
                  LOWER(u.prenom) LIKE LOWER(CONCAT('%', :q, '%')) OR
                  LOWER(u.nom) LIKE LOWER(CONCAT('%', :q, '%')) OR
                  LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    List<User> searchMembersOfReferentGroups(@Param("q") String q, @Param("referentId") Long referentId);
}
