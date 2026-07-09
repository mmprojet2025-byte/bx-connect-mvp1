package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.BusinessMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessMessageRepository extends JpaRepository<BusinessMessage, Long> {

    List<BusinessMessage> findByConversationIdOrderByCreatedAtAsc(Long conversationId);

    Page<BusinessMessage> findByConversationId(Long conversationId, Pageable pageable);

    Optional<BusinessMessage> findFirstByConversationIdOrderByCreatedAtDesc(Long conversationId);

    @Query("""
            SELECT COUNT(m)
            FROM BusinessMessage m
            WHERE m.conversation.id = :conversationId
              AND m.auteur.id <> :userId
              AND (:lastReadAt IS NULL OR m.createdAt > :lastReadAt)
            """)
    long countUnreadForParticipant(
            @Param("conversationId") Long conversationId,
            @Param("userId") Long userId,
            @Param("lastReadAt") LocalDateTime lastReadAt
    );
}
