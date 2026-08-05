package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.User;

import java.time.LocalDateTime;

public interface PasswordResetEmailSender {

    void send(User user, String rawToken, LocalDateTime expiresAt);
}
