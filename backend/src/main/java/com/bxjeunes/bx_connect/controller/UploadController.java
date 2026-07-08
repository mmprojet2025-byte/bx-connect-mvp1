package com.bxjeunes.bx_connect.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.*;
import java.util.Arrays;
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

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Image invalide."
            ));
        }

        // Validation taille
        if (file.getSize() > MAX_SIZE) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Fichier trop volumineux. Maximum 5 Mo."
            ));
        }

        try {
            byte[] bytes = file.getBytes();
            ImageType imageType = detectImageType(bytes);
            if (imageType == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Format d'image non autorise. Utilisez JPG, PNG ou WEBP."
                ));
            }

            // Créer le sous-dossier selon le type
            String subFolder = switch (type) {
                case "avatar"   -> "avatars";
                case "activite" -> "activites";
                case "projet"   -> "projets";
                default         -> "general";
            };

            Path targetDir = Paths.get(uploadDir, subFolder);
            Files.createDirectories(targetDir);

            String newFilename = UUID.randomUUID() + imageType.extension();

            // Sauvegarder le fichier
            Path targetPath = targetDir.resolve(newFilename);
            Files.write(targetPath, bytes, StandardOpenOption.CREATE_NEW);

            // Retourner l'URL publique
            String imageUrl = baseUrl + "/" + subFolder + "/" + newFilename;

            Map<String, String> response = new HashMap<>();
            response.put("url", imageUrl);
            response.put("filename", newFilename);
            response.put("type", type);

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Erreur lors de l'upload."
            ));
        }
    }

    private ImageType detectImageType(byte[] bytes) {
        if (bytes.length >= 3
                && (bytes[0] & 0xFF) == 0xFF
                && (bytes[1] & 0xFF) == 0xD8
                && (bytes[2] & 0xFF) == 0xFF
                && isDecodableImage(bytes)) {
            return ImageType.JPEG;
        }

        byte[] pngSignature = new byte[] {
                (byte) 0x89, 0x50, 0x4E, 0x47,
                0x0D, 0x0A, 0x1A, 0x0A
        };
        if (bytes.length >= pngSignature.length
                && Arrays.equals(Arrays.copyOf(bytes, pngSignature.length), pngSignature)
                && isDecodableImage(bytes)) {
            return ImageType.PNG;
        }

        if (bytes.length >= 16
                && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P'
                && bytes[12] == 'V' && bytes[13] == 'P' && bytes[14] == '8'
                && (bytes[15] == ' ' || bytes[15] == 'L' || bytes[15] == 'X')) {
            return ImageType.WEBP;
        }

        return null;
    }

    private boolean isDecodableImage(byte[] bytes) {
        try {
            return ImageIO.read(new ByteArrayInputStream(bytes)) != null;
        } catch (IOException e) {
            return false;
        }
    }

    private enum ImageType {
        JPEG(".jpg"),
        PNG(".png"),
        WEBP(".webp");

        private final String extension;

        ImageType(String extension) {
            this.extension = extension;
        }

        public String extension() {
            return extension;
        }
    }
}
