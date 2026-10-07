package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.VisibiliteProjet;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public class ProjetRequest {

    @NotBlank(message = "Le titre est obligatoire")
    private String titre;

    private String description;

    private String objectifs;


    @jakarta.validation.constraints.Positive
    private Integer capacite;
    private java.time.LocalDate dateExecution;
    private java.time.LocalDate dateLimiteParticipation;
    @Size(max = 500)
    private String imageUrl;

    private BigDecimal budgetDemande;

    @jakarta.validation.constraints.NotNull
    @jakarta.validation.constraints.DecimalMin("0.00")
    @jakarta.validation.constraints.Digits(integer = 8, fraction = 2)
    private BigDecimal prixParticipation = BigDecimal.ZERO;

    private Long groupeId; // optionnel : rattacher à un groupe

    @Size(max = 500, message = "La justification ne peut pas depasser 500 caracteres")
    private String justificationAdmin;

    private VisibiliteProjet visibilite = VisibiliteProjet.GROUPE;

    // ─── Getters & Setters ───────────────────────────────────────────────────

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getObjectifs() { return objectifs; }
    public void setObjectifs(String objectifs) { this.objectifs = objectifs; }

    public BigDecimal getPrixParticipation() { return prixParticipation; }
    public void setPrixParticipation(BigDecimal value) { prixParticipation = value; }

    public BigDecimal getBudgetDemande() { return budgetDemande; }
    public void setBudgetDemande(BigDecimal budgetDemande) { this.budgetDemande = budgetDemande; }

    public Long getGroupeId() { return groupeId; }
    public void setGroupeId(Long groupeId) { this.groupeId = groupeId; }

    public String getJustificationAdmin() { return justificationAdmin; }
    public void setJustificationAdmin(String justificationAdmin) { this.justificationAdmin = justificationAdmin; }

    public VisibiliteProjet getVisibilite() {
        return visibilite == null ? VisibiliteProjet.GROUPE : visibilite;
    }
    public void setVisibilite(VisibiliteProjet visibilite) {
        this.visibilite = visibilite == null ? VisibiliteProjet.GROUPE : visibilite;
    }

    public Integer getCapacite() { return capacite; }
    public void setCapacite(Integer value) { capacite = value; }
    public java.time.LocalDate getDateExecution() { return dateExecution; }
    public void setDateExecution(java.time.LocalDate value) { dateExecution = value; }
    public java.time.LocalDate getDateLimiteParticipation() { return dateLimiteParticipation; }
    public void setDateLimiteParticipation(java.time.LocalDate value) { dateLimiteParticipation = value; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String value) { imageUrl = value; }
}
