package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.PrestationBenevole;
import com.bxjeunes.bx_connect.entity.StatutPrestation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrestationBenevoleRepository extends JpaRepository<PrestationBenevole, Long> {

    // Prestations d'un membre
    List<PrestationBenevole> findByMembreId(Long membreId);

    // Prestations d'un groupe
    List<PrestationBenevole> findByGroupeId(Long groupeId);

    // Prestations d'un groupe par statut
    List<PrestationBenevole> findByGroupeIdAndStatut(Long groupeId, StatutPrestation statut);

    // Prestations d'un membre par statut
    List<PrestationBenevole> findByMembreIdAndStatut(Long membreId, StatutPrestation statut);

    // Total heures validées d'un membre
    @Query("SELECT COALESCE(SUM(p.dureeHeures), 0) FROM PrestationBenevole p " +
           "WHERE p.membre.id = :membreId AND p.statut = 'VALIDEE'")
    double totalHeuresMembre(@Param("membreId") Long membreId);

    // Total heures validées d'un groupe
    @Query("SELECT COALESCE(SUM(p.dureeHeures), 0) FROM PrestationBenevole p " +
           "WHERE p.groupe.id = :groupeId AND p.statut = 'VALIDEE'")
    double totalHeuresGroupe(@Param("groupeId") Long groupeId);

    // Toutes les prestations (admin)
    List<PrestationBenevole> findByStatut(StatutPrestation statut);
}