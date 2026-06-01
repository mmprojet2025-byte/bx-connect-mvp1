package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Toutes les notifications d'un utilisateur (plus récentes en premier)
    List<Notification> findByDestinataireIdOrderByDateCreationDesc(Long destinataireId);

    // Notifications non lues d'un utilisateur
    List<Notification> findByDestinataireIdAndLueFalseOrderByDateCreationDesc(Long destinataireId);

    // Compter les non lues (pour le badge)
    long countByDestinataireIdAndLueFalse(Long destinataireId);

    // Une notification precise appartenant a un utilisateur
    Optional<Notification> findByIdAndDestinataireId(Long id, Long destinataireId);

    // Marquer toutes comme lues
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.lue = true WHERE n.destinataire.id = :destinataireId")
    void marquerToutesLues(@Param("destinataireId") Long destinataireId);

    // Supprimer uniquement si la notification appartient a l'utilisateur
    @Transactional
    void deleteByIdAndDestinataireId(Long id, Long destinataireId);
}
