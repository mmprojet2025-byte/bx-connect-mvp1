package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.SoutienFinancier;
import com.bxjeunes.bx_connect.entity.StatutPaiement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Repository SoutienFinancier — Architecture corrigée
 *
 * RÈGLE FONDAMENTALE :
 * L'entité SoutienFinancier a UN SEUL champ User : "donateur" (colonne donateur_id).
 * Il n'existe PAS de champ "partenaire" dans l'entité.
 * → Toutes les méthodes Spring Data JPA doivent utiliser "donateur" (pas "partenaire").
 * → Les alias getPartenaire()/setPartenaire() dans l'entité sont des méthodes Java,
 *   pas des champs JPA — Spring Data JPA ne les voit pas.
 */
@Repository
public interface SoutienFinancierRepository extends JpaRepository<SoutienFinancier, Long> {

    // ─── Par donateur (utilisé par PayPalService, StripeService) ─────────────
    List<SoutienFinancier> findByDonateurId(Long donateurId);

    // ─── Par donateur + statut (P07 — mes soutiens par statut) ───────────────
    List<SoutienFinancier> findByDonateurIdAndStatutPaiement(
        Long donateurId,
        StatutPaiement statut
    );

    // ─── Par statut global ────────────────────────────────────────────────────
    List<SoutienFinancier> findByStatutPaiement(StatutPaiement statut);

    Page<SoutienFinancier> findByStatutPaiement(StatutPaiement statut, Pageable pageable);

    // ─── Par projet ───────────────────────────────────────────────────────────
    List<SoutienFinancier> findByProjetId(Long projetId);

    // ─── Par activité ─────────────────────────────────────────────────────────
    List<SoutienFinancier> findByActiviteId(Long activiteId);

    // ─── PayPal : recherche par paymentId ─────────────────────────────────────
    Optional<SoutienFinancier> findByPaypalPaymentId(String paypalPaymentId);

    // ─── Stripe : recherche par session ID ───────────────────────────────────
    Optional<SoutienFinancier> findByStripeSessionId(String stripeSessionId);

    // ─── Stripe : recherche par payment intent ────────────────────────────────
    Optional<SoutienFinancier> findByStripePaymentIntentId(String stripePaymentIntentId);

    // ─── Total soutiens payés pour un projet ──────────────────────────────────
    @Query("SELECT COALESCE(SUM(s.montant), 0) FROM SoutienFinancier s " +
           "WHERE s.projet.id = :projetId AND s.statutPaiement = 'PAYE'")
    BigDecimal totalSoutiensProjet(@Param("projetId") Long projetId);

    // ─── Total soutiens payés pour une activité ───────────────────────────────
    @Query("SELECT COALESCE(SUM(s.montant), 0) FROM SoutienFinancier s " +
           "WHERE s.activite.id = :activiteId AND s.statutPaiement = 'PAYE'")
    BigDecimal totalSoutiensActivite(@Param("activiteId") Long activiteId);

    // ─── Statistiques partenaire : nombre total de soutiens ──────────────────
    // ✅ CORRECTION : s.donateur.id (pas s.partenaire.id)
    @Query("SELECT COUNT(s) FROM SoutienFinancier s WHERE s.donateur.id = :donateurId")
    long countByDonateurId(@Param("donateurId") Long donateurId);

    // ─── Statistiques partenaire : montant total payé ────────────────────────
    // ✅ CORRECTION : s.donateur.id (pas s.partenaire.id)
    @Query("SELECT COALESCE(SUM(s.montant), 0) FROM SoutienFinancier s " +
           "WHERE s.donateur.id = :donateurId AND s.statutPaiement = 'PAYE'")
    BigDecimal totalMontantDonateur(@Param("donateurId") Long donateurId);

    @Query("SELECT COUNT(DISTINCT s.projet.id) FROM SoutienFinancier s " +
           "WHERE s.donateur.id = :donateurId AND s.projet IS NOT NULL AND s.statutPaiement = 'PAYE'")
    long countProjetsSoutenusParDonateur(@Param("donateurId") Long donateurId);

    @Query("SELECT COUNT(DISTINCT s.activite.id) FROM SoutienFinancier s " +
           "WHERE s.donateur.id = :donateurId AND s.activite IS NOT NULL AND s.statutPaiement = 'PAYE'")
    long countActivitesSoutenuesParDonateur(@Param("donateurId") Long donateurId);
}
