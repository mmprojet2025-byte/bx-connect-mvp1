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

    // Membres d'un groupe
    List<MembreGroupe> findByGroupeId(Long groupeId);

    // Membres actifs d'un groupe
    List<MembreGroupe> findByGroupeIdAndStatut(Long groupeId, StatutMembre statut);

    // Vérifier si un membre est dans un groupe spécifique
    Optional<MembreGroupe> findByUserIdAndGroupeId(Long userId, Long groupeId);

    // ✅ RÈGLE MÉTIER : Un membre = un seul groupe actif
    // Vérifie si le membre est déjà dans un groupe (statut ACCEPTE)
    @Query("SELECT COUNT(mg) > 0 FROM MembreGroupe mg " +
           "WHERE mg.user.id = :userId AND mg.statut = 'ACCEPTE'")
    boolean estDejaMembreActif(@Param("userId") Long userId);

    // Compter les membres actifs d'un groupe
    long countByGroupeIdAndStatut(Long groupeId, StatutMembre statut);

    // Demandes en attente pour un groupe
    List<MembreGroupe> findByGroupeIdAndStatutOrderByDateAdhesionAsc(Long groupeId, StatutMembre statut);
}