package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.ProjetRequest;
import com.bxjeunes.bx_connect.entity.Projet;
import java.net.URI;
import java.time.LocalDate;
import java.time.ZoneId;

/** Shared limits for free registration and paid Checkout. Existing projects may omit these fields. */
public final class ProjetParticipationRules {
    private ProjetParticipationRules() {}

    public static void apply(Projet project, ProjetRequest request, String uploadBaseUrl) {
        if (request.getCapacite() != null && request.getCapacite() < 1)
            throw new IllegalArgumentException("La capacité doit être supérieure à zéro.");
        if (request.getDateExecution() != null && request.getDateLimiteParticipation() != null
                && request.getDateLimiteParticipation().isAfter(request.getDateExecution()))
            throw new IllegalArgumentException("La date limite de participation doit précéder ou correspondre à la date d'exécution.");
        String image = request.getImageUrl();
        if (image != null && !image.isBlank()) {
            URI uri;
            try { uri = URI.create(image); } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Image de couverture invalide.");
            }
            if (!image.startsWith(uploadBaseUrl.replaceAll("/+$", "") + "/projets/") || image.length() > 500 || uri.getRawQuery() != null || uri.getRawFragment() != null
                    || uri.getRawUserInfo() != null
                    || (uri.isAbsolute() && !("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())))
                    || uri.getRawPath() == null || !uri.getRawPath().matches(".*/projets/[a-fA-F0-9-]{36}\\.(jpg|jpeg|png|webp)"))
                throw new IllegalArgumentException("Utilisez une image téléversée pour le projet.");
        }
        project.setCapacite(request.getCapacite());
        project.setDateExecution(request.getDateExecution());
        project.setDateLimiteParticipation(request.getDateLimiteParticipation());
        project.setImageUrl(image == null || image.isBlank() ? null : image);
    }

    public static void checkOpen(Projet project) {
        LocalDate today = LocalDate.now(ZoneId.of("Europe/Brussels"));
        if ((project.getDateLimiteParticipation() != null && today.isAfter(project.getDateLimiteParticipation()))
                || (project.getDateExecution() != null && today.isAfter(project.getDateExecution())))
            throw new IllegalArgumentException("Les participations à ce projet sont clôturées.");
    }

    public static void checkCapacity(Projet project, long occupied) {
        if (project.getCapacite() != null && occupied >= project.getCapacite())
            throw new IllegalArgumentException("Ce projet est complet.");
    }
}
