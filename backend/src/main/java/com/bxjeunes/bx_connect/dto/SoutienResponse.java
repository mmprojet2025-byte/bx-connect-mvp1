package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.SoutienFinancier;
import com.bxjeunes.bx_connect.entity.StatutPaiement;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class SoutienResponse {

    private Long id;
    private BigDecimal montant;
    private StatutPaiement statutPaiement;
    private String message;
    private String reponseAdmin;
    private String typeSource;
    private LocalDateTime dateCreation;
    private LocalDateTime datePaiement;
    private LocalDateTime dateReponseAdmin;

    // Partenaire
    private Long partenaireId;
    private String partenairePrenom;
    private String partenaireNom;
    private String partenaireEmail;

    // Cible
    private Long projetId;
    private String projetTitre;
    private Long activiteId;
    private String activiteTitre;

    // ─── Factory ──────────────────────────────────────────────────────────────
    public static SoutienResponse fromEntity(SoutienFinancier s) {
        SoutienResponse r = new SoutienResponse();
        r.id             = s.getId();
        r.montant        = s.getMontant();
        r.statutPaiement = s.getStatutPaiement();
        r.message        = s.getMessage();
        r.reponseAdmin   = s.getReponseAdmin();
        r.typeSource     = s.getTypeSource();
        r.dateCreation   = s.getDateCreation();
        r.datePaiement   = s.getDatePaiement();
        r.dateReponseAdmin = s.getDateReponseAdmin();

        if (s.getDonateur() != null) {
            r.partenaireId     = s.getDonateur().getId();
            r.partenairePrenom = s.getDonateur().getPrenom();
            r.partenaireNom    = s.getDonateur().getNom();
            r.partenaireEmail  = s.getDonateur().getEmail();
        }
        if (s.getProjet() != null) {
            r.projetId    = s.getProjet().getId();
            r.projetTitre = s.getProjet().getTitre();
        }
        if (s.getActivite() != null) {
            r.activiteId    = s.getActivite().getId();
            r.activiteTitre = s.getActivite().getTitre();
        }
        return r;
    }

    // ─── Getters ──────────────────────────────────────────────────────────────
    public Long getId()                        { return id; }
    public BigDecimal getMontant()             { return montant; }
    public StatutPaiement getStatutPaiement()  { return statutPaiement; }
    public String getMessage()                 { return message; }
    public String getReponseAdmin()            { return reponseAdmin; }
    public String getTypeSource()              { return typeSource; }
    public LocalDateTime getDateCreation()     { return dateCreation; }
    public LocalDateTime getDatePaiement()     { return datePaiement; }
    public LocalDateTime getDateReponseAdmin() { return dateReponseAdmin; }
    public Long getPartenaireId()              { return partenaireId; }
    public String getPartenairePrenom()        { return partenairePrenom; }
    public String getPartenaireNom()           { return partenaireNom; }
    public String getPartenaireEmail()         { return partenaireEmail; }
    public Long getProjetId()                  { return projetId; }
    public String getProjetTitre()             { return projetTitre; }
    public Long getActiviteId()                { return activiteId; }
    public String getActiviteTitre()           { return activiteTitre; }
}
