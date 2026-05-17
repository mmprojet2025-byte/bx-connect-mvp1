package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActiviteRepository extends JpaRepository<Activite, Long> {

    // Toutes les activités publiées (pour les visiteurs/membres)
    List<Activite> findByStatut(StatutActivite statut);

    // Activités par catégorie
    List<Activite> findByStatutAndCategorie(StatutActivite statut, String categorie);

    // Activités par thème
    List<Activite> findByStatutAndTheme(StatutActivite statut, String theme);

    // Recherche par mot-clé dans le titre (V06 / M16 du CDC)
    List<Activite> findByStatutAndTitreContainingIgnoreCase(StatutActivite statut, String motCle);

    // Activités créées par un utilisateur (pour le référent/admin)
    List<Activite> findByCreateurId(Long createurId);
}