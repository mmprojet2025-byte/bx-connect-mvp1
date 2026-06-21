package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "acteur_id")
    private Long acteurId;

    @Column(name = "acteur_email", nullable = false, length = 100)
    private String acteurEmail;

    @Column(name = "acteur_role", nullable = false, length = 30)
    private String acteurRole;

    @Column(nullable = false, length = 80)
    private String action;

    @Column(name = "cible_type", nullable = false, length = 50)
    private String cibleType;

    @Column(name = "cible_id")
    private Long cibleId;

    @Column(name = "cible_email", length = 100)
    private String cibleEmail;

    @Column(name = "cible_nom", length = 200)
    private String cibleNom;

    @Column(name = "ancien_statut", length = 80)
    private String ancienStatut;

    @Column(name = "nouveau_statut", length = 80)
    private String nouveauStatut;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;

    @Column(length = 500)
    private String details;

    @Column(name = "date_action", nullable = false, updatable = false)
    private LocalDateTime dateAction;

    @PrePersist
    protected void onCreate() {
        this.dateAction = LocalDateTime.now();
    }
}
