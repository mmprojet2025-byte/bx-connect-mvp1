package com.bxjeunes.bx_connect.dto.business;

import com.bxjeunes.bx_connect.entity.BusinessConversation;
import com.bxjeunes.bx_connect.entity.BusinessConversationContextType;
import com.bxjeunes.bx_connect.entity.BusinessConversationParticipant;
import com.bxjeunes.bx_connect.entity.BusinessConversationStatus;
import com.bxjeunes.bx_connect.entity.BusinessConversationType;
import com.bxjeunes.bx_connect.entity.Role;

import java.time.LocalDateTime;
import java.util.List;

public class BusinessConversationResponse {

    private Long id;
    private String titre;
    private BusinessConversationType type;
    private BusinessConversationStatus status;
    private BusinessConversationContextType contexteType;
    private Long contexteId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastMessageAt;
    private String lastMessagePreview;
    private long unreadCount;
    private List<ParticipantResponse> participants;

    public static BusinessConversationResponse fromEntity(
            BusinessConversation conversation,
            List<BusinessConversationParticipant> participants,
            String lastMessagePreview,
            long unreadCount
    ) {
        BusinessConversationResponse response = new BusinessConversationResponse();
        response.id = conversation.getId();
        response.titre = conversation.getTitre();
        response.type = conversation.getType();
        response.status = conversation.getStatus();
        response.contexteType = conversation.getContexteType();
        response.contexteId = conversation.getContexteId();
        response.createdAt = conversation.getCreatedAt();
        response.updatedAt = conversation.getUpdatedAt();
        response.lastMessageAt = conversation.getLastMessageAt();
        response.lastMessagePreview = lastMessagePreview;
        response.unreadCount = unreadCount;
        response.participants = participants.stream()
                .map(ParticipantResponse::fromEntity)
                .toList();
        return response;
    }

    public Long getId() { return id; }
    public String getTitre() { return titre; }
    public BusinessConversationType getType() { return type; }
    public BusinessConversationStatus getStatus() { return status; }
    public BusinessConversationContextType getContexteType() { return contexteType; }
    public Long getContexteId() { return contexteId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getLastMessageAt() { return lastMessageAt; }
    public String getLastMessagePreview() { return lastMessagePreview; }
    public long getUnreadCount() { return unreadCount; }
    public List<ParticipantResponse> getParticipants() { return participants; }

    public static class ParticipantResponse {
        private Long userId;
        private String prenom;
        private String nom;
        private String email;
        private Role role;
        private LocalDateTime lastReadAt;
        private boolean archived;

        static ParticipantResponse fromEntity(BusinessConversationParticipant participant) {
            ParticipantResponse response = new ParticipantResponse();
            if (participant.getUser() != null) {
                response.userId = participant.getUser().getId();
                response.prenom = participant.getUser().getPrenom();
                response.nom = participant.getUser().getNom();
                response.email = participant.getUser().getEmail();
                response.role = participant.getRoleSnapshot();
            }
            response.lastReadAt = participant.getLastReadAt();
            response.archived = participant.isArchived();
            return response;
        }

        public Long getUserId() { return userId; }
        public String getPrenom() { return prenom; }
        public String getNom() { return nom; }
        public String getEmail() { return email; }
        public Role getRole() { return role; }
        public LocalDateTime getLastReadAt() { return lastReadAt; }
        public boolean isArchived() { return archived; }
    }
}
