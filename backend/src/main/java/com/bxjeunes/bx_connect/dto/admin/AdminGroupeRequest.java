package com.bxjeunes.bx_connect.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AdminGroupeRequest {

    @NotBlank(message = "Le nom du groupe est obligatoire")
    private String nom;

    private String description;
    private String categorie;
    private String theme;
    private String objectif;
    private int capaciteMax;

    @NotNull(message = "Le referent est obligatoire")
    private Long referentId;

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCategorie() { return categorie; }
    public void setCategorie(String categorie) { this.categorie = categorie; }
    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
    public String getObjectif() { return objectif; }
    public void setObjectif(String objectif) { this.objectif = objectif; }
    public int getCapaciteMax() { return capaciteMax; }
    public void setCapaciteMax(int capaciteMax) { this.capaciteMax = capaciteMax; }
    public Long getReferentId() { return referentId; }
    public void setReferentId(Long referentId) { this.referentId = referentId; }
}
