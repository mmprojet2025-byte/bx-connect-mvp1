package com.bxjeunes.bx_connect.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;

@Service
public class ProfilePhotoFileService {

    private static final Pattern AVATAR_FILENAME = Pattern.compile(
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\.(jpg|png|webp)");

    private final Path avatarsDirectory;
    private final URI uploadBaseUri;

    public ProfilePhotoFileService(
            @Value("${upload.dir:uploads}") String uploadDir,
            @Value("${upload.base-url:http://localhost:8080/uploads}") String uploadBaseUrl) {
        Path configuredDirectory = Path.of(uploadDir);
        if (!configuredDirectory.isAbsolute()) {
            configuredDirectory = Path.of(System.getProperty("user.dir")).resolve(configuredDirectory);
        }
        this.avatarsDirectory = configuredDirectory.normalize().resolve("avatars").normalize();
        this.uploadBaseUri = URI.create(uploadBaseUrl.replaceAll("/+$", "")).normalize();
    }

    /** Deletes only a generated avatar URL owned by the configured upload service. */
    public boolean deleteOwnedProfilePhoto(String photoUrl) {
        if (photoUrl == null || photoUrl.isBlank()) return false;
        try {
            URI candidate = URI.create(photoUrl).normalize();
            if (!candidate.toString().equals(photoUrl)
                    || !sameOrigin(candidate, uploadBaseUri)
                    || candidate.getQuery() != null
                    || candidate.getFragment() != null) return false;

            String prefix = uploadBaseUri.getPath() + "/avatars/";
            String path = candidate.getPath();
            if (path == null || !path.startsWith(prefix)) return false;
            String filename = path.substring(prefix.length());
            if (!AVATAR_FILENAME.matcher(filename).matches()) return false;

            Path target = avatarsDirectory.resolve(filename).normalize();
            if (!target.startsWith(avatarsDirectory)) return false;
            return Files.deleteIfExists(target);
        } catch (IllegalArgumentException | IOException exception) {
            return false;
        }
    }

    private static boolean sameOrigin(URI left, URI right) {
        return equalsIgnoreCase(left.getScheme(), right.getScheme())
                && equalsIgnoreCase(left.getHost(), right.getHost())
                && effectivePort(left) == effectivePort(right)
                && left.getUserInfo() == null;
    }

    private static int effectivePort(URI uri) {
        if (uri.getPort() >= 0) return uri.getPort();
        return "https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80;
    }

    private static boolean equalsIgnoreCase(String left, String right) {
        return left != null && right != null && left.equalsIgnoreCase(right);
    }
}
