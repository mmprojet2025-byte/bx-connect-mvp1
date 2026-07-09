package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    // Tous les messages d'un fil, triés par date
    List<Message> findByFilIdOrderByDateEnvoiAsc(Long filId);

    Page<Message> findByFilId(Long filId, Pageable pageable);

    // Nombre de messages non lus pour un fil
    long countByFilIdAndLuFalse(Long filId);

    // Messages d'un auteur
    List<Message> findByAuteurIdOrderByDateEnvoiDesc(Long auteurId);
}
