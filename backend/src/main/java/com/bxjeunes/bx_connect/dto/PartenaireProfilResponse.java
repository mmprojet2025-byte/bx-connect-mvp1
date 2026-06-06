package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.PartenaireProfil;
import com.bxjeunes.bx_connect.entity.TypePartenaire;

public class PartenaireProfilResponse {
    private Long id;
    private String nomOrganisation;
    private TypePartenaire typePartenaire;
    private String logoUrl;
    private String personneContact;
    private String emailContact;
    private String telephone;
    private String siteWeb;
    private String description;
    private String compteEmail;

    public static PartenaireProfilResponse fromEntity(PartenaireProfil profil) {
        PartenaireProfilResponse response = new PartenaireProfilResponse();
        response.id = profil.getId();
        response.nomOrganisation = profil.getNomOrganisation();
        response.typePartenaire = profil.getTypePartenaire();
        response.logoUrl = profil.getLogoUrl();
        response.personneContact = profil.getPersonneContact();
        response.emailContact = profil.getEmailContact();
        response.telephone = profil.getTelephone();
        response.siteWeb = profil.getSiteWeb();
        response.description = profil.getDescription();
        response.compteEmail = profil.getUtilisateur().getEmail();
        return response;
    }

    public Long getId() { return id; }
    public String getNomOrganisation() { return nomOrganisation; }
    public TypePartenaire getTypePartenaire() { return typePartenaire; }
    public String getLogoUrl() { return logoUrl; }
    public String getPersonneContact() { return personneContact; }
    public String getEmailContact() { return emailContact; }
    public String getTelephone() { return telephone; }
    public String getSiteWeb() { return siteWeb; }
    public String getDescription() { return description; }
    public String getCompteEmail() { return compteEmail; }
}
