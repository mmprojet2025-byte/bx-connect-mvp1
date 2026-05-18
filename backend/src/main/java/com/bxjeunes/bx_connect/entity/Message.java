package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenu;

    @Column(nullable = false)
    private LocalDateTime dateEnvoi = LocalDateTime.now();

    @Column(nullable = false)
    private boolean lu = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auteur_id", nullable = false)
    private User auteur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fil_id", nullable = false)
    private FilDiscussion fil;

    // ─── Constructeurs ───────────────────────────────────────────────────────

    public Message() {}

    // ─── Getters & Setters ───────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getContenu() { return contenu; }
    public void setContenu(String contenu) { this.contenu = contenu; }

    public LocalDateTime getDateEnvoi() { return dateEnvoi; }
    public void setDateEnvoi(LocalDateTime dateEnvoi) { this.dateEnvoi = dateEnvoi; }

    public boolean isLu() { return lu; }
    public void setLu(boolean lu) { this.lu = lu; }

    public User getAuteur() { return auteur; }
    public void setAuteur(User auteur) { this.auteur = auteur; }

    public FilDiscussion getFil() { return fil; }
    public void setFil(FilDiscussion fil) { this.fil = fil; }
}