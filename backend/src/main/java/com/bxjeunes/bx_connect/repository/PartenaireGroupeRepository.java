package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.PartenaireGroupe;
import com.bxjeunes.bx_connect.entity.PartenaireProfil;
import com.bxjeunes.bx_connect.entity.StatutAffectationPartenaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PartenaireGroupeRepository extends JpaRepository<PartenaireGroupe, Long> {

    List<PartenaireGroupe> findByGroupeAndStatut(Groupe groupe, StatutAffectationPartenaire statut);

    List<PartenaireGroupe> findByPartenaireProfilAndStatut(
            PartenaireProfil partenaireProfil,
            StatutAffectationPartenaire statut);

    boolean existsByPartenaireProfilAndGroupeAndStatut(
            PartenaireProfil partenaireProfil,
            Groupe groupe,
            StatutAffectationPartenaire statut);

    @Query("""
            select pg
            from PartenaireGroupe pg
            join fetch pg.partenaireProfil pp
            join fetch pp.utilisateur
            join fetch pg.groupe g
            join fetch g.referent
            where pg.statut = com.bxjeunes.bx_connect.entity.StatutAffectationPartenaire.ACTIF
            """)
    List<PartenaireGroupe> findActiveAssignments();

    @Query("""
            select pg
            from PartenaireGroupe pg
            join fetch pg.partenaireProfil pp
            join fetch pp.utilisateur
            join fetch pg.groupe g
            join fetch g.referent r
            where r.id = :referentId
              and pg.statut = com.bxjeunes.bx_connect.entity.StatutAffectationPartenaire.ACTIF
            """)
    List<PartenaireGroupe> findActiveByReferentId(@Param("referentId") Long referentId);

    @Query("""
            select pg
            from PartenaireGroupe pg
            join fetch pg.partenaireProfil pp
            join fetch pp.utilisateur u
            join fetch pg.groupe g
            join fetch g.referent
            where u.id = :partenaireUserId
              and pg.statut = com.bxjeunes.bx_connect.entity.StatutAffectationPartenaire.ACTIF
            """)
    List<PartenaireGroupe> findActiveByPartenaireUserId(@Param("partenaireUserId") Long partenaireUserId);
}
