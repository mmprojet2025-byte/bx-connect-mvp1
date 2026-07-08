package com.bxjeunes.bx_connect.dto.business;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SendBusinessMessageRequest {

    @NotBlank(message = "Le contenu du message est obligatoire.")
    @Size(max = 2000, message = "Le message est trop long.")
    private String contenu;

    public String getContenu() { return contenu; }
    public void setContenu(String contenu) { this.contenu = contenu; }
}
