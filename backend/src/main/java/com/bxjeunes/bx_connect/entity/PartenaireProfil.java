package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "partenaire_profils")
public class PartenaireProfil {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "utilisateur_id", nullable = false, unique = true)
    private User utilisateur;

    @Column(name = "nom_organisation", nullable = false, length = 150)
    private String nomOrganisation;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_partenaire", nullable = false, length = 30)
    private TypePartenaire typePartenaire = TypePartenaire.AUTRE;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "personne_contact", length = 120)
    private String personneContact;

    @Column(name = "email_contact", length = 150)
    private String emailContact;

    @Column(length = 40)
    private String telephone;

    @Column(name = "site_web", length = 300)
    private String siteWeb;

    @Column(length = 500)
    private String description;

    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @PrePersist
    protected void onCreate() {
        dateCreation = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUtilisateur() { return utilisateur; }
    public void setUtilisateur(User utilisateur) { this.utilisateur = utilisateur; }
    public String getNomOrganisation() { return nomOrganisation; }
    public void setNomOrganisation(String nomOrganisation) { this.nomOrganisation = nomOrganisation; }
    public TypePartenaire getTypePartenaire() { return typePartenaire; }
    public void setTypePartenaire(TypePartenaire typePartenaire) { this.typePartenaire = typePartenaire; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
    public String getPersonneContact() { return personneContact; }
    public void setPersonneContact(String personneContact) { this.personneContact = personneContact; }
    public String getEmailContact() { return emailContact; }
    public void setEmailContact(String emailContact) { this.emailContact = emailContact; }
    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }
    public String getSiteWeb() { return siteWeb; }
    public void setSiteWeb(String siteWeb) { this.siteWeb = siteWeb; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDateTime getDateCreation() { return dateCreation; }
}
