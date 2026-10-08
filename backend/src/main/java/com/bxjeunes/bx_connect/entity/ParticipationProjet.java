package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "participations_projets",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "projet_id"}))
public class ParticipationProjet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projet_id", nullable = false)
    private Projet projet;

    @Column(nullable = false)
    private LocalDateTime dateParticipation = LocalDateTime.now();

    // Null means active; the row and original joining date are retained after withdrawal.
    private LocalDateTime dateRetrait;

    @Column(length = 200)
    private String roleProjet; // ex: "Développeur", "Designer", "Coordinateur"

    // ─── Constructeurs ───────────────────────────────────────────────────────

    public ParticipationProjet() {}

    public ParticipationProjet(User user, Projet projet) {
        this.user = user;
        this.projet = projet;
        this.dateParticipation = LocalDateTime.now();
    }

    // ─── Getters & Setters ───────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Projet getProjet() { return projet; }
    public void setProjet(Projet projet) { this.projet = projet; }

    public LocalDateTime getDateParticipation() { return dateParticipation; }
    public void setDateParticipation(LocalDateTime dateParticipation) { this.dateParticipation = dateParticipation; }

    public LocalDateTime getDateRetrait() { return dateRetrait; }
    public void setDateRetrait(LocalDateTime dateRetrait) { this.dateRetrait = dateRetrait; }

    @Transient
    public boolean isActive() { return dateRetrait == null; }

    public String getRoleProjet() { return roleProjet; }
    public void setRoleProjet(String roleProjet) { this.roleProjet = roleProjet; }
}