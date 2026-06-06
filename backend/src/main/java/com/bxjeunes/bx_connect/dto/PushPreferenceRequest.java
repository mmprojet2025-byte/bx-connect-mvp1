package com.bxjeunes.bx_connect.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PushPreferenceRequest {

    @NotNull(message = "La preference push est obligatoire")
    private Boolean enabled;
}
