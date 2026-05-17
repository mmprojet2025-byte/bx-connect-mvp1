package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.SoutienFinancier;
import com.bxjeunes.bx_connect.entity.StatutPaiement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SoutienFinancierRepository extends JpaRepository<SoutienFinancier, Long> {

    // Tous les soutiens d'un donateur
    List<SoutienFinancier> findByDonateurId(Long donateurId);

    // Tous les soutiens pour une activité
    List<SoutienFinancier> findByActiviteId(Long activiteId);

    // Retrouver par PayPal Payment ID (pour la confirmation)
    Optional<SoutienFinancier> findByPaypalPaymentId(String paypalPaymentId);

    // Soutiens par statut
    List<SoutienFinancier> findByStatutPaiement(StatutPaiement statut);
}