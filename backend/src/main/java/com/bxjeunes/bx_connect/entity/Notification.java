package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String titre;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false, length = 50)
    private String type;
    // Types : VALIDATION_GROUPE, REFUS_GROUPE, VALIDATION_PROJET, REFUS_PROJET,
    //         PAIEMENT, ANNONCE, ADHESION_ACCEPTEE, ADHESION_REFUSEE,
    //         PRESTATION_VALIDEE, PRESTATION_REFUSEE, SYSTEME

    @Column(nullable = false)
    private boolean lue = false;

    @Column(nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    @Column(length = 200)
    private String lienAction; // URL ou identifiant de l'objet concerné

    // ─── Relation ─────────────────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destinataire_id", nullable = false)
    private User destinataire;

    // ─── Constructeurs ────────────────────────────────────────────────────────
    public Notification() {}

    public Notification(User destinataire, String titre, String message, String type) {
        this.destinataire = destinataire;
        this.titre        = titre;
        this.message      = message;
        this.type         = type;
    }

    // ─── Getters & Setters ────────────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public boolean isLue() { return lue; }
    public void setLue(boolean lue) { this.lue = lue; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime d) { this.dateCreation = d; }

    public String getLienAction() { return lienAction; }
    public void setLienAction(String lienAction) { this.lienAction = lienAction; }

    public User getDestinataire() { return destinataire; }
    public void setDestinataire(User destinataire) { this.destinataire = destinataire; }
}