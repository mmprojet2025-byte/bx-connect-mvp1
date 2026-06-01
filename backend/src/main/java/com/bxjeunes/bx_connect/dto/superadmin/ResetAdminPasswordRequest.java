package com.bxjeunes.bx_connect.dto.superadmin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ResetAdminPasswordRequest {

    @NotBlank
    @Size(min = 8)
    private String nouveauMotDePasseTemporaire;

    public String getNouveauMotDePasseTemporaire() {
        return nouveauMotDePasseTemporaire;
    }

    public void setNouveauMotDePasseTemporaire(String nouveauMotDePasseTemporaire) {
        this.nouveauMotDePasseTemporaire = nouveauMotDePasseTemporaire;
    }
}
