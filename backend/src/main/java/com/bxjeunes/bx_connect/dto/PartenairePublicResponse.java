package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.PartenaireProfil;
import com.bxjeunes.bx_connect.entity.TypePartenaire;

public class PartenairePublicResponse {
    private final Long id;
    private final String nomOrganisation;
    private final TypePartenaire typePartenaire;
    private final String logoUrl;
    private final String description;
    private final String siteWeb;

    public PartenairePublicResponse(
            Long id,
            String nomOrganisation,
            TypePartenaire typePartenaire,
            String logoUrl,
            String description,
            String siteWeb) {
        this.id = id;
        this.nomOrganisation = nomOrganisation;
        this.typePartenaire = typePartenaire;
        this.logoUrl = logoUrl;
        this.description = description;
        this.siteWeb = siteWeb;
    }

    public static PartenairePublicResponse fromEntity(PartenaireProfil profil) {
        return new PartenairePublicResponse(
                profil.getId(),
                profil.getNomOrganisation(),
                profil.getTypePartenaire(),
                profil.getLogoUrl(),
                profil.getDescription(),
                profil.getSiteWeb());
    }

    public Long getId() { return id; }
    public String getNomOrganisation() { return nomOrganisation; }
    public TypePartenaire getTypePartenaire() { return typePartenaire; }
    public String getLogoUrl() { return logoUrl; }
    public String getDescription() { return description; }
    public String getSiteWeb() { return siteWeb; }
}
