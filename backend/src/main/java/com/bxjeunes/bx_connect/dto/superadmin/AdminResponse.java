package com.bxjeunes.bx_connect.dto.superadmin;

import com.bxjeunes.bx_connect.entity.User;

import java.time.LocalDateTime;

public class AdminResponse {

    private Long id;
    private String prenom;
    private String nom;
    private String email;
    private boolean actif;
    private LocalDateTime dateInscription;

    public static AdminResponse fromEntity(User user) {
        AdminResponse response = new AdminResponse();
        response.id = user.getId();
        response.prenom = user.getPrenom();
        response.nom = user.getNom();
        response.email = user.getEmail();
        response.actif = user.isActif();
        response.dateInscription = user.getDateInscription();
        return response;
    }

    public Long getId() { return id; }
    public String getPrenom() { return prenom; }
    public String getNom() { return nom; }
    public String getEmail() { return email; }
    public boolean isActif() { return actif; }
    public LocalDateTime getDateInscription() { return dateInscription; }
}
