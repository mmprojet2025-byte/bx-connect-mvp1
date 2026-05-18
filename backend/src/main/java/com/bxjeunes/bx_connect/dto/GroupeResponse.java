package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.Groupe;

import java.time.LocalDateTime;

public class GroupeResponse {

    private Long id;
    private String nom;
    private String description;
    private String categorie;
    private boolean actif;
    private LocalDateTime dateCreation;
    private String referentPrenom;
    private String referentNom;
    private int nombreMembres;

    // ─── Factory depuis entité ────────────────────────────────────────────────

    public static GroupeResponse fromEntity(Groupe groupe) {
        GroupeResponse response = new GroupeResponse();
        response.id = groupe.getId();
        response.nom = groupe.getNom();
        response.description = groupe.getDescription();
        response.categorie = groupe.getCategorie();
        response.actif = groupe.isActif();
        response.dateCreation = groupe.getDateCreation();
        if (groupe.getReferent() != null) {
            response.referentPrenom = groupe.getReferent().getPrenom();
            response.referentNom = groupe.getReferent().getNom();
        }
        response.nombreMembres = (int) groupe.getMembres().stream()
                .filter(m -> m.getStatut().name().equals("ACCEPTE"))
                .count();
        return response;
    }

    // ─── Getters ─────────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public String getNom() { return nom; }
    public String getDescription() { return description; }
    public String getCategorie() { return categorie; }
    public boolean isActif() { return actif; }
    public LocalDateTime getDateCreation() { return dateCreation; }
    public String getReferentPrenom() { return referentPrenom; }
    public String getReferentNom() { return referentNom; }
    public int getNombreMembres() { return nombreMembres; }
}