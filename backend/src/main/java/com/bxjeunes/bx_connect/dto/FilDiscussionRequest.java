package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.TypeFil;
import jakarta.validation.constraints.NotBlank;

public class FilDiscussionRequest {

    @NotBlank(message = "Le titre est obligatoire")
    private String titre;

    private String description;

    private TypeFil type = TypeFil.GENERAL;

    private Long groupeId;

    private Long projetId;

    // ─── Getters & Setters ───────────────────────────────────────────────────

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public TypeFil getType() { return type; }
    public void setType(TypeFil type) { this.type = type; }

    public Long getGroupeId() { return groupeId; }
    public void setGroupeId(Long groupeId) { this.groupeId = groupeId; }

    public Long getProjetId() { return projetId; }
    public void setProjetId(Long projetId) { this.projetId = projetId; }
}