package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.Groupe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupeRepository extends JpaRepository<Groupe, Long> {

    // Tous les groupes actifs
    List<Groupe> findByActifTrue();

    // Recherche par nom (M17)
    List<Groupe> findByActifTrueAndNomContainingIgnoreCase(String nom);

    // Groupes gérés par un référent
    List<Groupe> findByReferentId(Long referentId);

    // Groupes actifs par catégorie
    List<Groupe> findByActifTrueAndCategorie(String categorie);
}