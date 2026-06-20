package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.StatutGroupe;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class GroupeResponse {

    private Long id;
    private String nom;
    private String description;
    private String categorie;
    private String theme;
    private String objectif;
    private String adresseReunion;
    private String commune;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private int capaciteMax;
    private StatutGroupe statut;
    private String motifRefus;
    private boolean actif;
    private LocalDateTime dateCreation;
    private LocalDateTime dateValidation;
    private String referentPrenom;
    private String referentNom;
    private Long referentId;
    private int nombreMembres;

    // ─── Factory depuis entité ────────────────────────────────────────────────
    public static GroupeResponse fromEntity(Groupe groupe) {
        GroupeResponse r = new GroupeResponse();
        r.id            = groupe.getId();
        r.nom           = groupe.getNom();
        r.description   = groupe.getDescription();
        r.categorie     = groupe.getCategorie();
        r.theme         = groupe.getTheme();
        r.objectif      = groupe.getObjectif();
        r.adresseReunion = groupe.getAdresseReunion();
        r.commune       = groupe.getCommune();
        r.latitude      = groupe.getLatitude();
        r.longitude     = groupe.getLongitude();
        r.capaciteMax   = groupe.getCapaciteMax();
        r.statut        = groupe.getStatut();
        r.motifRefus    = groupe.getMotifRefus();
        r.actif         = groupe.isActif();
        r.dateCreation  = groupe.getDateCreation();
        r.dateValidation = groupe.getDateValidation();

        if (groupe.getReferent() != null) {
            r.referentId     = groupe.getReferent().getId();
            r.referentPrenom = groupe.getReferent().getPrenom();
            r.referentNom    = groupe.getReferent().getNom();
        }
        r.nombreMembres = (int) groupe.getMembres().stream()
                .filter(m -> m.getStatut().name().equals("ACCEPTE"))
                .count();
        return r;
    }

    // ─── Getters ──────────────────────────────────────────────────────────────
    public Long getId()                    { return id; }
    public String getNom()                 { return nom; }
    public String getDescription()         { return description; }
    public String getCategorie()           { return categorie; }
    public String getTheme()               { return theme; }
    public String getObjectif()            { return objectif; }
    public String getAdresseReunion()      { return adresseReunion; }
    public String getCommune()             { return commune; }
    public BigDecimal getLatitude()        { return latitude; }
    public BigDecimal getLongitude()       { return longitude; }
    public int getCapaciteMax()            { return capaciteMax; }
    public StatutGroupe getStatut()        { return statut; }
    public String getMotifRefus()          { return motifRefus; }
    public boolean isActif()               { return actif; }
    public LocalDateTime getDateCreation() { return dateCreation; }
    public LocalDateTime getDateValidation() { return dateValidation; }
    public Long getReferentId()            { return referentId; }
    public String getReferentPrenom()      { return referentPrenom; }
    public String getReferentNom()         { return referentNom; }
    public int getNombreMembres()          { return nombreMembres; }
}
