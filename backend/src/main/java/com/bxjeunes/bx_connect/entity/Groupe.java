package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "groupes")
public class Groupe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String categorie;

    // ─── Nouveaux champs logique métier ──────────────────────────────────────
    @Column(length = 100)
    private String theme;           // Thème du groupe (Numérique, Culture, Sport...)

    @Column(columnDefinition = "TEXT")
    private String objectif;        // Objectif du groupe

    @Column(length = 255)
    private String adresseReunion;

    @Column(length = 100)
    private String commune;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(nullable = false)
    private int capaciteMax = 0;    // 0 = illimité

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutGroupe statut = StatutGroupe.EN_ATTENTE; // Validation admin obligatoire

    @Column(columnDefinition = "TEXT")
    private String motifRefus;      // Motif si refusé par l'admin

    private LocalDateTime dateValidation;  // Date de validation par l'admin

    // ─── Champ legacy (compatibilité) ────────────────────────────────────────
    @Column(nullable = false)
    private boolean actif = true;

    @Column(nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    // ─── Relations ────────────────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referent_id", nullable = false)
    private User referent;

    @OneToMany(mappedBy = "groupe", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MembreGroupe> membres = new ArrayList<>();

    // ─── Constructeurs ────────────────────────────────────────────────────────
    public Groupe() {}

    // ─── Getters & Setters ────────────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategorie() { return categorie; }
    public void setCategorie(String categorie) { this.categorie = categorie; }

    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }

    public String getObjectif() { return objectif; }
    public void setObjectif(String objectif) { this.objectif = objectif; }

    public String getAdresseReunion() { return adresseReunion; }
    public void setAdresseReunion(String adresseReunion) { this.adresseReunion = adresseReunion; }

    public String getCommune() { return commune; }
    public void setCommune(String commune) { this.commune = commune; }

    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }

    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }

    public int getCapaciteMax() { return capaciteMax; }
    public void setCapaciteMax(int capaciteMax) { this.capaciteMax = capaciteMax; }

    public StatutGroupe getStatut() { return statut; }
    public void setStatut(StatutGroupe statut) { this.statut = statut; }

    public String getMotifRefus() { return motifRefus; }
    public void setMotifRefus(String motifRefus) { this.motifRefus = motifRefus; }

    public LocalDateTime getDateValidation() { return dateValidation; }
    public void setDateValidation(LocalDateTime dateValidation) { this.dateValidation = dateValidation; }

    public boolean isActif() { return actif; }
    public void setActif(boolean actif) { this.actif = actif; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }

    public User getReferent() { return referent; }
    public void setReferent(User referent) { this.referent = referent; }

    public List<MembreGroupe> getMembres() { return membres; }
    public void setMembres(List<MembreGroupe> membres) { this.membres = membres; }
}
