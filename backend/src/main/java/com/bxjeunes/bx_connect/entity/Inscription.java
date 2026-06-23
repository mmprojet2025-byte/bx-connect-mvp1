package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "inscriptions",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"membre_id", "activite_id"})
    }
)
public class Inscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "membre_id", nullable = false)
    private User membre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activite_id", nullable = false)
    private Activite activite;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutInscription statut = StatutInscription.CONFIRMEE;

    @Column(nullable = false)
    private LocalDateTime dateInscription = LocalDateTime.now();

    @Column
    private LocalDateTime dateAnnulation;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_presence", nullable = false, columnDefinition = "varchar(30) default 'NON_RENSEIGNEE'")
    private StatutPresence statutPresence = StatutPresence.NON_RENSEIGNEE;

    @Column
    private LocalDateTime datePresence;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "presence_encodee_par_id")
    private User presenceEncodeePar;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "presence_validee_par_id")
    private User presenceValideePar;

    @Column
    private LocalDateTime dateValidationPresence;

    @Column(columnDefinition = "TEXT")
    private String commentairePresence;

    // ─── Constructeurs ───────────────────────────────────────────────────────

    public Inscription() {}

    // ─── Getters & Setters ───────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getMembre() { return membre; }
    public void setMembre(User membre) { this.membre = membre; }

    public Activite getActivite() { return activite; }
    public void setActivite(Activite activite) { this.activite = activite; }

    public StatutInscription getStatut() { return statut; }
    public void setStatut(StatutInscription statut) { this.statut = statut; }

    public LocalDateTime getDateInscription() { return dateInscription; }
    public void setDateInscription(LocalDateTime dateInscription) { this.dateInscription = dateInscription; }

    public LocalDateTime getDateAnnulation() { return dateAnnulation; }
    public void setDateAnnulation(LocalDateTime dateAnnulation) { this.dateAnnulation = dateAnnulation; }

    public StatutPresence getStatutPresence() {
        return statutPresence == null ? StatutPresence.NON_RENSEIGNEE : statutPresence;
    }
    public void setStatutPresence(StatutPresence statutPresence) {
        this.statutPresence = statutPresence == null ? StatutPresence.NON_RENSEIGNEE : statutPresence;
    }

    public LocalDateTime getDatePresence() { return datePresence; }
    public void setDatePresence(LocalDateTime datePresence) { this.datePresence = datePresence; }

    public User getPresenceEncodeePar() { return presenceEncodeePar; }
    public void setPresenceEncodeePar(User presenceEncodeePar) { this.presenceEncodeePar = presenceEncodeePar; }

    public User getPresenceValideePar() { return presenceValideePar; }
    public void setPresenceValideePar(User presenceValideePar) { this.presenceValideePar = presenceValideePar; }

    public LocalDateTime getDateValidationPresence() { return dateValidationPresence; }
    public void setDateValidationPresence(LocalDateTime dateValidationPresence) {
        this.dateValidationPresence = dateValidationPresence;
    }

    public String getCommentairePresence() { return commentairePresence; }
    public void setCommentairePresence(String commentairePresence) { this.commentairePresence = commentairePresence; }
}
