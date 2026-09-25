package com.bxjeunes.bx_connect.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.regex.Pattern;

@Component
public class ProfilePhotoUrlValidator {

    private final URI uploadBaseUri;
    private final String profilePhotoPathPrefix;
    private final Pattern profilePhotoPathPattern;

    public ProfilePhotoUrlValidator(@Value("${upload.base-url:http://localhost:8080/uploads}") String uploadBaseUrl) {
        try {
            this.uploadBaseUri = new URI(stripTrailingSlashes(uploadBaseUrl)).normalize();
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException("upload.base-url doit être une URL valide", exception);
        }
        this.profilePhotoPathPrefix = normalizePath(uploadBaseUri.getPath()) + "/avatars/";
        this.profilePhotoPathPattern = Pattern.compile(
                Pattern.quote(profilePhotoPathPrefix)
                        + "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
                        + "[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\.(jpg|png|webp)"
        );
    }

    public String validateAndNormalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            URI candidate = new URI(value.trim());
            URI normalized = candidate.normalize();
            boolean safeProtocol = "http".equalsIgnoreCase(normalized.getScheme())
                    || "https".equalsIgnoreCase(normalized.getScheme());
            boolean sameOrigin = safeProtocol
                    && equalsIgnoreCase(uploadBaseUri.getScheme(), normalized.getScheme())
                    && equalsIgnoreCase(uploadBaseUri.getHost(), normalized.getHost())
                    && effectivePort(uploadBaseUri) == effectivePort(normalized);
            boolean safePath = normalized.getPath() != null
                    && profilePhotoPathPattern.matcher(normalized.getPath()).matches();

            if (!candidate.equals(normalized)
                    || !sameOrigin
                    || !safePath
                    || normalized.getUserInfo() != null
                    || normalized.getQuery() != null
                    || normalized.getFragment() != null) {
                throw invalidPhotoUrl();
            }
            return normalized.toString();
        } catch (URISyntaxException exception) {
            throw invalidPhotoUrl();
        }
    }

    private static int effectivePort(URI uri) {
        if (uri.getPort() >= 0) return uri.getPort();
        return "https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80;
    }

    private static String normalizePath(String path) {
        if (path == null || path.isBlank() || "/".equals(path)) return "";
        return stripTrailingSlashes(path);
    }

    private static String stripTrailingSlashes(String value) {
        return value.replaceAll("/+$", "");
    }

    private static boolean equalsIgnoreCase(String left, String right) {
        return left != null && right != null && left.equalsIgnoreCase(right);
    }

    private static IllegalArgumentException invalidPhotoUrl() {
        return new IllegalArgumentException("La photo de profil doit provenir du service d'upload autorisé.");
    }
}
