package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.VisibiliteActivite;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ActiviteRequest {
    private String imageStorageKey;
    public String getImageStorageKey() { return imageStorageKey; }
    public void setImageStorageKey(String value) { imageStorageKey = value; }


    @NotBlank(message = "Le titre est obligatoire")
    private String titre;

    private String description;

    @NotNull(message = "La date de début est obligatoire")
    private LocalDateTime dateDebut;

    @NotNull(message = "La date de fin est obligatoire")
    private LocalDateTime dateFin;
    private LocalDateTime dateLimiteInscription;
    private boolean dateLimiteFournie;

    private String lieu;

    private String adresse;

    private String commune;

    private BigDecimal latitude;

    private BigDecimal longitude;

    private boolean gratuite = true;

    private BigDecimal prix;

    private int capaciteMax = 0;

    private String categorie;

    private String theme;

    // Optional client intention only; the persisted nature is derived from groupe.
    public enum Nature { GENERALE, GROUPE }
    private Nature nature;
    private Long groupeId;
    private Long referentAssigneId;
    private VisibiliteActivite visibilite;
    private boolean groupeFourni;
    private boolean referentFourni;

    public Nature getNature() { return nature; }
    public void setNature(Nature nature) { this.nature = nature; }
    public Long getGroupeId() { return groupeId; }
    public void setGroupeId(Long groupeId) { this.groupeId = groupeId; this.groupeFourni = true; }
    public Long getReferentAssigneId() { return referentAssigneId; }
    public void setReferentAssigneId(Long id) { this.referentAssigneId = id; this.referentFourni = true; }
    public VisibiliteActivite getVisibilite() { return visibilite; }
    public void setVisibilite(VisibiliteActivite visibilite) { this.visibilite = visibilite; }
    @JsonIgnore
    public boolean isGroupeFourni() { return groupeFourni; }
    @JsonIgnore
    public boolean isReferentFourni() { return referentFourni; }

    // ─── Getters & Setters ───────────────────────────────────────────────────

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getDateDebut() { return dateDebut; }
    public void setDateDebut(LocalDateTime dateDebut) { this.dateDebut = dateDebut; }

    @com.fasterxml.jackson.annotation.JsonIgnore
    public boolean isDateLimiteFournie() { return dateLimiteFournie; }
    public LocalDateTime getDateLimiteInscription() { return dateLimiteInscription; }
    public void setDateLimiteInscription(LocalDateTime value) { dateLimiteInscription = value; dateLimiteFournie = true; }

    public LocalDateTime getDateFin() { return dateFin; }
    public void setDateFin(LocalDateTime dateFin) { this.dateFin = dateFin; }

    public String getLieu() { return lieu; }
    public void setLieu(String lieu) { this.lieu = lieu; }

    public String getAdresse() { return adresse; }
    public void setAdresse(String adresse) { this.adresse = adresse; }

    public String getCommune() { return commune; }
    public void setCommune(String commune) { this.commune = commune; }

    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }

    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }

    public boolean isGratuite() { return gratuite; }
    public void setGratuite(boolean gratuite) { this.gratuite = gratuite; }

    public BigDecimal getPrix() { return prix; }
    public void setPrix(BigDecimal prix) { this.prix = prix; }

    public int getCapaciteMax() { return capaciteMax; }
    public void setCapaciteMax(int capaciteMax) { this.capaciteMax = capaciteMax; }

    public String getCategorie() { return categorie; }
    public void setCategorie(String categorie) { this.categorie = categorie; }

    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
}
