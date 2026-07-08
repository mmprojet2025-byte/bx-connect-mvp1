package com.bxjeunes.bx_connect.dto.business;

import com.bxjeunes.bx_connect.entity.BusinessMessage;
import com.bxjeunes.bx_connect.entity.Role;

import java.time.LocalDateTime;

public class BusinessMessageResponse {

    private Long id;
    private Long conversationId;
    private String contenu;
    private LocalDateTime createdAt;
    private boolean systemMessage;
    private Long auteurId;
    private String auteurPrenom;
    private String auteurNom;
    private Role auteurRole;

    public static BusinessMessageResponse fromEntity(BusinessMessage message) {
        BusinessMessageResponse response = new BusinessMessageResponse();
        response.id = message.getId();
        response.conversationId = message.getConversation() != null ? message.getConversation().getId() : null;
        response.contenu = message.getContenu();
        response.createdAt = message.getCreatedAt();
        response.systemMessage = message.isSystemMessage();
        if (message.getAuteur() != null) {
            response.auteurId = message.getAuteur().getId();
            response.auteurPrenom = message.getAuteur().getPrenom();
            response.auteurNom = message.getAuteur().getNom();
            response.auteurRole = message.getAuteur().getRole();
        }
        return response;
    }

    public Long getId() { return id; }
    public Long getConversationId() { return conversationId; }
    public String getContenu() { return contenu; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public boolean isSystemMessage() { return systemMessage; }
    public Long getAuteurId() { return auteurId; }
    public String getAuteurPrenom() { return auteurPrenom; }
    public String getAuteurNom() { return auteurNom; }
    public Role getAuteurRole() { return auteurRole; }
}
