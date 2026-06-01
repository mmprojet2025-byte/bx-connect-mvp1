package com.bxjeunes.bx_connect.dto.membre;

import com.bxjeunes.bx_connect.entity.StatutInscription;
import com.bxjeunes.bx_connect.entity.StatutProjet;

import java.time.LocalDateTime;
import java.util.List;

public class MembreDashboardResponse {

    private GroupeDashboard groupe;
    private ReferentDashboard referent;
    private boolean messagerieDisponible;
    private List<InscriptionDashboard> inscriptions;
    private List<ProjetDashboard> projets;
    private List<NotificationDashboard> notifications;
    private ImplicationDashboard implication;

    public GroupeDashboard getGroupe() { return groupe; }
    public void setGroupe(GroupeDashboard groupe) { this.groupe = groupe; }

    public ReferentDashboard getReferent() { return referent; }
    public void setReferent(ReferentDashboard referent) { this.referent = referent; }

    public boolean isMessagerieDisponible() { return messagerieDisponible; }
    public void setMessagerieDisponible(boolean messagerieDisponible) { this.messagerieDisponible = messagerieDisponible; }

    public List<InscriptionDashboard> getInscriptions() { return inscriptions; }
    public void setInscriptions(List<InscriptionDashboard> inscriptions) { this.inscriptions = inscriptions; }

    public List<ProjetDashboard> getProjets() { return projets; }
    public void setProjets(List<ProjetDashboard> projets) { this.projets = projets; }

    public List<NotificationDashboard> getNotifications() { return notifications; }
    public void setNotifications(List<NotificationDashboard> notifications) { this.notifications = notifications; }

    public ImplicationDashboard getImplication() { return implication; }
    public void setImplication(ImplicationDashboard implication) { this.implication = implication; }

    public static class GroupeDashboard {
        private Long id;
        private String nom;
        private String description;
        private String imageUrl;
        private String statutAdhesion;
        private int nombreMembres;
        private long nombreActivitesAVenir;
        private LocalDateTime dateAdhesion;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getNom() { return nom; }
        public void setNom(String nom) { this.nom = nom; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getImageUrl() { return imageUrl; }
        public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
        public String getStatutAdhesion() { return statutAdhesion; }
        public void setStatutAdhesion(String statutAdhesion) { this.statutAdhesion = statutAdhesion; }
        public int getNombreMembres() { return nombreMembres; }
        public void setNombreMembres(int nombreMembres) { this.nombreMembres = nombreMembres; }
        public long getNombreActivitesAVenir() { return nombreActivitesAVenir; }
        public void setNombreActivitesAVenir(long nombreActivitesAVenir) { this.nombreActivitesAVenir = nombreActivitesAVenir; }
        public LocalDateTime getDateAdhesion() { return dateAdhesion; }
        public void setDateAdhesion(LocalDateTime dateAdhesion) { this.dateAdhesion = dateAdhesion; }
    }

    public static class ReferentDashboard {
        private Long id;
        private String prenom;
        private String nom;
        private String email;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getPrenom() { return prenom; }
        public void setPrenom(String prenom) { this.prenom = prenom; }
        public String getNom() { return nom; }
        public void setNom(String nom) { this.nom = nom; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }

    public static class InscriptionDashboard {
        private Long id;
        private Long activiteId;
        private String activiteTitre;
        private String activiteLieu;
        private LocalDateTime activiteDateDebut;
        private StatutInscription statut;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public Long getActiviteId() { return activiteId; }
        public void setActiviteId(Long activiteId) { this.activiteId = activiteId; }
        public String getActiviteTitre() { return activiteTitre; }
        public void setActiviteTitre(String activiteTitre) { this.activiteTitre = activiteTitre; }
        public String getActiviteLieu() { return activiteLieu; }
        public void setActiviteLieu(String activiteLieu) { this.activiteLieu = activiteLieu; }
        public LocalDateTime getActiviteDateDebut() { return activiteDateDebut; }
        public void setActiviteDateDebut(LocalDateTime activiteDateDebut) { this.activiteDateDebut = activiteDateDebut; }
        public StatutInscription getStatut() { return statut; }
        public void setStatut(StatutInscription statut) { this.statut = statut; }
    }

    public static class ProjetDashboard {
        private Long id;
        private String titre;
        private StatutProjet statut;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getTitre() { return titre; }
        public void setTitre(String titre) { this.titre = titre; }
        public StatutProjet getStatut() { return statut; }
        public void setStatut(StatutProjet statut) { this.statut = statut; }
    }

    public static class NotificationDashboard {
        private Long id;
        private String titre;
        private String message;
        private boolean lue;
        private LocalDateTime dateCreation;
        private String lienAction;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getTitre() { return titre; }
        public void setTitre(String titre) { this.titre = titre; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public boolean isLue() { return lue; }
        public void setLue(boolean lue) { this.lue = lue; }
        public LocalDateTime getDateCreation() { return dateCreation; }
        public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }
        public String getLienAction() { return lienAction; }
        public void setLienAction(String lienAction) { this.lienAction = lienAction; }
    }

    public static class ImplicationDashboard {
        private int activitesRejointes;
        private int inscriptionsConfirmees;
        private int projetsProposes;
        private String statut;

        public int getActivitesRejointes() { return activitesRejointes; }
        public void setActivitesRejointes(int activitesRejointes) { this.activitesRejointes = activitesRejointes; }
        public int getInscriptionsConfirmees() { return inscriptionsConfirmees; }
        public void setInscriptionsConfirmees(int inscriptionsConfirmees) { this.inscriptionsConfirmees = inscriptionsConfirmees; }
        public int getProjetsProposes() { return projetsProposes; }
        public void setProjetsProposes(int projetsProposes) { this.projetsProposes = projetsProposes; }
        public String getStatut() { return statut; }
        public void setStatut(String statut) { this.statut = statut; }
    }
}
