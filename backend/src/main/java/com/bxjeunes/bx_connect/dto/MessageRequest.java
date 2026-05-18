package com.bxjeunes.bx_connect.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class MessageRequest {

    @NotBlank(message = "Le contenu du message est obligatoire")
    private String contenu;

    @NotNull(message = "L'identifiant du fil est obligatoire")
    private Long filId;

    // ─── Getters & Setters ───────────────────────────────────────────────────

    public String getContenu() { return contenu; }
    public void setContenu(String contenu) { this.contenu = contenu; }

    public Long getFilId() { return filId; }
    public void setFilId(Long filId) { this.filId = filId; }
}