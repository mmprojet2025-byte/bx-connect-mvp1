package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.Annonce;
import com.bxjeunes.bx_connect.entity.CategorieOpportunite;
import com.bxjeunes.bx_connect.entity.ModeCandidature;
import com.bxjeunes.bx_connect.entity.PublicCibleOpportunite;
import com.bxjeunes.bx_connect.entity.StatutModeration;

import java.time.LocalDateTime;

public class AnnonceResponse {
    private Long id;
    private String titre;
    private String contenu;
    private String type;
    private CategorieOpportunite categorieOpportunite;
    private StatutModeration statutModeration;
    private String lienExterne;
    private String descriptionCourte;
    private Integer nombrePlaces;
    private LocalDateTime dateLimite;
    private ModeCandidature modeCandidature;
    private PublicCibleOpportunite publicCible;
    private boolean miseEnAvant;
    private boolean epinglee;
    private LocalDateTime dateCreation;
    private LocalDateTime dateExpiration;
    private String auteurPrenom;
    private String auteurNom;
    private String auteurRole;
    private String auteurEmail;
    private Long groupeId;
    private String groupeNom;

    public static AnnonceResponse fromEntity(Annonce annonce) {
        AnnonceResponse response = new AnnonceResponse();
        response.id = annonce.getId();
        response.titre = annonce.getTitre();
        response.contenu = annonce.getContenu();
        response.type = annonce.getType();
        response.categorieOpportunite = annonce.getCategorieOpportunite();
        response.statutModeration = annonce.getStatutModeration();
        response.lienExterne = annonce.getLienExterne();
        response.descriptionCourte = annonce.getDescriptionCourte();
        response.nombrePlaces = annonce.getNombrePlaces();
        response.dateLimite = annonce.getDateLimite();
        response.modeCandidature = annonce.getModeCandidature();
        response.publicCible = annonce.getPublicCible();
        response.miseEnAvant = annonce.isMiseEnAvant();
        response.epinglee = annonce.isEpinglee();
        response.dateCreation = annonce.getDateCreation();
        response.dateExpiration = annonce.getDateExpiration();
        if (annonce.getAuteur() != null) {
            response.auteurPrenom = annonce.getAuteur().getPrenom();
            response.auteurNom = annonce.getAuteur().getNom();
            response.auteurRole = annonce.getAuteur().getRole().name();
            response.auteurEmail = annonce.getAuteur().getEmail();
        }
        if (annonce.getGroupe() != null) {
            response.groupeId = annonce.getGroupe().getId();
            response.groupeNom = annonce.getGroupe().getNom();
        }
        return response;
    }

    public Long getId() { return id; }
    public String getTitre() { return titre; }
    public String getContenu() { return contenu; }
    public String getType() { return type; }
    public CategorieOpportunite getCategorieOpportunite() { return categorieOpportunite; }
    public StatutModeration getStatutModeration() { return statutModeration; }
    public String getLienExterne() { return lienExterne; }
    public String getDescriptionCourte() { return descriptionCourte; }
    public Integer getNombrePlaces() { return nombrePlaces; }
    public LocalDateTime getDateLimite() { return dateLimite; }
    public ModeCandidature getModeCandidature() { return modeCandidature; }
    public PublicCibleOpportunite getPublicCible() { return publicCible; }
    public boolean isMiseEnAvant() { return miseEnAvant; }
    public boolean isEpinglee() { return epinglee; }
    public LocalDateTime getDateCreation() { return dateCreation; }
    public LocalDateTime getDateExpiration() { return dateExpiration; }
    public String getAuteurPrenom() { return auteurPrenom; }
    public String getAuteurNom() { return auteurNom; }
    public String getAuteurRole() { return auteurRole; }
    public String getAuteurEmail() { return auteurEmail; }
    public Long getGroupeId() { return groupeId; }
    public String getGroupeNom() { return groupeNom; }
}
