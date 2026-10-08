package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.ParticipationProjet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParticipationProjetRepository extends JpaRepository<ParticipationProjet, Long> {

    long countByProjetIdAndDateRetraitIsNull(Long projetId);

    @org.springframework.data.jpa.repository.Query("select count(p) from ProjetParticipationPaiement p where p.projet.id = :id and p.statut = com.bxjeunes.bx_connect.entity.StatutPaiement.EN_ATTENTE")
    long countPendingPayments(@org.springframework.data.repository.query.Param("id") Long id);

    boolean existsByUserIdAndProjetIdAndDateRetraitIsNull(Long userId, Long projetId);

    Optional<ParticipationProjet> findByUserIdAndProjetId(Long userId, Long projetId);

    List<ParticipationProjet> findByProjetId(Long projetId);

    List<ParticipationProjet> findByUserIdAndDateRetraitIsNull(Long userId);
}