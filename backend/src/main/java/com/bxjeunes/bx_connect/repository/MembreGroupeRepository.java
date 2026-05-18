package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.MembreGroupe;
import com.bxjeunes.bx_connect.entity.StatutMembre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MembreGroupeRepository extends JpaRepository<MembreGroupe, Long> {

    // Vérifier si un user est déjà dans un groupe
    boolean existsByUserIdAndGroupeId(Long userId, Long groupeId);

    // Trouver l'adhésion d'un user dans un groupe
    Optional<MembreGroupe> findByUserIdAndGroupeId(Long userId, Long groupeId);

    // Membres d'un groupe par statut
    List<MembreGroupe> findByGroupeIdAndStatut(Long groupeId, StatutMembre statut);

    // Tous les groupes d'un user (acceptés)
    List<MembreGroupe> findByUserIdAndStatut(Long userId, StatutMembre statut);

    // Demandes en attente pour un groupe
    List<MembreGroupe> findByGroupeIdAndStatut(Long groupeId, StatutMembre statut, org.springframework.data.domain.Sort sort);
}