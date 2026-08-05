package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "utilisateurs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String prenom;

    @Column(nullable = false, length = 50)
    private String nom;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String motDePasse;

    @Column(name = "credentials_version", nullable = false)
    @Builder.Default
    private int credentialsVersion = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "langue_preference", nullable = false)
    @Builder.Default
    private Langue languePreference = Langue.FR;

    @Column(name = "date_inscription", nullable = false, updatable = false)
    private LocalDateTime dateInscription;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;

    @Column(name = "terms_accepted", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean termsAccepted = false;

    @Column(name = "privacy_accepted", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean privacyAccepted = false;

    @Column(name = "terms_accepted_at")
    private LocalDateTime termsAcceptedAt;

    @Column(name = "privacy_accepted_at")
    private LocalDateTime privacyAcceptedAt;

    @Column(name = "legal_version", length = 40)
    private String legalVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider", length = 20)
    @Builder.Default
    private AuthProvider authProvider = AuthProvider.LOCAL;

    @PrePersist
    protected void onCreate() {
        this.dateInscription = LocalDateTime.now();
        if (this.languePreference == null) {
            this.languePreference = Langue.FR;
        }
        if (this.authProvider == null) {
            this.authProvider = AuthProvider.LOCAL;
        }
    }

    // ── UserDetails ───────────────────────────────────────
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override public String getPassword()              { return motDePasse; }
    @Override public String getUsername()              { return email; }
    @Override public boolean isAccountNonExpired()     { return true; }
    @Override public boolean isAccountNonLocked()      { return actif; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled()               { return actif; }
}
