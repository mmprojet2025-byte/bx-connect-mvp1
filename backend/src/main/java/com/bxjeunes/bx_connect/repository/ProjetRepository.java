package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.Projet;
import com.bxjeunes.bx_connect.entity.StatutProjet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjetRepository extends JpaRepository<Projet, Long> {

    // Projets visibles publiquement (approuvés ou en cours)
    List<Projet> findByStatutIn(List<StatutProjet> statuts);

    // Projets d'un porteur
    List<Projet> findByPorteurId(Long porteurId);

    // Projets d'un groupe
    List<Projet> findByGroupeId(Long groupeId);

    // Projets par statut (admin)
    List<Projet> findByStatut(StatutProjet statut);

    // Recherche par mot-clé dans le titre
    List<Projet> findByTitreContainingIgnoreCaseAndStatutIn(String titre, List<StatutProjet> statuts);
}