package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.Projet;

public record ProjetAdminResponse(
        ProjetResponse projet,
        String justificationAdmin,
        String bilan) {

    public static ProjetAdminResponse fromEntity(Projet projet) {
        return new ProjetAdminResponse(
                ProjetResponse.fromEntity(projet),
                projet.getJustificationAdmin(),
                projet.getBilan());
    }
}
