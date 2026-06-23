package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.Inscription;
import com.bxjeunes.bx_connect.entity.StatutInscription;
import com.bxjeunes.bx_connect.entity.StatutPresence;
import com.bxjeunes.bx_connect.entity.User;

import java.time.LocalDateTime;

public class PresenceResponse {

    private Long inscriptionId;
    private Long activiteId;
    private String activiteTitre;
    private Long membreId;
    private String membrePrenom;
    private String membreNom;
    private String membreEmail;
    private StatutInscription statutInscription;
    private StatutPresence statutPresence;
    private LocalDateTime dateInscription;
    private LocalDateTime datePresence;
    private Long presenceEncodeeParId;
    private String presenceEncodeeParNom;
    private Long presenceValideeParId;
    private String presenceValideeParNom;
    private LocalDateTime dateValidationPresence;
    private String commentairePresence;

    public static PresenceResponse fromEntity(Inscription inscription) {
        PresenceResponse response = new PresenceResponse();
        response.inscriptionId = inscription.getId();
        response.statutInscription = inscription.getStatut();
        response.statutPresence = inscription.getStatutPresence();
        response.dateInscription = inscription.getDateInscription();
        response.datePresence = inscription.getDatePresence();
        response.dateValidationPresence = inscription.getDateValidationPresence();
        response.commentairePresence = inscription.getCommentairePresence();

        if (inscription.getActivite() != null) {
            response.activiteId = inscription.getActivite().getId();
            response.activiteTitre = inscription.getActivite().getTitre();
        }
        if (inscription.getMembre() != null) {
            response.membreId = inscription.getMembre().getId();
            response.membrePrenom = inscription.getMembre().getPrenom();
            response.membreNom = inscription.getMembre().getNom();
            response.membreEmail = inscription.getMembre().getEmail();
        }
        remplirUtilisateurEncodage(response, inscription.getPresenceEncodeePar(), true);
        remplirUtilisateurEncodage(response, inscription.getPresenceValideePar(), false);
        return response;
    }

    private static void remplirUtilisateurEncodage(PresenceResponse response, User user, boolean encodage) {
        if (user == null) {
            return;
        }
        String nom = ((user.getPrenom() == null ? "" : user.getPrenom()) + " "
                + (user.getNom() == null ? "" : user.getNom())).trim();
        if (nom.isBlank()) {
            nom = user.getEmail();
        }
        if (encodage) {
            response.presenceEncodeeParId = user.getId();
            response.presenceEncodeeParNom = nom;
        } else {
            response.presenceValideeParId = user.getId();
            response.presenceValideeParNom = nom;
        }
    }

    public Long getInscriptionId() { return inscriptionId; }
    public Long getActiviteId() { return activiteId; }
    public String getActiviteTitre() { return activiteTitre; }
    public Long getMembreId() { return membreId; }
    public String getMembrePrenom() { return membrePrenom; }
    public String getMembreNom() { return membreNom; }
    public String getMembreEmail() { return membreEmail; }
    public StatutInscription getStatutInscription() { return statutInscription; }
    public StatutPresence getStatutPresence() { return statutPresence; }
    public LocalDateTime getDateInscription() { return dateInscription; }
    public LocalDateTime getDatePresence() { return datePresence; }
    public Long getPresenceEncodeeParId() { return presenceEncodeeParId; }
    public String getPresenceEncodeeParNom() { return presenceEncodeeParNom; }
    public Long getPresenceValideeParId() { return presenceValideeParId; }
    public String getPresenceValideeParNom() { return presenceValideeParNom; }
    public LocalDateTime getDateValidationPresence() { return dateValidationPresence; }
    public String getCommentairePresence() { return commentairePresence; }
}
