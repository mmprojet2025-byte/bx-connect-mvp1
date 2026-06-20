package com.bxjeunes.bx_connect.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AnnonceRequest {

    @NotBlank(message = "Le titre est obligatoire")
    @Size(max = 200, message = "Le titre ne peut pas dépasser 200 caractères")
    private String titre;

    @NotBlank(message = "Le contenu est obligatoire")
    private String contenu;

    private String type;
    private Long groupeId;
    private Boolean epinglee;

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }
    public String getContenu() { return contenu; }
    public void setContenu(String contenu) { this.contenu = contenu; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Long getGroupeId() { return groupeId; }
    public void setGroupeId(Long groupeId) { this.groupeId = groupeId; }
    public Boolean getEpinglee() { return epinglee; }
    public void setEpinglee(Boolean epinglee) { this.epinglee = epinglee; }
}
