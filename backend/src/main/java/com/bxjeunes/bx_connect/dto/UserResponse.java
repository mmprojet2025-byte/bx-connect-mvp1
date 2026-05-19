package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.Langue;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;

import java.time.LocalDateTime;

public class UserResponse {

    private Long id;
    private String prenom;
    private String nom;
    private String email;
    private Role role;
    private Langue languePreference;
    private LocalDateTime dateInscription;
    private boolean actif;

    // ─── Constructeur depuis entité ──────────────────────────────────────────

    public static UserResponse fromEntity(User user) {
        UserResponse response = new UserResponse();
        response.id               = user.getId();
        response.prenom           = user.getPrenom();
        response.nom              = user.getNom();
        response.email            = user.getEmail();
        response.role             = user.getRole();
        response.languePreference = user.getLanguePreference();
        response.dateInscription  = user.getDateInscription();
        response.actif            = user.isActif();
        return response;
    }

    // ─── Getters ─────────────────────────────────────────────────────────────

    public Long getId()                        { return id; }
    public String getPrenom()                  { return prenom; }
    public String getNom()                     { return nom; }
    public String getEmail()                   { return email; }
    public Role getRole()                      { return role; }
    public Langue getLanguePreference()        { return languePreference; }
    public LocalDateTime getDateInscription()  { return dateInscription; }
    public boolean isActif()                   { return actif; }
}