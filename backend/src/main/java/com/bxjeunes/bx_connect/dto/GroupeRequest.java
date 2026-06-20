package com.bxjeunes.bx_connect.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public class GroupeRequest {

    @NotBlank(message = "Le nom du groupe est obligatoire")
    private String nom;

    private String description;
    private String categorie;

    // ─── Nouveaux champs logique métier ──────────────────────────────────────
    private String theme;       // Thème du groupe
    private String objectif;    // Objectif du groupe
    private String adresseReunion;
    private String commune;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private int capaciteMax;    // Capacité maximale (0 = illimité)

    // ─── Getters & Setters ────────────────────────────────────────────────────
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

    public String getAdresseReunion() { return adresseReunion; }
    public void setAdresseReunion(String adresseReunion) { this.adresseReunion = adresseReunion; }

    public String getCommune() { return commune; }
    public void setCommune(String commune) { this.commune = commune; }

    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }

    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }

    public int getCapaciteMax() { return capaciteMax; }
    public void setCapaciteMax(int capaciteMax) { this.capaciteMax = capaciteMax; }
}
