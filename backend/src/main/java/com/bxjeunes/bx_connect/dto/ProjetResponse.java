package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.Projet;
import com.bxjeunes.bx_connect.entity.StatutProjet;
import com.bxjeunes.bx_connect.entity.VisibiliteProjet;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ProjetResponse {

    private Long id;
    private String titre;
    private String description;
    private String objectifs;
    private BigDecimal budgetDemande;
    private StatutProjet statut;
    private VisibiliteProjet visibilite;
    private LocalDateTime dateCreation;
    private LocalDateTime dateSoumission;
    private LocalDateTime dateValidation;
    private LocalDateTime dateCloture;
    private String commentaireAdmin;
    private String commentaireReferent;
    private LocalDateTime dateValidationReferent;
    private LocalDateTime dateRefusReferent;
    private Long referentValidateurId;
    private String referentValidateurPrenom;
    private String referentValidateurNom;
    private String porteurPrenom;
    private String porteurNom;
    private Long groupeId;
    private String groupeNom;
    private int nombreParticipants;
    private int nombreCommentaires;

    // ─── Factory depuis entité ────────────────────────────────────────────────

    public static ProjetResponse fromEntity(Projet projet) {
        ProjetResponse r = new ProjetResponse();
        r.id = projet.getId();
        r.titre = projet.getTitre();
        r.description = projet.getDescription();
        r.objectifs = projet.getObjectifs();
        r.budgetDemande = projet.getBudgetDemande();
        r.statut = projet.getStatut();
        r.visibilite = projet.getVisibilite();
        r.dateCreation = projet.getDateCreation();
        r.dateSoumission = projet.getDateSoumission();
        r.dateValidation = projet.getDateValidation();
        r.dateCloture = projet.getDateCloture();
        r.commentaireAdmin = projet.getCommentaireAdmin();
        r.commentaireReferent = projet.getCommentaireReferent();
        r.dateValidationReferent = projet.getDateValidationReferent();
        r.dateRefusReferent = projet.getDateRefusReferent();
        if (projet.getReferentValidateur() != null) {
            r.referentValidateurId = projet.getReferentValidateur().getId();
            r.referentValidateurPrenom = projet.getReferentValidateur().getPrenom();
            r.referentValidateurNom = projet.getReferentValidateur().getNom();
        }
        if (projet.getPorteur() != null) {
            r.porteurPrenom = projet.getPorteur().getPrenom();
            r.porteurNom = projet.getPorteur().getNom();
        }
        if (projet.getGroupe() != null) {
            r.groupeId = projet.getGroupe().getId();
            r.groupeNom = projet.getGroupe().getNom();
        }
        r.nombreParticipants = projet.getParticipants() != null ? projet.getParticipants().size() : 0;
        r.nombreCommentaires = projet.getCommentaires() != null ? projet.getCommentaires().size() : 0;
        return r;
    }

    // ─── Getters ─────────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public String getTitre() { return titre; }
    public String getDescription() { return description; }
    public String getObjectifs() { return objectifs; }
    public BigDecimal getBudgetDemande() { return budgetDemande; }
    public StatutProjet getStatut() { return statut; }
    public VisibiliteProjet getVisibilite() { return visibilite; }
    public LocalDateTime getDateCreation() { return dateCreation; }
    public LocalDateTime getDateSoumission() { return dateSoumission; }
    public LocalDateTime getDateValidation() { return dateValidation; }
    public LocalDateTime getDateCloture() { return dateCloture; }
    public String getCommentaireAdmin() { return commentaireAdmin; }
    public String getCommentaireReferent() { return commentaireReferent; }
    public LocalDateTime getDateValidationReferent() { return dateValidationReferent; }
    public LocalDateTime getDateRefusReferent() { return dateRefusReferent; }
    public Long getReferentValidateurId() { return referentValidateurId; }
    public String getReferentValidateurPrenom() { return referentValidateurPrenom; }
    public String getReferentValidateurNom() { return referentValidateurNom; }
    public String getPorteurPrenom() { return porteurPrenom; }
    public String getPorteurNom() { return porteurNom; }
    public Long getGroupeId() { return groupeId; }
    public String getGroupeNom() { return groupeNom; }
    public int getNombreParticipants() { return nombreParticipants; }
    public int getNombreCommentaires() { return nombreCommentaires; }
}
