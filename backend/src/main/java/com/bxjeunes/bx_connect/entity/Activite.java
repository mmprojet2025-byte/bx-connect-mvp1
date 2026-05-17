package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "activites")
public class Activite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private LocalDateTime dateDebut;

    @Column(nullable = false)
    private LocalDateTime dateFin;

    @Column(length = 200)
    private String lieu;

    @Column(nullable = false)
    private boolean gratuite = true;

    @Column(precision = 10, scale = 2)
    private BigDecimal prix;

    @Column(nullable = false)
    private int capaciteMax = 0; // 0 = illimité

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutActivite statut = StatutActivite.BROUILLON;

    @Column(length = 100)
    private String categorie;

    @Column(length = 100)
    private String theme;

    @Column(nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "createur_id", nullable = false)
    private User createur;

    // ─── Constructeurs ───────────────────────────────────────────────────────

    public Activite() {}

    // ─── Getters & Setters ───────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getDateDebut() { return dateDebut; }
    public void setDateDebut(LocalDateTime dateDebut) { this.dateDebut = dateDebut; }

    public LocalDateTime getDateFin() { return dateFin; }
    public void setDateFin(LocalDateTime dateFin) { this.dateFin = dateFin; }

    public String getLieu() { return lieu; }
    public void setLieu(String lieu) { this.lieu = lieu; }

    public boolean isGratuite() { return gratuite; }
    public void setGratuite(boolean gratuite) { this.gratuite = gratuite; }

    public BigDecimal getPrix() { return prix; }
    public void setPrix(BigDecimal prix) { this.prix = prix; }

    public int getCapaciteMax() { return capaciteMax; }
    public void setCapaciteMax(int capaciteMax) { this.capaciteMax = capaciteMax; }

    public StatutActivite getStatut() { return statut; }
    public void setStatut(StatutActivite statut) { this.statut = statut; }

    public String getCategorie() { return categorie; }
    public void setCategorie(String categorie) { this.categorie = categorie; }

    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }

    public User getCreateur() { return createur; }
    public void setCreateur(User createur) { this.createur = createur; }
}