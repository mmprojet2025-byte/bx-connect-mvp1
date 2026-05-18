package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "membres_groupes",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "groupe_id"}))
public class MembreGroupe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "groupe_id", nullable = false)
    private Groupe groupe;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutMembre statut = StatutMembre.EN_ATTENTE;

    @Column(nullable = false)
    private LocalDateTime dateAdhesion = LocalDateTime.now();

    // ─── Constructeurs ───────────────────────────────────────────────────────

    public MembreGroupe() {}

    public MembreGroupe(User user, Groupe groupe) {
        this.user = user;
        this.groupe = groupe;
        this.statut = StatutMembre.EN_ATTENTE;
        this.dateAdhesion = LocalDateTime.now();
    }

    // ─── Getters & Setters ───────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Groupe getGroupe() { return groupe; }
    public void setGroupe(Groupe groupe) { this.groupe = groupe; }

    public StatutMembre getStatut() { return statut; }
    public void setStatut(StatutMembre statut) { this.statut = statut; }

    public LocalDateTime getDateAdhesion() { return dateAdhesion; }
    public void setDateAdhesion(LocalDateTime dateAdhesion) { this.dateAdhesion = dateAdhesion; }
}