package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.PartenaireProfil;

import java.util.ArrayList;
import java.util.List;

public class ReferentPartenaireResponse {

    private Long partenaireProfilId;
    private Long partenaireUserId;
    private String nomOrganisation;
    private String typePartenaire;
    private String logoUrl;
    private String siteWeb;
    private String description;
    private boolean lienDirectReferent;
    private List<PartenaireGroupeResponse> groupesLies = new ArrayList<>();
    private List<PartenaireReferentResponse> referentsLies = new ArrayList<>();

    public static ReferentPartenaireResponse fromProfil(PartenaireProfil profil) {
        ReferentPartenaireResponse response = new ReferentPartenaireResponse();
        response.partenaireProfilId = profil.getId();
        response.nomOrganisation = profil.getNomOrganisation();
        response.typePartenaire = profil.getTypePartenaire() != null ? profil.getTypePartenaire().name() : null;
        response.logoUrl = profil.getLogoUrl();
        response.siteWeb = profil.getSiteWeb();
        response.description = profil.getDescription();
        if (profil.getUtilisateur() != null) {
            response.partenaireUserId = profil.getUtilisateur().getId();
        }
        return response;
    }

    public Long getPartenaireProfilId() { return partenaireProfilId; }
    public Long getPartenaireUserId() { return partenaireUserId; }
    public String getNomOrganisation() { return nomOrganisation; }
    public String getTypePartenaire() { return typePartenaire; }
    public String getLogoUrl() { return logoUrl; }
    public String getSiteWeb() { return siteWeb; }
    public String getDescription() { return description; }
    public boolean isLienDirectReferent() { return lienDirectReferent; }
    public void setLienDirectReferent(boolean lienDirectReferent) { this.lienDirectReferent = lienDirectReferent; }
    public List<PartenaireGroupeResponse> getGroupesLies() { return groupesLies; }
    public List<PartenaireReferentResponse> getReferentsLies() { return referentsLies; }
}
