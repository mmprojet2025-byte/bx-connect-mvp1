package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.Notification;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.event.PushNotificationEvent;
import com.bxjeunes.bx_connect.repository.NotificationRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServicePushTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApplicationEventPublisher eventPublisher;

    private NotificationService service;

    @BeforeEach
    void setUp() {
        service = new NotificationService(
                notificationRepository,
                userRepository,
                eventPublisher
        );
    }

    @Test
    void la_notification_interne_reste_la_source_avant_le_push() {
        User destinataire = new User();
        destinataire.setId(42L);
        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.creer(
                destinataire,
                "Nouvelle activité",
                "Une activité est disponible.",
                "ACTIVITE_PUBLIEE",
                "/activites/7"
        );

        verify(notificationRepository).save(any(Notification.class));
        ArgumentCaptor<PushNotificationEvent> eventCaptor =
                ArgumentCaptor.forClass(PushNotificationEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue().userId()).isEqualTo(42L);
        assertThat(eventCaptor.getValue().type()).isEqualTo("ACTIVITE_PUBLIEE");
        assertThat(eventCaptor.getValue().actionUrl()).isEqualTo("/activites/7");
    }

    @Test
    void notifications_pagees_ne_lisent_que_le_destinataire_connecte() {
        User user = new User();
        user.setId(42L);
        user.setEmail("membre@test.be");
        Notification notification = new Notification(user, "Titre", "Message", "SYSTEME");
        notification.setId(99L);

        when(userRepository.findByEmail("membre@test.be")).thenReturn(Optional.of(user));
        when(notificationRepository.findByDestinataireId(eq(42L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(notification), PageRequest.of(0, 1), 1));

        var response = service.mesNotificationsPage("membre@test.be", 0, 20);

        assertThat(response.content()).hasSize(1);
        assertThat(response.content().get(0)).containsEntry("id", 99L);
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(notificationRepository).findByDestinataireId(eq(42L), captor.capture());
        assertThat(captor.getValue().getSort().getOrderFor("dateCreation").isDescending()).isTrue();
    }
}
