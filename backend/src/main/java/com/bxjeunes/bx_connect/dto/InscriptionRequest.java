package com.bxjeunes.bx_connect.dto;

import jakarta.validation.constraints.NotNull;

public class InscriptionRequest {

    @NotNull(message = "L'identifiant de l'activité est obligatoire")
    private Long activiteId;

    // ─── Getters & Setters ───────────────────────────────────────────────────

    public Long getActiviteId() { return activiteId; }
    public void setActiviteId(Long activiteId) { this.activiteId = activiteId; }
}