package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.Notification;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.NotificationRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository,
                                UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository         = userRepository;
    }

    // ─── Créer une notification ───────────────────────────────────────────────
    public void creer(User destinataire, String titre, String message, String type) {
        Notification notif = new Notification(destinataire, titre, message, type);
        notificationRepository.save(notif);
    }

    public void creer(User destinataire, String titre, String message, String type, String lienAction) {
        Notification notif = new Notification(destinataire, titre, message, type);
        notif.setLienAction(lienAction);
        notificationRepository.save(notif);
    }

    // ─── Mes notifications ────────────────────────────────────────────────────
    public List<Map<String, Object>> mesNotifications(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        return notificationRepository
                .findByDestinataireIdOrderByDateCreationDesc(user.getId())
                .stream()
                .map(this::toMap)
                .collect(Collectors.toList());
    }

    // ─── Compter les non lues (badge) ─────────────────────────────────────────
    public long compterNonLues(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return notificationRepository.countByDestinataireIdAndLueFalse(user.getId());
    }

    // ─── Marquer une notification comme lue ──────────────────────────────────
    public void marquerLue(Long notifId, String email) {
        Notification notif = notificationRepository.findById(notifId)
                .orElseThrow(() -> new RuntimeException("Notification introuvable"));
        notif.setLue(true);
        notificationRepository.save(notif);
    }

    // ─── Marquer toutes comme lues ────────────────────────────────────────────
    public void marquerToutesLues(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        notificationRepository.marquerToutesLues(user.getId());
    }

    // ─── Supprimer une notification ───────────────────────────────────────────
    public void supprimer(Long notifId) {
        notificationRepository.deleteById(notifId);
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