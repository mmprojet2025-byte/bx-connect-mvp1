package com.bxjeunes.bx_connect.repository;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import com.bxjeunes.bx_connect.entity.VisibiliteActivite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;

@Repository
public interface ActiviteRepository extends JpaRepository<Activite, Long>, JpaSpecificationExecutor<Activite> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Activite a WHERE a.id = :id")
    Optional<Activite> findByIdForUpdate(@Param("id") Long id);

    // ─── Lister par statut ────────────────────────────────────────────────────
    List<Activite> findByStatut(StatutActivite statut);

    Page<Activite> findByStatut(StatutActivite statut, Pageable pageable);

    Page<Activite> findByStatutAndVisibilite(
            StatutActivite statut, VisibiliteActivite visibilite, Pageable pageable);

    // ─── Filtres visiteur (V03) ───────────────────────────────────────────────
    List<Activite> findByStatutAndCategorie(StatutActivite statut, String categorie);
    List<Activite> findByStatutAndTheme(StatutActivite statut, String theme);
    List<Activite> findByStatutAndLieuContainingIgnoreCase(StatutActivite statut, String lieu);

    // ─── Filtre par date (V03) ────────────────────────────────────────────────
    List<Activite> findByStatutAndDateDebutBetween(
        StatutActivite statut,
        LocalDateTime debut,
        LocalDateTime fin
    );

    // ─── Filtre gratuit/payant ────────────────────────────────────────────────
    List<Activite> findByStatutAndGratuite(StatutActivite statut, boolean gratuite);

    // ─── Recherche par mot-clé dans titre (V06 / M16) ────────────────────────
    List<Activite> findByStatutAndTitreContainingIgnoreCase(StatutActivite statut, String motCle);

    // ─── Recherche multi-champs (titre + description + lieu) ─────────────────
    @Query("SELECT a FROM Activite a WHERE a.statut = :statut AND (" +
           "LOWER(a.titre) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(a.description) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(a.lieu) LIKE LOWER(CONCAT('%', :q, '%')))")
    List<Activite> rechercherMultiChamps(
        @Param("statut") StatutActivite statut,
        @Param("q") String q
    );

    @Query("""
            SELECT a FROM Activite a WHERE a.statut = :statut
            AND (:q IS NULL OR LOWER(a.titre) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(a.description) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(a.lieu) LIKE LOWER(CONCAT('%', :q, '%')))
            AND (:categorie IS NULL OR a.categorie = :categorie)
            AND (:theme IS NULL OR a.theme = :theme)
            AND (:lieu IS NULL OR LOWER(a.lieu) LIKE LOWER(CONCAT('%', :lieu, '%')))
            AND (:debut IS NULL OR a.dateDebut >= :debut)
            AND (:fin IS NULL OR a.dateDebut <= :fin)
            AND (:gratuite IS NULL OR a.gratuite = :gratuite)
            """)
    List<Activite> filtrerCombines(@Param("statut") StatutActivite statut,
            @Param("q") String q, @Param("categorie") String categorie,
            @Param("theme") String theme, @Param("lieu") String lieu,
            @Param("debut") LocalDateTime debut, @Param("fin") LocalDateTime fin,
            @Param("gratuite") Boolean gratuite);

    // ─── Filtre combiné (catégorie + thème) ───────────────────────────────────
    List<Activite> findByStatutAndCategorieAndTheme(
        StatutActivite statut,
        String categorie,
        String theme
    );

    // ─── Activités créées par un utilisateur (référent/admin) ────────────────
    List<Activite> findByCreateurId(Long createurId);

    List<Activite> findByGroupeIdAndStatut(Long groupeId, StatutActivite statut);

    List<Activite> findByCreateurIdOrReferentAssigneId(Long createurId, Long referentAssigneId);

    // ─── Activités d'un référent (pour dashboard référent) ───────────────────
    List<Activite> findByCreateurIdAndStatut(Long createurId, StatutActivite statut);

    // ─── Catégories distinctes (pour les filtres frontend) ───────────────────
    @Query("SELECT DISTINCT a.categorie FROM Activite a WHERE a.statut = 'PUBLIEE' AND a.categorie IS NOT NULL "
            + "AND (:authentifie = true OR a.visibilite = 'PUBLIC')")
    List<String> findDistinctCategories(@Param("authentifie") boolean authentifie);

    // ─── Thèmes distincts ─────────────────────────────────────────────────────
    @Query("SELECT DISTINCT a.theme FROM Activite a WHERE a.statut = 'PUBLIEE' AND a.theme IS NOT NULL "
            + "AND (:authentifie = true OR a.visibilite = 'PUBLIC')")
    List<String> findDistinctThemes(@Param("authentifie") boolean authentifie);

    // ─── Lieux distincts ──────────────────────────────────────────────────────
    @Query("SELECT DISTINCT a.lieu FROM Activite a WHERE a.statut = 'PUBLIEE' AND a.lieu IS NOT NULL "
            + "AND (:authentifie = true OR a.visibilite = 'PUBLIC')")
    List<String> findDistinctLieux(@Param("authentifie") boolean authentifie);
}
