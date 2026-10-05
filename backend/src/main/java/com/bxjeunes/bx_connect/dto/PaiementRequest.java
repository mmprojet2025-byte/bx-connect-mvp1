package com.bxjeunes.bx_connect.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class PaiementRequest {

    @NotNull(message = "Le montant est obligatoire")
    @DecimalMin(value = "0.01", message = "Le montant doit être positif")
    private BigDecimal montant;

    // Cible du paiement (au moins un des deux doit être fourni)
    private Long activiteId;  // Soutien à une activité
    private Long projetId;    // Soutien à un projet

    // Fournisseur : 'PAYPAL' ou 'STRIPE' (défaut : STRIPE)
    private String fournisseur = "STRIPE";

    // Message optionnel du donateur/partenaire
    private String message;

    // ─── Getters & Setters ────────────────────────────────────────────────────
    public BigDecimal getMontant() { return montant; }
    public void setMontant(BigDecimal montant) { this.montant = montant; }

    public Long getActiviteId() { return activiteId; }
    public void setActiviteId(Long activiteId) { this.activiteId = activiteId; }

    public Long getProjetId() { return projetId; }
    public void setProjetId(Long projetId) { this.projetId = projetId; }

    public String getFournisseur() { return fournisseur; }
    public void setFournisseur(String fournisseur) { this.fournisseur = fournisseur; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}