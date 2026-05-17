package com.bxjeunes.bx_connect.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class PaiementRequest {

    @NotNull(message = "Le montant est obligatoire")
    @DecimalMin(value = "5.00", message = "Le montant minimum est de 5€")
    private BigDecimal montant;

    // ID de l'activité à soutenir (optionnel)
    private Long activiteId;

    // ─── Getters & Setters ────────────────────────────────────────────────────

    public BigDecimal getMontant() { return montant; }
    public void setMontant(BigDecimal montant) { this.montant = montant; }

    public Long getActiviteId() { return activiteId; }
    public void setActiviteId(Long activiteId) { this.activiteId = activiteId; }
}