package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.entity.Notification;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.event.PushNotificationEvent;
import com.bxjeunes.bx_connect.repository.NotificationRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceSecurityTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApplicationEventPublisher eventPublisher;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(
                notificationRepository,
                userRepository,
                eventPublisher);
    }

    @Test
    @DisplayName("Toutes les lectures et mutations SUPER_ADMIN sont refusees avant le repository notification")
    void toutes_les_operations_super_admin_sont_refusees_avant_le_repository() {
        User superAdmin = user(Role.SUPER_ADMIN);
        when(userRepository.findByEmail(superAdmin.getEmail())).thenReturn(Optional.of(superAdmin));

        assertDenied(() -> notificationService.mesNotifications(superAdmin.getEmail()));
        assertDenied(() -> notificationService.mesNotificationsPage(superAdmin.getEmail(), 0, 20));
        assertDenied(() -> notificationService.compterNonLues(superAdmin.getEmail()));
        assertDenied(() -> notificationService.marquerLue(42L, superAdmin.getEmail()));
        assertDenied(() -> notificationService.marquerToutesLues(superAdmin.getEmail()));
        assertDenied(() -> notificationService.supprimer(42L, superAdmin.getEmail()));

        verify(userRepository, times(6)).findByEmail(superAdmin.getEmail());
        verifyNoMoreInteractions(userRepository);
        verifyNoInteractions(notificationRepository, eventPublisher);
    }

    @Test
    @DisplayName("Une creation pour SUPER_ADMIN est ignoree sans sauvegarde push ni exception")
    void creation_super_admin_est_ignoree_sans_sauvegarde_push_ni_exception() {
        User superAdmin = user(Role.SUPER_ADMIN);

        assertThatCode(() -> notificationService.creer(
                superAdmin,
                "Action metier",
                "Une action metier a eu lieu.",
                "METIER",
                "/projets/42"))
                .doesNotThrowAnyException();

        verifyNoInteractions(notificationRepository, userRepository, eventPublisher);
    }

    @ParameterizedTest
    @EnumSource(value = Role.class, names = {"ADMIN", "REFERENT", "PARTENAIRE", "MEMBRE"})
    @DisplayName("Les autres roles conservent la creation de notifications")
    void autres_roles_conservent_creation(Role role) {
        User destinataire = user(role);

        notificationService.creer(destinataire, "Titre", "Message", "SYSTEME");

        verify(notificationRepository).save(any(Notification.class));
        verify(eventPublisher).publishEvent(any(PushNotificationEvent.class));
    }

    private void assertDenied(Runnable operation) {
        assertThatThrownBy(operation::run)
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("SUPER_ADMIN");
    }

    private User user(Role role) {
        User user = new User();
        user.setId(1L);
        user.setEmail(role.name().toLowerCase() + "@test.be");
        user.setRole(role);
        return user;
    }
}
