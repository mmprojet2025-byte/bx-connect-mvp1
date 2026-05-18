package com.bxjeunes.bx_connect.dto;

import jakarta.validation.constraints.NotBlank;

public class GroupeRequest {

    @NotBlank(message = "Le nom du groupe est obligatoire")
    private String nom;

    private String description;

    private String categorie;

    // ─── Getters & Setters ───────────────────────────────────────────────────

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategorie() { return categorie; }
    public void setCategorie(String categorie) { this.categorie = categorie; }
}