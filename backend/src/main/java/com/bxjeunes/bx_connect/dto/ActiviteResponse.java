package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.StatutActivite;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ActiviteResponse {

    private Long id;
    private String titre;
    private String description;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private String lieu;
    private boolean gratuite;
    private BigDecimal prix;
    private int capaciteMax;
    private StatutActivite statut;
    private String categorie;
    private String theme;
    private LocalDateTime dateCreation;
    private String createurPrenom;
    private String createurNom;

    // ─── Constructeur depuis entité ──────────────────────────────────────────

    public static ActiviteResponse fromEntity(Activite activite) {
        ActiviteResponse response = new ActiviteResponse();
        response.id = activite.getId();
        response.titre = activite.getTitre();
        response.description = activite.getDescription();
        response.dateDebut = activite.getDateDebut();
        response.dateFin = activite.getDateFin();
        response.lieu = activite.getLieu();
        response.gratuite = activite.isGratuite();
        response.prix = activite.getPrix();
        response.capaciteMax = activite.getCapaciteMax();
        response.statut = activite.getStatut();
        response.categorie = activite.getCategorie();
        response.theme = activite.getTheme();
        response.dateCreation = activite.getDateCreation();
        if (activite.getCreateur() != null) {
            response.createurPrenom = activite.getCreateur().getPrenom();
            response.createurNom = activite.getCreateur().getNom();
        }
        return response;
    }

    // ─── Getters ─────────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public String getTitre() { return titre; }
    public String getDescription() { return description; }
    public LocalDateTime getDateDebut() { return dateDebut; }
    public LocalDateTime getDateFin() { return dateFin; }
    public String getLieu() { return lieu; }
    public boolean isGratuite() { return gratuite; }
    public BigDecimal getPrix() { return prix; }
    public int getCapaciteMax() { return capaciteMax; }
    public StatutActivite getStatut() { return statut; }
    public String getCategorie() { return categorie; }
    public String getTheme() { return theme; }
    public LocalDateTime getDateCreation() { return dateCreation; }
    public String getCreateurPrenom() { return createurPrenom; }
    public String getCreateurNom() { return createurNom; }
}