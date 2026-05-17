package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.SoutienFinancier;
import com.bxjeunes.bx_connect.entity.StatutPaiement;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PaiementResponse {

    private Long id;
    private BigDecimal montant;
    private StatutPaiement statutPaiement;
    private String approvalUrl;       // URL PayPal pour rediriger l'utilisateur
    private String paypalPaymentId;
    private LocalDateTime dateCreation;
    private LocalDateTime datePaiement;
    private String donateurPrenom;
    private String donateurNom;
    private String activiteTitre;

    // ─── Factory depuis entité ────────────────────────────────────────────────

    public static PaiementResponse fromEntity(SoutienFinancier s) {
        PaiementResponse r = new PaiementResponse();
        r.id = s.getId();
        r.montant = s.getMontant();
        r.statutPaiement = s.getStatutPaiement();
        r.approvalUrl = s.getApprovalUrl();
        r.paypalPaymentId = s.getPaypalPaymentId();
        r.dateCreation = s.getDateCreation();
        r.datePaiement = s.getDatePaiement();
        if (s.getDonateur() != null) {
            r.donateurPrenom = s.getDonateur().getPrenom();
            r.donateurNom = s.getDonateur().getNom();
        }
        if (s.getActivite() != null) {
            r.activiteTitre = s.getActivite().getTitre();
        }
        return r;
    }

    // ─── Getters ──────────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public BigDecimal getMontant() { return montant; }
    public StatutPaiement getStatutPaiement() { return statutPaiement; }
    public String getApprovalUrl() { return approvalUrl; }
    public String getPaypalPaymentId() { return paypalPaymentId; }
    public LocalDateTime getDateCreation() { return dateCreation; }
    public LocalDateTime getDatePaiement() { return datePaiement; }
    public String getDonateurPrenom() { return donateurPrenom; }
    public String getDonateurNom() { return donateurNom; }
    public String getActiviteTitre() { return activiteTitre; }
}