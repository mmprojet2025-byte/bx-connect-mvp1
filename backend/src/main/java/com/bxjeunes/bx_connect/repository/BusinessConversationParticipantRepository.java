package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.BusinessConversationParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessConversationParticipantRepository extends JpaRepository<BusinessConversationParticipant, Long> {

    Optional<BusinessConversationParticipant> findByConversationIdAndUserId(Long conversationId, Long userId);

    List<BusinessConversationParticipant> findByConversationIdOrderByIdAsc(Long conversationId);

    List<BusinessConversationParticipant> findByUserId(Long userId);
}
