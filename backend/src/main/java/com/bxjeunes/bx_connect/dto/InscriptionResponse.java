package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.Inscription;
import com.bxjeunes.bx_connect.entity.StatutInscription;

import java.time.LocalDateTime;

public class InscriptionResponse {

    private Long id;
    private Long activiteId;
    private String activiteTitre;
    private String activiteLieu;
    private LocalDateTime activiteDateDebut;
    private boolean activiteGratuite;
    private StatutInscription statut;
    private LocalDateTime dateInscription;
    private LocalDateTime dateAnnulation;
    private String membrePrenom;
    private String membreNom;
    private String membreEmail;

    // ─── Constructeur depuis entité ──────────────────────────────────────────

    public static InscriptionResponse fromEntity(Inscription inscription) {
        InscriptionResponse response = new InscriptionResponse();
        response.id = inscription.getId();
        response.statut = inscription.getStatut();
        response.dateInscription = inscription.getDateInscription();
        response.dateAnnulation = inscription.getDateAnnulation();

        if (inscription.getActivite() != null) {
            response.activiteId = inscription.getActivite().getId();
            response.activiteTitre = inscription.getActivite().getTitre();
            response.activiteLieu = inscription.getActivite().getLieu();
            response.activiteDateDebut = inscription.getActivite().getDateDebut();
            response.activiteGratuite = inscription.getActivite().isGratuite();
        }

        if (inscription.getMembre() != null) {
            response.membrePrenom = inscription.getMembre().getPrenom();
            response.membreNom = inscription.getMembre().getNom();
            response.membreEmail = inscription.getMembre().getEmail();
        }

        return response;
    }

    // ─── Getters ─────────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public Long getActiviteId() { return activiteId; }
    public String getActiviteTitre() { return activiteTitre; }
    public String getActiviteLieu() { return activiteLieu; }
    public LocalDateTime getActiviteDateDebut() { return activiteDateDebut; }
    public boolean isActiviteGratuite() { return activiteGratuite; }
    public StatutInscription getStatut() { return statut; }
    public LocalDateTime getDateInscription() { return dateInscription; }
    public LocalDateTime getDateAnnulation() { return dateAnnulation; }
    public String getMembrePrenom() { return membrePrenom; }
    public String getMembreNom() { return membreNom; }
    public String getMembreEmail() { return membreEmail; }
}