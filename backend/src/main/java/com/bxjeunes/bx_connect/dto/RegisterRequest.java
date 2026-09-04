package com.bxjeunes.bx_connect.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

/**
 * DTO inscription publique.
 * SECURITE : Le champ role a ete supprime.
 * AuthService force toujours Role.MEMBRE.
 */
@Data
public class RegisterRequest {

    @NotBlank(message = "Le prenom est obligatoire")
    @Size(max = 50)
    private String prenom;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 50)
    private String nom;

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "Format email invalide")
    private String email;

    @NotNull(message = "La date de naissance est obligatoire")
    @PastOrPresent(message = "La date de naissance ne peut pas etre dans le futur")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateNaissance;

    @NotBlank(message = "Le mot de passe est obligatoire")
    @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caracteres")
    private String motDePasse;

    @AssertTrue(message = "Les conditions d'utilisation doivent etre acceptees")
    private boolean termsAccepted;

    @AssertTrue(message = "La politique de confidentialite doit etre acceptee")
    private boolean privacyAccepted;

    @NotBlank(message = "La version legale est obligatoire")
    @Size(max = 40)
    private String legalVersion;

    // SUPPRIME : private Role role;
    // Le role n'est plus accepte depuis le client.
    // AuthService force toujours Role.MEMBRE.
}
