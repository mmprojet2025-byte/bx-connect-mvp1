package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.Projet;

import java.time.LocalDateTime;

public final class ProjetReviewResponse extends ProjetResponse {

    private final String commentaireAdmin;
    private final String commentaireReferent;
    private final LocalDateTime dateValidationReferent;
    private final LocalDateTime dateRefusReferent;
    private final Long referentValidateurId;
    private final String referentValidateurPrenom;
    private final String referentValidateurNom;

    private ProjetReviewResponse(Projet projet) {
        super(projet);
        commentaireAdmin = projet.getCommentaireAdmin();
        commentaireReferent = projet.getCommentaireReferent();
        dateValidationReferent = projet.getDateValidationReferent();
        dateRefusReferent = projet.getDateRefusReferent();
        if (projet.getReferentValidateur() == null) {
            referentValidateurId = null;
            referentValidateurPrenom = null;
            referentValidateurNom = null;
        } else {
            referentValidateurId = projet.getReferentValidateur().getId();
            referentValidateurPrenom = projet.getReferentValidateur().getPrenom();
            referentValidateurNom = projet.getReferentValidateur().getNom();
        }
    }

    public static ProjetReviewResponse fromEntity(Projet projet) {
        return new ProjetReviewResponse(projet);
    }

    public String getCommentaireAdmin() { return commentaireAdmin; }
    public String getCommentaireReferent() { return commentaireReferent; }
    public LocalDateTime getDateValidationReferent() { return dateValidationReferent; }
    public LocalDateTime getDateRefusReferent() { return dateRefusReferent; }
    public Long getReferentValidateurId() { return referentValidateurId; }
    public String getReferentValidateurPrenom() { return referentValidateurPrenom; }
    public String getReferentValidateurNom() { return referentValidateurNom; }
}
