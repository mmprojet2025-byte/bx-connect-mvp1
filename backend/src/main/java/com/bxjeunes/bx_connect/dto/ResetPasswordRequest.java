package com.bxjeunes.bx_connect.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public class ResetPasswordRequest {

    @NotBlank(message = "Le jeton de reinitialisation est obligatoire")
    @Size(min = 32, max = 512, message = "Le jeton de reinitialisation est invalide")
    private String token;

    @NotBlank(message = "Le nouveau mot de passe est obligatoire")
    @Size(min = 12, max = 128, message = "Le mot de passe doit contenir entre 12 et 128 caracteres")
    private String nouveauMotDePasse;

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getNouveauMotDePasse() {
        return nouveauMotDePasse;
    }

    public void setNouveauMotDePasse(String nouveauMotDePasse) {
        this.nouveauMotDePasse = nouveauMotDePasse;
    }
}
