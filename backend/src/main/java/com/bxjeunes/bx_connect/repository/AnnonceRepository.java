package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.Annonce;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnonceRepository extends JpaRepository<Annonce, Long> {

    // Annonces globales (type GLOBALE)
    List<Annonce> findByTypeOrderByEpingleeDescDateCreationDesc(String type);

    // Annonces d'un groupe spécifique
    List<Annonce> findByGroupeIdOrderByEpingleeDescDateCreationDesc(Long groupeId);

    // Annonces visibles pour un membre (globales + son groupe)
    @Query("SELECT a FROM Annonce a WHERE a.type = 'GLOBALE' OR a.groupe.id = :groupeId " +
           "ORDER BY a.epinglee DESC, a.dateCreation DESC")
    List<Annonce> findAnnoncesVisibles(@Param("groupeId") Long groupeId);

    // Annonces épinglées
    List<Annonce> findByEpingleeTrue();

    // Annonces d'un auteur
    List<Annonce> findByAuteurId(Long auteurId);

    // Opportunités partenaires
    List<Annonce> findByCategorieOpportuniteIsNotNullOrderByDateCreationDesc();
    List<Annonce> findByAuteurIdAndCategorieOpportuniteIsNotNullOrderByDateCreationDesc(Long auteurId);
}
