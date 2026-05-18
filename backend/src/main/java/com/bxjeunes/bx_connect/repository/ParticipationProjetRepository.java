package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.ParticipationProjet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParticipationProjetRepository extends JpaRepository<ParticipationProjet, Long> {

    boolean existsByUserIdAndProjetId(Long userId, Long projetId);

    Optional<ParticipationProjet> findByUserIdAndProjetId(Long userId, Long projetId);

    List<ParticipationProjet> findByProjetId(Long projetId);

    List<ParticipationProjet> findByUserId(Long userId);
}