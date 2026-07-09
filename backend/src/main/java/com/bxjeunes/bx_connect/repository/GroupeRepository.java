package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.StatutGroupe;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupeRepository extends JpaRepository<Groupe, Long> {

    // Groupes validés (public)
    List<Groupe> findByStatut(StatutGroupe statut);

    // Groupes validés + recherche par nom
    List<Groupe> findByStatutAndNomContainingIgnoreCase(StatutGroupe statut, String nom);

    // Groupes d'un référent
    List<Groupe> findByReferentId(Long referentId);

    // Groupes d'un référent par statut
    List<Groupe> findByReferentIdAndStatut(Long referentId, StatutGroupe statut);

    // Groupes en attente de validation (admin)
    List<Groupe> findByStatutOrderByDateCreationAsc(StatutGroupe statut);

    Page<Groupe> findByStatut(StatutGroupe statut, Pageable pageable);

    // Legacy : groupes actifs (compatibilité)
    List<Groupe> findByActifTrue();
    List<Groupe> findByActifTrueAndNomContainingIgnoreCase(String nom);
}
