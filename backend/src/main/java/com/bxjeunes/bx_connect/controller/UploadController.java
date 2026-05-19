package com.bxjeunes.bx_connect.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    @Value("${upload.dir:uploads}")
    private String uploadDir;

    @Value("${upload.base-url:http://localhost:8080/uploads}")
    private String baseUrl;

    // Extensions autorisées
    private static final java.util.Set<String> ALLOWED_TYPES = java.util.Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    // Taille max : 5 Mo
    private static final long MAX_SIZE = 5 * 1024 * 1024;

    /**
     * Upload d'une image (avatar, couverture activité, couverture projet)
     * Paramètre : type = "avatar" | "activite" | "projet"
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "type", defaultValue = "general") String type) {

        // Validation type MIME
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Type de fichier non autorisé. Utilisez JPEG, PNG, WEBP ou GIF."
            ));
        }

        // Validation taille
        if (file.getSize() > MAX_SIZE) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Fichier trop volumineux. Maximum 5 Mo."
            ));
        }

        try {
            // Créer le sous-dossier selon le type
            String subFolder = switch (type) {
                case "avatar"   -> "avatars";
                case "activite" -> "activites";
                case "projet"   -> "projets";
                default         -> "general";
            };

            Path targetDir = Paths.get(uploadDir, subFolder);
            Files.createDirectories(targetDir);

            // Générer un nom unique
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String newFilename = UUID.randomUUID().toString() + extension;

            // Sauvegarder le fichier
            Path targetPath = targetDir.resolve(newFilename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            // Retourner l'URL publique
            String imageUrl = baseUrl + "/" + subFolder + "/" + newFilename;

            Map<String, String> response = new HashMap<>();
            response.put("url", imageUrl);
            response.put("filename", newFilename);
            response.put("type", type);

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Erreur lors de l'upload : " + e.getMessage()
            ));
        }
    }
}