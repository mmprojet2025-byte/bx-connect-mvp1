package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.PagedResponse;
import com.bxjeunes.bx_connect.entity.Notification;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.event.PushNotificationEvent;
import com.bxjeunes.bx_connect.repository.NotificationRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.util.PaginationUtils;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    public NotificationService(NotificationRepository notificationRepository,
                                UserRepository userRepository,
                                ApplicationEventPublisher eventPublisher) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    // ─── Créer une notification ───────────────────────────────────────────────
    public void creer(User destinataire, String titre, String message, String type) {
        creer(destinataire, titre, message, type, null);
    }

    public void creer(User destinataire, String titre, String message, String type, String lienAction) {
        if (destinataire != null && destinataire.getRole() == Role.SUPER_ADMIN) {
            return;
        }
        Notification notif = new Notification(destinataire, titre, message, type);
        notif.setLienAction(lienAction);
        notificationRepository.save(notif);
        eventPublisher.publishEvent(new PushNotificationEvent(
                destinataire.getId(),
                titre,
                message,
                type,
                lienAction
        ));
    }

    // ─── Mes notifications ────────────────────────────────────────────────────
    public List<Map<String, Object>> mesNotifications(String email) {
        User user = requireNotificationUser(email);

        return notificationRepository
                .findByDestinataireIdOrderByDateCreationDesc(user.getId())
                .stream()
                .map(this::toMap)
                .collect(Collectors.toList());
    }

    public PagedResponse<Map<String, Object>> mesNotificationsPage(String email, int page, int size) {
        User user = requireNotificationUser(email);

        return PagedResponse.fromPage(notificationRepository
                .findByDestinataireId(
                        user.getId(),
                        PaginationUtils.pageRequest(page, size, Sort.by(Sort.Direction.DESC, "dateCreation"))
                )
                .map(this::toMap));
    }

    // ─── Compter les non lues (badge) ─────────────────────────────────────────
    public long compterNonLues(String email) {
        User user = requireNotificationUser(email);
        return notificationRepository.countByDestinataireIdAndLueFalse(user.getId());
    }

    // ─── Marquer une notification comme lue ──────────────────────────────────
    public void marquerLue(Long notifId, String email) {
        User user = requireNotificationUser(email);
        Notification notif = notificationRepository.findByIdAndDestinataireId(notifId, user.getId())
                .orElseThrow(() -> new RuntimeException("Notification introuvable"));
        notif.setLue(true);
        notificationRepository.save(notif);
    }

    // ─── Marquer toutes comme lues ────────────────────────────────────────────
    public void marquerToutesLues(String email) {
        User user = requireNotificationUser(email);
        notificationRepository.marquerToutesLues(user.getId());
    }

    // ─── Supprimer une notification ───────────────────────────────────────────
    public void supprimer(Long notifId, String email) {
        User user = requireNotificationUser(email);
        notificationRepository.findByIdAndDestinataireId(notifId, user.getId())
                .orElseThrow(() -> new RuntimeException("Notification introuvable"));
        notificationRepository.deleteByIdAndDestinataireId(notifId, user.getId());
    }

    private User requireNotificationUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        if (user.getRole() == Role.SUPER_ADMIN) {
            throw new AccessDeniedException("Le SUPER_ADMIN ne peut pas utiliser les notifications.");
        }
        return user;
    }

    // ─── Convertir en Map ─────────────────────────────────────────────────────
    private Map<String, Object> toMap(Notification n) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",           n.getId());
        m.put("titre",        n.getTitre());
        m.put("message",      n.getMessage());
        m.put("type",         n.getType());
        m.put("lue",          n.isLue());
        m.put("dateCreation", n.getDateCreation());
        m.put("lienAction",   n.getLienAction());
        return m;
    }
}
