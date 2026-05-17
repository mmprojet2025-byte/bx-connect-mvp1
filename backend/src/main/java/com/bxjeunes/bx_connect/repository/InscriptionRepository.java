package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.Inscription;
import com.bxjeunes.bx_connect.entity.StatutInscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InscriptionRepository extends JpaRepository<Inscription, Long> {

    // Toutes les inscriptions d'un membre (M11 CDC)
    List<Inscription> findByMembreId(Long membreId);

    // Inscriptions actives d'un membre (non annulées)
    List<Inscription> findByMembreIdAndStatutNot(Long membreId, StatutInscription statut);

    // Toutes les inscriptions à une activité (pour le référent/admin)
    List<Inscription> findByActiviteId(Long activiteId);

    // Vérifier si un membre est déjà inscrit à une activité
    Optional<Inscription> findByMembreIdAndActiviteId(Long membreId, Long activiteId);

    // Compter les inscriptions confirmées/payées pour une activité (vérif capacité)
    long countByActiviteIdAndStatutIn(Long activiteId, List<StatutInscription> statuts);
}