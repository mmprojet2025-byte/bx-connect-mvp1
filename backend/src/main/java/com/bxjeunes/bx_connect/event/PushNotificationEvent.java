package com.bxjeunes.bx_connect.event;

public record PushNotificationEvent(
        Long userId,
        String title,
        String body,
        String type,
        String actionUrl
) {
}
