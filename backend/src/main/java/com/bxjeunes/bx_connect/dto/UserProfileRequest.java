package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.Langue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UserProfileRequest {

    @NotBlank(message = "Le prénom est obligatoire")
    @Size(max = 50, message = "Le prénom ne peut pas dépasser 50 caractères")
    private String prenom;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 50, message = "Le nom ne peut pas dépasser 50 caractères")
    private String nom;

    private Langue languePreference;

    // ─── Getters & Setters ───────────────────────────────────────────────────

    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public Langue getLanguePreference() { return languePreference; }
    public void setLanguePreference(Langue languePreference) { this.languePreference = languePreference; }
}