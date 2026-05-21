package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActiviteRepository extends JpaRepository<Activite, Long> {

    // ─── Lister par statut ────────────────────────────────────────────────────
    List<Activite> findByStatut(StatutActivite statut);

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

    // ─── Filtre combiné (catégorie + thème) ───────────────────────────────────
    List<Activite> findByStatutAndCategorieAndTheme(
        StatutActivite statut,
        String categorie,
        String theme
    );

    // ─── Activités créées par un utilisateur (référent/admin) ────────────────
    List<Activite> findByCreateurId(Long createurId);

    // ─── Activités d'un référent (pour dashboard référent) ───────────────────
    List<Activite> findByCreateurIdAndStatut(Long createurId, StatutActivite statut);

    // ─── Catégories distinctes (pour les filtres frontend) ───────────────────
    @Query("SELECT DISTINCT a.categorie FROM Activite a WHERE a.statut = 'PUBLIEE' AND a.categorie IS NOT NULL")
    List<String> findDistinctCategories();

    // ─── Thèmes distincts ─────────────────────────────────────────────────────
    @Query("SELECT DISTINCT a.theme FROM Activite a WHERE a.statut = 'PUBLIEE' AND a.theme IS NOT NULL")
    List<String> findDistinctThemes();

    // ─── Lieux distincts ──────────────────────────────────────────────────────
    @Query("SELECT DISTINCT a.lieu FROM Activite a WHERE a.statut = 'PUBLIEE' AND a.lieu IS NOT NULL")
    List<String> findDistinctLieux();
}