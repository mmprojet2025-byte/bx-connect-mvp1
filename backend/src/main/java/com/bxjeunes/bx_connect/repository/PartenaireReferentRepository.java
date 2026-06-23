package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.PartenaireProfil;
import com.bxjeunes.bx_connect.entity.PartenaireReferent;
import com.bxjeunes.bx_connect.entity.StatutAffectationPartenaire;
import com.bxjeunes.bx_connect.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PartenaireReferentRepository extends JpaRepository<PartenaireReferent, Long> {

    List<PartenaireReferent> findByReferentAndStatut(User referent, StatutAffectationPartenaire statut);

    List<PartenaireReferent> findByPartenaireProfilAndStatut(
            PartenaireProfil partenaireProfil,
            StatutAffectationPartenaire statut);

    boolean existsByPartenaireProfilAndReferentAndStatut(
            PartenaireProfil partenaireProfil,
            User referent,
            StatutAffectationPartenaire statut);

    @Query("""
            select pr
            from PartenaireReferent pr
            join fetch pr.partenaireProfil pp
            join fetch pp.utilisateur
            join fetch pr.referent
            where pr.statut = com.bxjeunes.bx_connect.entity.StatutAffectationPartenaire.ACTIF
            """)
    List<PartenaireReferent> findActiveAssignments();

    @Query("""
            select pr
            from PartenaireReferent pr
            join fetch pr.partenaireProfil pp
            join fetch pp.utilisateur
            join fetch pr.referent r
            where r.id = :referentId
              and pr.statut = com.bxjeunes.bx_connect.entity.StatutAffectationPartenaire.ACTIF
            """)
    List<PartenaireReferent> findActiveByReferentId(@Param("referentId") Long referentId);

    @Query("""
            select pr
            from PartenaireReferent pr
            join fetch pr.partenaireProfil pp
            join fetch pp.utilisateur u
            join fetch pr.referent
            where u.id = :partenaireUserId
              and pr.statut = com.bxjeunes.bx_connect.entity.StatutAffectationPartenaire.ACTIF
            """)
    List<PartenaireReferent> findActiveByPartenaireUserId(@Param("partenaireUserId") Long partenaireUserId);
}
