package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.exception.ActivityRuleException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@Service
public class ActivityImageService {
    @Value("${upload.dir:uploads}") private String directory;
    @Value("${upload.base-url:http://localhost:8080/uploads}") private String baseUrl;

    public static String ownerDirectory() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities().stream().noneMatch(a ->
                a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_REFERENT")))
            throw new org.springframework.security.access.AccessDeniedException("Image réservée aux organisateurs.");
        try {
            return "activites/" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(auth.getName().getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    public void validate(String key) {
        if (!key.matches("activites/[a-f0-9]{64}/[a-f0-9-]{36}\\.(jpg|png|webp)")
                || !key.startsWith(ownerDirectory() + "/")
                || !Files.isRegularFile(Path.of(directory).resolve(key), LinkOption.NOFOLLOW_LINKS))
            throw new ActivityRuleException("Image invalide. Veuillez choisir une image à nouveau.");
    }

    public String url(String key) {
        return key == null || !key.matches("activites/[a-f0-9]{64}/[a-f0-9-]{36}\\.(jpg|png|webp)")
                ? null : baseUrl.replaceAll("/$", "") + "/" + key;
    }
}
