package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@ConditionalOnProperty(
        name = "app.password-reset.email-enabled",
        havingValue = "false",
        matchIfMissing = true)
public class DisabledPasswordResetEmailSender implements PasswordResetEmailSender {

    private static final Logger log = LoggerFactory.getLogger(DisabledPasswordResetEmailSender.class);

    @Override
    public void send(User user, String rawToken, LocalDateTime expiresAt) {
        log.info("Password reset email delivery is disabled; request completed without exposing reset data.");
    }
}
