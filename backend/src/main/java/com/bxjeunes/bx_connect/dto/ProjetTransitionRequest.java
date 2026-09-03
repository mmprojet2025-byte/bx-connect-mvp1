package com.bxjeunes.bx_connect.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProjetTransitionRequest(
        @NotBlank(message = "Le texte est obligatoire")
        @Size(max = 500, message = "Le texte ne peut pas depasser 500 caracteres")
        String texte) {
}
