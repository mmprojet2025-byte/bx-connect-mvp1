package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.MembreGroupe;
import com.bxjeunes.bx_connect.entity.StatutMembre;

import java.time.LocalDateTime;

public class MembreGroupeResponse {

    private Long id;
    private Long userId;
    private String prenom;
    private String nom;
    private String email;
    private StatutMembre statut;
    private LocalDateTime dateAdhesion;

    // ─── Factory depuis entité ────────────────────────────────────────────────

    public static MembreGroupeResponse fromEntity(MembreGroupe mg) {
        MembreGroupeResponse response = new MembreGroupeResponse();
        response.id = mg.getId();
        if (mg.getUser() != null) {
            response.userId = mg.getUser().getId();
            response.prenom = mg.getUser().getPrenom();
            response.nom = mg.getUser().getNom();
            response.email = mg.getUser().getEmail();
        }
        response.statut = mg.getStatut();
        response.dateAdhesion = mg.getDateAdhesion();
        return response;
    }

    // ─── Getters ─────────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getPrenom() { return prenom; }
    public String getNom() { return nom; }
    public String getEmail() { return email; }
    public StatutMembre getStatut() { return statut; }
    public LocalDateTime getDateAdhesion() { return dateAdhesion; }
}