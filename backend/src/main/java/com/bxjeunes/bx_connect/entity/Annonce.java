package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "annonces")
public class Annonce {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String titre;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenu;

    @Column(nullable = false, length = 20)
    private String type; // GLOBALE, GROUPE, SYSTEME

    @Enumerated(EnumType.STRING)
    @Column(name = "categorie_opportunite", length = 30)
    private CategorieOpportunite categorieOpportunite;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_moderation", nullable = false, length = 30)
    private StatutModeration statutModeration = StatutModeration.PUBLIEE;

    @Column(name = "lien_externe", length = 500)
    private String lienExterne;

    @Column(name = "description_courte", length = 300)
    private String descriptionCourte;

    @Column(name = "nombre_places")
    private Integer nombrePlaces;

    @Column(name = "date_limite")
    private LocalDateTime dateLimite;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode_candidature", length = 30)
    private ModeCandidature modeCandidature;

    @Enumerated(EnumType.STRING)
    @Column(name = "public_cible", length = 30)
    private PublicCibleOpportunite publicCible;

    @Column(name = "mise_en_avant")
    private Boolean miseEnAvant = false;

    @Column(nullable = false)
    private boolean epinglee = false;

    @Column(nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    private LocalDateTime dateExpiration; // Optionnel

    // ─── Relations ────────────────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auteur_id", nullable = false)
    private User auteur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "groupe_id")
    private Groupe groupe; // null si annonce globale

    // ─── Constructeurs ────────────────────────────────────────────────────────
    public Annonce() {}

    // ─── Getters & Setters ────────────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }

    public String getContenu() { return contenu; }
    public void setContenu(String contenu) { this.contenu = contenu; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public CategorieOpportunite getCategorieOpportunite() { return categorieOpportunite; }
    public void setCategorieOpportunite(CategorieOpportunite categorieOpportunite) { this.categorieOpportunite = categorieOpportunite; }

    public StatutModeration getStatutModeration() { return statutModeration; }
    public void setStatutModeration(StatutModeration statutModeration) { this.statutModeration = statutModeration; }

    public String getLienExterne() { return lienExterne; }
    public void setLienExterne(String lienExterne) { this.lienExterne = lienExterne; }

    public String getDescriptionCourte() { return descriptionCourte; }
    public void setDescriptionCourte(String descriptionCourte) { this.descriptionCourte = descriptionCourte; }

    public Integer getNombrePlaces() { return nombrePlaces; }
    public void setNombrePlaces(Integer nombrePlaces) { this.nombrePlaces = nombrePlaces; }

    public LocalDateTime getDateLimite() { return dateLimite; }
    public void setDateLimite(LocalDateTime dateLimite) { this.dateLimite = dateLimite; }

    public ModeCandidature getModeCandidature() { return modeCandidature; }
    public void setModeCandidature(ModeCandidature modeCandidature) { this.modeCandidature = modeCandidature; }

    public PublicCibleOpportunite getPublicCible() { return publicCible; }
    public void setPublicCible(PublicCibleOpportunite publicCible) { this.publicCible = publicCible; }

    public boolean isMiseEnAvant() { return Boolean.TRUE.equals(miseEnAvant); }
    public void setMiseEnAvant(boolean miseEnAvant) { this.miseEnAvant = miseEnAvant; }

    public boolean isEpinglee() { return epinglee; }
    public void setEpinglee(boolean epinglee) { this.epinglee = epinglee; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime d) { this.dateCreation = d; }

    public LocalDateTime getDateExpiration() { return dateExpiration; }
    public void setDateExpiration(LocalDateTime d) { this.dateExpiration = d; }

    public User getAuteur() { return auteur; }
    public void setAuteur(User auteur) { this.auteur = auteur; }

    public Groupe getGroupe() { return groupe; }
    public void setGroupe(Groupe groupe) { this.groupe = groupe; }
}
