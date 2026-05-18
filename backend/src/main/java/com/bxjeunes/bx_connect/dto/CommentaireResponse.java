package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.CommentaireProjet;

import java.time.LocalDateTime;

public class CommentaireResponse {

    private Long id;
    private String contenu;
    private LocalDateTime dateCommentaire;
    private String auteurPrenom;
    private String auteurNom;

    // ─── Factory depuis entité ────────────────────────────────────────────────

    public static CommentaireResponse fromEntity(CommentaireProjet c) {
        CommentaireResponse r = new CommentaireResponse();
        r.id = c.getId();
        r.contenu = c.getContenu();
        r.dateCommentaire = c.getDateCommentaire();
        if (c.getAuteur() != null) {
            r.auteurPrenom = c.getAuteur().getPrenom();
            r.auteurNom = c.getAuteur().getNom();
        }
        return r;
    }

    // ─── Getters ─────────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public String getContenu() { return contenu; }
    public LocalDateTime getDateCommentaire() { return dateCommentaire; }
    public String getAuteurPrenom() { return auteurPrenom; }
    public String getAuteurNom() { return auteurNom; }
}