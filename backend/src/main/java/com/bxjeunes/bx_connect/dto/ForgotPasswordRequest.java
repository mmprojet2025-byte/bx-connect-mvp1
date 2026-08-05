package com.bxjeunes.bx_connect.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public class ForgotPasswordRequest {

    @NotBlank(message = "L'adresse e-mail est obligatoire")
    @Email(message = "Format e-mail invalide")
    @Size(max = 100, message = "L'adresse e-mail est trop longue")
    private String email;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
