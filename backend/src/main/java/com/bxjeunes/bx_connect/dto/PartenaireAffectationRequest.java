package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.StatutAffectationPartenaire;
import com.bxjeunes.bx_connect.entity.TypeLienPartenaire;

import java.time.LocalDateTime;

public class PartenaireAffectationRequest {

    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private String commentaire;
    private StatutAffectationPartenaire statut;
    private TypeLienPartenaire typeLien;

    public LocalDateTime getDateDebut() { return dateDebut; }
    public void setDateDebut(LocalDateTime dateDebut) { this.dateDebut = dateDebut; }
    public LocalDateTime getDateFin() { return dateFin; }
    public void setDateFin(LocalDateTime dateFin) { this.dateFin = dateFin; }
    public String getCommentaire() { return commentaire; }
    public void setCommentaire(String commentaire) { this.commentaire = commentaire; }
    public StatutAffectationPartenaire getStatut() { return statut; }
    public void setStatut(StatutAffectationPartenaire statut) { this.statut = statut; }
    public TypeLienPartenaire getTypeLien() { return typeLien; }
    public void setTypeLien(TypeLienPartenaire typeLien) { this.typeLien = typeLien; }
}
