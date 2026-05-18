package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.Message;

import java.time.LocalDateTime;

public class MessageResponse {

    private Long id;
    private String contenu;
    private LocalDateTime dateEnvoi;
    private boolean lu;
    private Long auteurId;
    private String auteurPrenom;
    private String auteurNom;
    private Long filId;

    // ─── Constructeur depuis entité ──────────────────────────────────────────

    public static MessageResponse fromEntity(Message message) {
        MessageResponse response = new MessageResponse();
        response.id = message.getId();
        response.contenu = message.getContenu();
        response.dateEnvoi = message.getDateEnvoi();
        response.lu = message.isLu();
        response.filId = message.getFil() != null ? message.getFil().getId() : null;
        if (message.getAuteur() != null) {
            response.auteurId = message.getAuteur().getId();
            response.auteurPrenom = message.getAuteur().getPrenom();
            response.auteurNom = message.getAuteur().getNom();
        }
        return response;
    }

    // ─── Getters ─────────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public String getContenu() { return contenu; }
    public LocalDateTime getDateEnvoi() { return dateEnvoi; }
    public boolean isLu() { return lu; }
    public Long getAuteurId() { return auteurId; }
    public String getAuteurPrenom() { return auteurPrenom; }
    public String getAuteurNom() { return auteurNom; }
    public Long getFilId() { return filId; }
}