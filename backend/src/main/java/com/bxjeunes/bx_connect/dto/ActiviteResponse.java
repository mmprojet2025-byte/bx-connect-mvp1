package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import com.bxjeunes.bx_connect.entity.StatutInscription;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ActiviteResponse {

    private Long id;
    private String titre;
    private String description;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private String lieu;
    private String adresse;
    private String commune;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private boolean gratuite;
    private BigDecimal prix;
    private int capaciteMax;
    private StatutActivite statut;
    private String categorie;
    private String theme;
    private LocalDateTime dateCreation;
    private String createurPrenom;
    private String createurNom;
    private int nombreInscrits;
    private int placesRestantes;
    private boolean complete;
    private boolean inscrit;
    private Long inscriptionId;
    private StatutInscription statutInscription;
    private boolean peutSInscrire;
    private String raisonIndisponible;

    // ─── Constructeur depuis entité ──────────────────────────────────────────

    public static ActiviteResponse fromEntity(Activite activite) {
        ActiviteResponse response = new ActiviteResponse();
        response.id = activite.getId();
        response.titre = activite.getTitre();
        response.description = activite.getDescription();
        response.dateDebut = activite.getDateDebut();
        response.dateFin = activite.getDateFin();
        response.lieu = activite.getLieu();
        response.adresse = activite.getAdresse();
        response.commune = activite.getCommune();
        response.latitude = activite.getLatitude();
        response.longitude = activite.getLongitude();
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

    public static ActiviteResponse fromEntity(Activite activite, int nombreInscrits) {
        ActiviteResponse response = fromEntity(activite);
        response.nombreInscrits = nombreInscrits;
        if (activite.getCapaciteMax() > 0) {
            response.placesRestantes = Math.max(activite.getCapaciteMax() - nombreInscrits, 0);
            response.complete = response.placesRestantes == 0;
        } else {
            response.placesRestantes = -1;
            response.complete = false;
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
    public String getAdresse() { return adresse; }
    public String getCommune() { return commune; }
    public BigDecimal getLatitude() { return latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public boolean isGratuite() { return gratuite; }
    public BigDecimal getPrix() { return prix; }
    public int getCapaciteMax() { return capaciteMax; }
    public StatutActivite getStatut() { return statut; }
    public String getCategorie() { return categorie; }
    public String getTheme() { return theme; }
    public LocalDateTime getDateCreation() { return dateCreation; }
    public String getCreateurPrenom() { return createurPrenom; }
    public String getCreateurNom() { return createurNom; }
    public int getNombreInscrits() { return nombreInscrits; }
    public int getPlacesRestantes() { return placesRestantes; }
    public boolean isComplete() { return complete; }
    public boolean isInscrit() { return inscrit; }
    public Long getInscriptionId() { return inscriptionId; }
    public StatutInscription getStatutInscription() { return statutInscription; }
    public boolean isPeutSInscrire() { return peutSInscrire; }
    public String getRaisonIndisponible() { return raisonIndisponible; }

    public void setInscrit(boolean inscrit) { this.inscrit = inscrit; }
    public void setInscriptionId(Long inscriptionId) { this.inscriptionId = inscriptionId; }
    public void setStatutInscription(StatutInscription statutInscription) { this.statutInscription = statutInscription; }
    public void setPeutSInscrire(boolean peutSInscrire) { this.peutSInscrire = peutSInscrire; }
    public void setRaisonIndisponible(String raisonIndisponible) { this.raisonIndisponible = raisonIndisponible; }
}
