package com.bxjeunes.bx_connect.dto;

import jakarta.validation.constraints.NotBlank;

public class CommentaireRequest {

    @NotBlank(message = "Le commentaire ne peut pas être vide")
    private String contenu;

    public String getContenu() { return contenu; }
    public void setContenu(String contenu) { this.contenu = contenu; }
}