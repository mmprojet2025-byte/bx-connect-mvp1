package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.Projet;
import com.bxjeunes.bx_connect.entity.StatutProjet;
import com.bxjeunes.bx_connect.entity.VisibiliteProjet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjetRepository extends JpaRepository<Projet, Long> {

    // Projets visibles publiquement (approuvés ou en cours)
    List<Projet> findByStatutIn(List<StatutProjet> statuts);

    List<Projet> findByStatutInAndVisibilite(
            List<StatutProjet> statuts,
            VisibiliteProjet visibilite);

    Page<Projet> findByStatutInAndVisibilite(
            List<StatutProjet> statuts,
            VisibiliteProjet visibilite,
            Pageable pageable);

    List<Projet> findByStatutInAndVisibiliteIn(
            List<StatutProjet> statuts,
            List<VisibiliteProjet> visibilites);

    Page<Projet> findByStatutInAndVisibiliteIn(
            List<StatutProjet> statuts,
            List<VisibiliteProjet> visibilites,
            Pageable pageable);

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

    @Query(
            value = """
                    SELECT p
                    FROM Projet p
                    WHERE p.porteur.id = :userId
                       OR (:groupeId IS NOT NULL AND p.visibilite = :visibiliteGroupe AND p.groupe.id = :groupeId)
                       OR (p.statut IN :statutsDiffusables AND p.visibilite IN :visibilitesDiffusables)
                    """,
            countQuery = """
                    SELECT COUNT(p)
                    FROM Projet p
                    WHERE p.porteur.id = :userId
                       OR (:groupeId IS NOT NULL AND p.visibilite = :visibiliteGroupe AND p.groupe.id = :groupeId)
                       OR (p.statut IN :statutsDiffusables AND p.visibilite IN :visibilitesDiffusables)
                    """
    )
    Page<Projet> findVisibleForMembre(
            @Param("userId") Long userId,
            @Param("groupeId") Long groupeId,
            @Param("visibiliteGroupe") VisibiliteProjet visibiliteGroupe,
            @Param("statutsDiffusables") List<StatutProjet> statutsDiffusables,
            @Param("visibilitesDiffusables") List<VisibiliteProjet> visibilitesDiffusables,
            Pageable pageable);

    @Query(
            value = """
                    SELECT p
                    FROM Projet p
                    WHERE p.porteur.id = :userId
                       OR (p.groupe.referent.id = :userId)
                       OR (p.statut IN :statutsDiffusables AND p.visibilite IN :visibilitesDiffusables)
                    """,
            countQuery = """
                    SELECT COUNT(p)
                    FROM Projet p
                    WHERE p.porteur.id = :userId
                       OR (p.groupe.referent.id = :userId)
                       OR (p.statut IN :statutsDiffusables AND p.visibilite IN :visibilitesDiffusables)
                    """
    )
    Page<Projet> findVisibleForReferent(
            @Param("userId") Long userId,
            @Param("statutsDiffusables") List<StatutProjet> statutsDiffusables,
            @Param("visibilitesDiffusables") List<VisibiliteProjet> visibilitesDiffusables,
            Pageable pageable);

    @Query(
            value = """
                    SELECT p
                    FROM Projet p
                    WHERE p.porteur.id = :userId
                       OR (p.statut IN :statutsDiffusables AND p.visibilite IN :visibilitesDiffusables)
                    """,
            countQuery = """
                    SELECT COUNT(p)
                    FROM Projet p
                    WHERE p.porteur.id = :userId
                       OR (p.statut IN :statutsDiffusables AND p.visibilite IN :visibilitesDiffusables)
                    """
    )
    Page<Projet> findVisibleForPartenaire(
            @Param("userId") Long userId,
            @Param("statutsDiffusables") List<StatutProjet> statutsDiffusables,
            @Param("visibilitesDiffusables") List<VisibiliteProjet> visibilitesDiffusables,
            Pageable pageable);
}
