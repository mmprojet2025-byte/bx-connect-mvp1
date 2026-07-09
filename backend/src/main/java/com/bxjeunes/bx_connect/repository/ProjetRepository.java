package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.Projet;
import com.bxjeunes.bx_connect.entity.StatutProjet;
import com.bxjeunes.bx_connect.entity.VisibiliteProjet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjetRepository extends JpaRepository<Projet, Long> {

    // Projets visibles publiquement (approuvés ou en cours)
    List<Projet> findByStatutIn(List<StatutProjet> statuts);

    List<Projet> findByStatutInAndVisibilite(
            List<StatutProjet> statuts,
            VisibiliteProjet visibilite);

    List<Projet> findByStatutInAndVisibiliteIn(
            List<StatutProjet> statuts,
            List<VisibiliteProjet> visibilites);

    // Projets d'un porteur
    List<Projet> findByPorteurId(Long porteurId);

    // Projets d'un groupe
    List<Projet> findByGroupeId(Long groupeId);

    // Projets des groupes encadres par un referent
    List<Projet> findByGroupeReferentEmail(String email);

    // Projets par statut (admin)
    List<Projet> findByStatut(StatutProjet statut);

    Page<Projet> findByStatut(StatutProjet statut, Pageable pageable);

    // Recherche par mot-clé dans le titre
    List<Projet> findByTitreContainingIgnoreCaseAndStatutIn(String titre, List<StatutProjet> statuts);
}
