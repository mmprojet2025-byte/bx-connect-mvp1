package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.TypePartenaire;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class PartenaireProfilRequest {

    @NotBlank(message = "Le nom de l'organisation est obligatoire")
    @Size(max = 150, message = "Le nom de l'organisation ne peut pas dépasser 150 caractères")
    private String nomOrganisation;

    @NotNull(message = "Le type de partenaire est obligatoire")
    private TypePartenaire typePartenaire;

    @Size(max = 500)
    private String logoUrl;

    @Size(max = 120)
    private String personneContact;

    @Email(message = "L'email de contact est invalide")
    @Size(max = 150)
    private String emailContact;

    @Size(max = 40)
    private String telephone;

    @Size(max = 300)
    private String siteWeb;

    @Size(max = 500)
    private String description;

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
}
