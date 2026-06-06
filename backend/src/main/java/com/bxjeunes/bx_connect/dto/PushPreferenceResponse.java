package com.bxjeunes.bx_connect.dto;

public record PushPreferenceResponse(
        boolean enabled,
        long registeredDevices,
        long enabledDevices
) {
}
