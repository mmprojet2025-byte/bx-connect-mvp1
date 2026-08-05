package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;

@Component
@ConditionalOnProperty(name = "app.password-reset.email-enabled", havingValue = "true")
public class SmtpPasswordResetEmailSender implements PasswordResetEmailSender {

    private final JavaMailSender mailSender;
    private final String frontendResetUrl;
    private final String fromAddress;

    public SmtpPasswordResetEmailSender(
            JavaMailSender mailSender,
            @Value("${app.password-reset.frontend-url}") String frontendResetUrl,
            @Value("${app.password-reset.from-address}") String fromAddress) {
        this.mailSender = mailSender;
        this.frontendResetUrl = frontendResetUrl;
        this.fromAddress = fromAddress;
    }

    @Override
    public void send(User user, String rawToken, LocalDateTime expiresAt) {
        String resetLink = UriComponentsBuilder.fromUriString(frontendResetUrl)
                .queryParam("token", rawToken)
                .build()
                .encode()
                .toUriString();

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(user.getEmail());
        message.setSubject("BX-Connect - Reinitialisation de votre mot de passe");
        message.setText("Une reinitialisation de votre mot de passe BX-Connect a ete demandee.\n\n"
                + "Utilisez ce lien avant " + expiresAt + " :\n" + resetLink + "\n\n"
                + "Si vous n'etes pas a l'origine de cette demande, ignorez cet e-mail.");
        mailSender.send(message);
    }
}
