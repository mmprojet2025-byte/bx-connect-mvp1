package com.bxjeunes.bx_connect.dto;

import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDateTime;

/**
 * DTO pour les filtres de recherche d'activités (V03, V06)
 * Tous les champs sont optionnels — null = pas de filtre
 */
public class ActiviteFiltreRequest {

    private String q;           // Recherche mot-clé (V06)
    private String categorie;   // Filtre catégorie (V03)
    private String theme;       // Filtre thème (V03)
    private String lieu;        // Filtre lieu (V03)
    private Boolean gratuite;   // Filtre gratuit/payant

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime dateDebut; // Filtre date début (V03)

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime dateFin;   // Filtre date fin (V03)

    // ─── Getters & Setters ────────────────────────────────────────────────────
    public String getQ() { return q; }
    public void setQ(String q) { this.q = q; }

    public String getCategorie() { return categorie; }
    public void setCategorie(String categorie) { this.categorie = categorie; }

    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }

    public String getLieu() { return lieu; }
    public void setLieu(String lieu) { this.lieu = lieu; }

    public Boolean getGratuite() { return gratuite; }
    public void setGratuite(Boolean gratuite) { this.gratuite = gratuite; }

    public LocalDateTime getDateDebut() { return dateDebut; }
    public void setDateDebut(LocalDateTime dateDebut) { this.dateDebut = dateDebut; }

    public LocalDateTime getDateFin() { return dateFin; }
    public void setDateFin(LocalDateTime dateFin) { this.dateFin = dateFin; }
}