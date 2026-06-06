package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.Langue;
import com.bxjeunes.bx_connect.entity.AuthProvider;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;

import java.time.LocalDateTime;

public class UserProfileResponse {

    private Long id;
    private String prenom;
    private String nom;
    private String email;
    private Role role;
    private Langue languePreference;
    private LocalDateTime dateInscription;
    private boolean actif;
    private boolean termsAccepted;
    private boolean privacyAccepted;
    private LocalDateTime termsAcceptedAt;
    private LocalDateTime privacyAcceptedAt;
    private String legalVersion;
    private AuthProvider authProvider;

    // ─── Constructeur depuis entité ──────────────────────────────────────────

    public static UserProfileResponse fromEntity(User user) {
        UserProfileResponse response = new UserProfileResponse();
        response.id = user.getId();
        response.prenom = user.getPrenom();
        response.nom = user.getNom();
        response.email = user.getEmail();
        response.role = user.getRole();
        response.languePreference = user.getLanguePreference();
        response.dateInscription = user.getDateInscription();
        response.actif = user.isActif();
        response.termsAccepted = user.isTermsAccepted();
        response.privacyAccepted = user.isPrivacyAccepted();
        response.termsAcceptedAt = user.getTermsAcceptedAt();
        response.privacyAcceptedAt = user.getPrivacyAcceptedAt();
        response.legalVersion = user.getLegalVersion();
        response.authProvider = user.getAuthProvider();
        return response;
    }

    // ─── Getters ─────────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public String getPrenom() { return prenom; }
    public String getNom() { return nom; }
    public String getEmail() { return email; }
    public Role getRole() { return role; }
    public Langue getLanguePreference() { return languePreference; }
    public LocalDateTime getDateInscription() { return dateInscription; }
    public boolean isActif() { return actif; }
    public boolean isTermsAccepted() { return termsAccepted; }
    public boolean isPrivacyAccepted() { return privacyAccepted; }
    public LocalDateTime getTermsAcceptedAt() { return termsAcceptedAt; }
    public LocalDateTime getPrivacyAcceptedAt() { return privacyAcceptedAt; }
    public String getLegalVersion() { return legalVersion; }
    public AuthProvider getAuthProvider() { return authProvider; }
}
