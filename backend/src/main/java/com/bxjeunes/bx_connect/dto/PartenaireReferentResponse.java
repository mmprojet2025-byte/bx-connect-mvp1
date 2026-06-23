package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.PartenaireReferent;
import com.bxjeunes.bx_connect.entity.StatutAffectationPartenaire;

import java.time.LocalDateTime;

public class PartenaireReferentResponse {

    private Long id;
    private Long partenaireProfilId;
    private Long partenaireUserId;
    private String nomOrganisation;
    private String typePartenaire;
    private String logoUrl;
    private Long referentId;
    private String referentPrenom;
    private String referentNom;
    private String referentEmail;
    private StatutAffectationPartenaire statut;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private String commentaire;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PartenaireReferentResponse fromEntity(PartenaireReferent affectation) {
        PartenaireReferentResponse response = new PartenaireReferentResponse();
        response.id = affectation.getId();
        response.statut = affectation.getStatut();
        response.dateDebut = affectation.getDateDebut();
        response.dateFin = affectation.getDateFin();
        response.commentaire = affectation.getCommentaire();
        response.createdAt = affectation.getCreatedAt();
        response.updatedAt = affectation.getUpdatedAt();
        if (affectation.getPartenaireProfil() != null) {
            response.partenaireProfilId = affectation.getPartenaireProfil().getId();
            response.nomOrganisation = affectation.getPartenaireProfil().getNomOrganisation();
            response.typePartenaire = affectation.getPartenaireProfil().getTypePartenaire() != null
                    ? affectation.getPartenaireProfil().getTypePartenaire().name()
                    : null;
            response.logoUrl = affectation.getPartenaireProfil().getLogoUrl();
            if (affectation.getPartenaireProfil().getUtilisateur() != null) {
                response.partenaireUserId = affectation.getPartenaireProfil().getUtilisateur().getId();
            }
        }
        if (affectation.getReferent() != null) {
            response.referentId = affectation.getReferent().getId();
            response.referentPrenom = affectation.getReferent().getPrenom();
            response.referentNom = affectation.getReferent().getNom();
            response.referentEmail = affectation.getReferent().getEmail();
        }
        return response;
    }

    public Long getId() { return id; }
    public Long getPartenaireProfilId() { return partenaireProfilId; }
    public Long getPartenaireUserId() { return partenaireUserId; }
    public String getNomOrganisation() { return nomOrganisation; }
    public String getTypePartenaire() { return typePartenaire; }
    public String getLogoUrl() { return logoUrl; }
    public Long getReferentId() { return referentId; }
    public String getReferentPrenom() { return referentPrenom; }
    public String getReferentNom() { return referentNom; }
    public String getReferentEmail() { return referentEmail; }
    public StatutAffectationPartenaire getStatut() { return statut; }
    public LocalDateTime getDateDebut() { return dateDebut; }
    public LocalDateTime getDateFin() { return dateFin; }
    public String getCommentaire() { return commentaire; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
