package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.SoutienFinancier;
import com.bxjeunes.bx_connect.entity.StatutPaiement;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PaiementResponse {

    private BigDecimal montant;
    private StatutPaiement statutPaiement;
    private String fournisseur;

    // URLs de redirection client uniquement.
    private String approvalUrl;
    private String checkoutUrl;

    // Commun
    private String message;
    private LocalDateTime dateCreation;
    private LocalDateTime datePaiement;

    // Donateur
    private Long donateurId;
    private String donateurPrenom;
    private String donateurNom;

    // Cible
    private Long activiteId;
    private String activiteTitre;
    private Long projetId;
    private String projetTitre;

    // ─── Factory depuis entité ────────────────────────────────────────────────
    public static PaiementResponse fromEntity(SoutienFinancier s) {
        PaiementResponse r = new PaiementResponse();
        r.montant               = s.getMontant();
        r.statutPaiement        = s.getStatutPaiement();
        r.fournisseur           = s.getFournisseur();
        r.approvalUrl           = s.getApprovalUrl();
        r.checkoutUrl           = s.getCheckoutUrl();
        r.message               = s.getMessage();
        r.dateCreation          = s.getDateCreation();
        r.datePaiement          = s.getDatePaiement();

        if (s.getDonateur() != null) {
            r.donateurId     = s.getDonateur().getId();
            r.donateurPrenom = s.getDonateur().getPrenom();
            r.donateurNom    = s.getDonateur().getNom();
        }
        if (s.getActivite() != null) {
            r.activiteId    = s.getActivite().getId();
            r.activiteTitre = s.getActivite().getTitre();
        }
        if (s.getProjet() != null) {
            r.projetId    = s.getProjet().getId();
            r.projetTitre = s.getProjet().getTitre();
        }
        return r;
    }

    // ─── Getters ──────────────────────────────────────────────────────────────
    public BigDecimal getMontant()             { return montant; }
    public StatutPaiement getStatutPaiement()  { return statutPaiement; }
    public String getFournisseur()             { return fournisseur; }
    public String getApprovalUrl()             { return approvalUrl; }
    public String getCheckoutUrl()             { return checkoutUrl; }
    public String getMessage()                 { return message; }
    public LocalDateTime getDateCreation()     { return dateCreation; }
    public LocalDateTime getDatePaiement()     { return datePaiement; }
    public Long getDonateurId()                { return donateurId; }
    public String getDonateurPrenom()          { return donateurPrenom; }
    public String getDonateurNom()             { return donateurNom; }
    public Long getActiviteId()                { return activiteId; }
    public String getActiviteTitre()           { return activiteTitre; }
    public Long getProjetId()                  { return projetId; }
    public String getProjetTitre()             { return projetTitre; }
}
