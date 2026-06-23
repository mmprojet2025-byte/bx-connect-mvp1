package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.PartenaireGroupe;
import com.bxjeunes.bx_connect.entity.StatutAffectationPartenaire;
import com.bxjeunes.bx_connect.entity.TypeLienPartenaire;

import java.time.LocalDateTime;

public class PartenaireGroupeResponse {

    private Long id;
    private Long partenaireProfilId;
    private Long partenaireUserId;
    private String nomOrganisation;
    private String typePartenaire;
    private String logoUrl;
    private Long groupeId;
    private String groupeNom;
    private Long referentId;
    private String referentPrenom;
    private String referentNom;
    private TypeLienPartenaire typeLien;
    private StatutAffectationPartenaire statut;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private String commentaire;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PartenaireGroupeResponse fromEntity(PartenaireGroupe affectation) {
        PartenaireGroupeResponse response = new PartenaireGroupeResponse();
        response.id = affectation.getId();
        response.typeLien = affectation.getTypeLien();
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
        if (affectation.getGroupe() != null) {
            response.groupeId = affectation.getGroupe().getId();
            response.groupeNom = affectation.getGroupe().getNom();
            if (affectation.getGroupe().getReferent() != null) {
                response.referentId = affectation.getGroupe().getReferent().getId();
                response.referentPrenom = affectation.getGroupe().getReferent().getPrenom();
                response.referentNom = affectation.getGroupe().getReferent().getNom();
            }
        }
        return response;
    }

    public Long getId() { return id; }
    public Long getPartenaireProfilId() { return partenaireProfilId; }
    public Long getPartenaireUserId() { return partenaireUserId; }
    public String getNomOrganisation() { return nomOrganisation; }
    public String getTypePartenaire() { return typePartenaire; }
    public String getLogoUrl() { return logoUrl; }
    public Long getGroupeId() { return groupeId; }
    public String getGroupeNom() { return groupeNom; }
    public Long getReferentId() { return referentId; }
    public String getReferentPrenom() { return referentPrenom; }
    public String getReferentNom() { return referentNom; }
    public TypeLienPartenaire getTypeLien() { return typeLien; }
    public StatutAffectationPartenaire getStatut() { return statut; }
    public LocalDateTime getDateDebut() { return dateDebut; }
    public LocalDateTime getDateFin() { return dateFin; }
    public String getCommentaire() { return commentaire; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
