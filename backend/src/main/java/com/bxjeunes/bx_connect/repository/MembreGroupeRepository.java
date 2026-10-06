package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.MembreGroupe;
import com.bxjeunes.bx_connect.entity.StatutMembre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MembreGroupeRepository extends JpaRepository<MembreGroupe, Long> {

    // Tous les groupes d'un membre
    List<MembreGroupe> findByUserId(Long userId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM MembreGroupe m WHERE m.id = :id")
    Optional<MembreGroupe> findByIdForUpdate(@Param("id") Long id);

    // Historical memberships remain stored, but do not reserve a place in an archived group.
    @Query("SELECT m FROM MembreGroupe m WHERE m.user.id = :userId AND m.statut = :statut " +
           "AND m.groupe.actif = true AND m.groupe.statut = 'VALIDE'")
    Optional<MembreGroupe> findFirstByUserIdAndStatut(@Param("userId") Long userId, @Param("statut") StatutMembre statut);

    boolean existsByUserIdAndStatut(Long userId, StatutMembre statut);

    // Membres d'un groupe
    List<MembreGroupe> findByGroupeId(Long groupeId);

    // Membres actifs d'un groupe
    List<MembreGroupe> findByGroupeIdAndStatut(Long groupeId, StatutMembre statut);

    // Vérifier si un membre est dans un groupe spécifique
    Optional<MembreGroupe> findByUserIdAndGroupeId(Long userId, Long groupeId);

    // ✅ RÈGLE MÉTIER : Un membre = un seul groupe actif
    // Vérifie si le membre est déjà dans un groupe (statut ACCEPTE)
    @Query("SELECT COUNT(mg) > 0 FROM MembreGroupe mg " +
           "WHERE mg.user.id = :userId AND mg.statut = 'ACCEPTE' AND mg.groupe.actif = true AND mg.groupe.statut = 'VALIDE'")
    boolean estDejaMembreActif(@Param("userId") Long userId);

    // Compter les membres actifs d'un groupe
    long countByGroupeIdAndStatut(Long groupeId, StatutMembre statut);

    // Demandes en attente pour un groupe
    List<MembreGroupe> findByGroupeIdAndStatutOrderByDateAdhesionAsc(Long groupeId, StatutMembre statut);
}
