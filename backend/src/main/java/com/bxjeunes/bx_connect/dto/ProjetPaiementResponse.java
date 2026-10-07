package com.bxjeunes.bx_connect.dto;
import com.bxjeunes.bx_connect.entity.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
public record ProjetPaiementResponse(Long id, Long projetId, String titreProjet, String participant,
        BigDecimal montant, String devise, StatutPaiement statut, LocalDateTime dateCreation,
        LocalDateTime datePaiement, String numeroRecu, String checkoutUrl) {
    public static ProjetPaiementResponse from(ProjetParticipationPaiement p) {
        return new ProjetPaiementResponse(p.getId(), p.getProjet().getId(), p.getTitreProjet(),
            p.getNomParticipant(), p.getMontant(), p.getDevise(), p.getStatut(),
            p.getDateCreation(), p.getDatePaiement(), p.getNumeroRecu(),
            p.getStatut() == StatutPaiement.EN_ATTENTE ? p.getCheckoutUrl() : null);
    }
}
