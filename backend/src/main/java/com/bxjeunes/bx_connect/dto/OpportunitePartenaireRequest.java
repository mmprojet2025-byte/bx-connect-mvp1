package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.CategorieOpportunite;
import com.bxjeunes.bx_connect.entity.ModeCandidature;
import com.bxjeunes.bx_connect.entity.PublicCibleOpportunite;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public class OpportunitePartenaireRequest {

    @NotBlank(message = "Le titre est obligatoire")
    @Size(max = 200, message = "Le titre ne peut pas dépasser 200 caractères")
    private String titre;

    @NotBlank(message = "Le contenu est obligatoire")
    private String contenu;

    @NotNull(message = "La catégorie d'opportunité est obligatoire")
    private CategorieOpportunite categorieOpportunite;

    @Size(max = 300, message = "La description courte ne peut pas dépasser 300 caractères")
    private String descriptionCourte;

    @Size(max = 500, message = "Le lien externe ne peut pas dépasser 500 caractères")
    private String lienExterne;

    private LocalDateTime dateExpiration;
    private LocalDateTime dateLimite;

    @Min(value = 1, message = "Le nombre de places doit être supérieur à 0")
    private Integer nombrePlaces;

    private ModeCandidature modeCandidature;
    private PublicCibleOpportunite publicCible;
    private Boolean miseEnAvant;

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }
    public String getContenu() { return contenu; }
    public void setContenu(String contenu) { this.contenu = contenu; }
    public CategorieOpportunite getCategorieOpportunite() { return categorieOpportunite; }
    public void setCategorieOpportunite(CategorieOpportunite categorieOpportunite) { this.categorieOpportunite = categorieOpportunite; }
    public String getDescriptionCourte() { return descriptionCourte; }
    public void setDescriptionCourte(String descriptionCourte) { this.descriptionCourte = descriptionCourte; }
    public String getLienExterne() { return lienExterne; }
    public void setLienExterne(String lienExterne) { this.lienExterne = lienExterne; }
    public LocalDateTime getDateExpiration() { return dateExpiration; }
    public void setDateExpiration(LocalDateTime dateExpiration) { this.dateExpiration = dateExpiration; }
    public LocalDateTime getDateLimite() { return dateLimite; }
    public void setDateLimite(LocalDateTime dateLimite) { this.dateLimite = dateLimite; }
    public Integer getNombrePlaces() { return nombrePlaces; }
    public void setNombrePlaces(Integer nombrePlaces) { this.nombrePlaces = nombrePlaces; }
    public ModeCandidature getModeCandidature() { return modeCandidature; }
    public void setModeCandidature(ModeCandidature modeCandidature) { this.modeCandidature = modeCandidature; }
    public PublicCibleOpportunite getPublicCible() { return publicCible; }
    public void setPublicCible(PublicCibleOpportunite publicCible) { this.publicCible = publicCible; }
    public Boolean getMiseEnAvant() { return miseEnAvant; }
    public void setMiseEnAvant(Boolean miseEnAvant) { this.miseEnAvant = miseEnAvant; }
}
