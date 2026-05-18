package com.bxjeunes.bx_connect.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public class ProjetRequest {

    @NotBlank(message = "Le titre est obligatoire")
    private String titre;

    private String description;

    private String objectifs;

    private BigDecimal budgetDemande;

    private Long groupeId; // optionnel : rattacher à un groupe

    // ─── Getters & Setters ───────────────────────────────────────────────────

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getObjectifs() { return objectifs; }
    public void setObjectifs(String objectifs) { this.objectifs = objectifs; }

    public BigDecimal getBudgetDemande() { return budgetDemande; }
    public void setBudgetDemande(BigDecimal budgetDemande) { this.budgetDemande = budgetDemande; }

    public Long getGroupeId() { return groupeId; }
    public void setGroupeId(Long groupeId) { this.groupeId = groupeId; }
}