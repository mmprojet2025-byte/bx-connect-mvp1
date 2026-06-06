package com.bxjeunes.bx_connect.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PushDeviceRequest {

    @NotBlank(message = "Le token Expo est obligatoire")
    @Size(max = 255)
    @Pattern(
            regexp = "^(ExponentPushToken|ExpoPushToken)\\[[^\\]]+\\]$",
            message = "Le token Expo est invalide"
    )
    private String expoPushToken;

    @NotBlank(message = "La plateforme est obligatoire")
    @Pattern(
            regexp = "^(ios|android)$",
            flags = Pattern.Flag.CASE_INSENSITIVE,
            message = "La plateforme doit etre ios ou android"
    )
    private String platform;

    @Size(max = 255)
    private String deviceId;

    private boolean enabled = true;
}
