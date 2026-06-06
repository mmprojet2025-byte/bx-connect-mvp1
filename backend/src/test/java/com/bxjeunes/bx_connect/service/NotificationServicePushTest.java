package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.Notification;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.event.PushNotificationEvent;
import com.bxjeunes.bx_connect.repository.NotificationRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServicePushTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApplicationEventPublisher eventPublisher;

    @Test
    void la_notification_interne_reste_la_source_avant_le_push() {
        User destinataire = new User();
        destinataire.setId(42L);
        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        NotificationService service = new NotificationService(
                notificationRepository,
                userRepository,
                eventPublisher
        );

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
}
