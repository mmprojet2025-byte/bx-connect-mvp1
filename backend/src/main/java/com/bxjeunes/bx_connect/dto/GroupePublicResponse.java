package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.Groupe;

import java.math.BigDecimal;

/**
 * Representation exposed by the public group catalogue and public group page.
 * Membership, capacity and referent data deliberately stay out of this contract.
 */
public record GroupePublicResponse(
        Long id,
        String nom,
        String description,
        String categorie,
        String theme,
        String objectif,
        String adresseReunion,
        String commune,
        BigDecimal latitude,
        BigDecimal longitude
) {
    public static GroupePublicResponse fromEntity(Groupe groupe) {
        return new GroupePublicResponse(
                groupe.getId(),
                groupe.getNom(),
                groupe.getDescription(),
                groupe.getCategorie(),
                groupe.getTheme(),
                groupe.getObjectif(),
                groupe.getAdresseReunion(),
                groupe.getCommune(),
                groupe.getLatitude(),
                groupe.getLongitude()
        );
    }
}
