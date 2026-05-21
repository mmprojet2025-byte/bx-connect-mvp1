package com.bxjeunes.bx_connect.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class SoutienRequest {

    @NotNull(message = "Le montant est obligatoire")
    @DecimalMin(value = "1.0", message = "Le montant minimum est 1€")
    private BigDecimal montant;

    private Long projetId;    // Soutien à un projet (P05)
    private Long activiteId;  // Soutien à une activité (P06)

    private String message;   // Message d'intention du partenaire

    // ─── Getters & Setters ────────────────────────────────────────────────────
    public BigDecimal getMontant() { return montant; }
    public void setMontant(BigDecimal montant) { this.montant = montant; }

    public Long getProjetId() { return projetId; }
    public void setProjetId(Long projetId) { this.projetId = projetId; }

    public Long getActiviteId() { return activiteId; }
    public void setActiviteId(Long activiteId) { this.activiteId = activiteId; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}