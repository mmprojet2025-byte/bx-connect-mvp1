package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "prestations_benevoles")
public class PrestationBenevole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 50)
    private String type; // ANIMATION, LOGISTIQUE, COMMUNICATION, FORMATION, AUTRE

    @Column(nullable = false)
    private LocalDate datePrestation;

    @Column(nullable = false)
    private double dureeHeures; // Nombre d'heures

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutPrestation statut = StatutPrestation.EN_ATTENTE;

    @Column(columnDefinition = "TEXT")
    private String commentaireReferent; // Commentaire lors de la validation/refus

    @Column(nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    private LocalDateTime dateValidation;

    // ─── Relations ────────────────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "membre_id", nullable = false)
    private User membre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "groupe_id", nullable = false)
    private Groupe groupe;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referent_id")
    private User referent; // Référent qui a validé/refusé

    // ─── Constructeurs ────────────────────────────────────────────────────────
    public PrestationBenevole() {}

    // ─── Getters & Setters ────────────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public LocalDate getDatePrestation() { return datePrestation; }
    public void setDatePrestation(LocalDate datePrestation) { this.datePrestation = datePrestation; }

    public double getDureeHeures() { return dureeHeures; }
    public void setDureeHeures(double dureeHeures) { this.dureeHeures = dureeHeures; }

    public StatutPrestation getStatut() { return statut; }
    public void setStatut(StatutPrestation statut) { this.statut = statut; }

    public String getCommentaireReferent() { return commentaireReferent; }
    public void setCommentaireReferent(String c) { this.commentaireReferent = c; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime d) { this.dateCreation = d; }

    public LocalDateTime getDateValidation() { return dateValidation; }
    public void setDateValidation(LocalDateTime d) { this.dateValidation = d; }

    public User getMembre() { return membre; }
    public void setMembre(User membre) { this.membre = membre; }

    public Groupe getGroupe() { return groupe; }
    public void setGroupe(Groupe groupe) { this.groupe = groupe; }

    public User getReferent() { return referent; }
    public void setReferent(User referent) { this.referent = referent; }
}