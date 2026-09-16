package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.StatutGroupe;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;

@Repository
public interface GroupeRepository extends JpaRepository<Groupe, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT g FROM Groupe g WHERE g.id = :id")
    Optional<Groupe> findByIdForUpdate(@Param("id") Long id);

    // Groupes validés (public)
    List<Groupe> findByStatut(StatutGroupe statut);

    // Groupes validés + recherche par nom
    List<Groupe> findByStatutAndNomContainingIgnoreCase(StatutGroupe statut, String nom);

    Page<Groupe> findByStatutAndNomContainingIgnoreCase(StatutGroupe statut, String nom, Pageable pageable);

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
