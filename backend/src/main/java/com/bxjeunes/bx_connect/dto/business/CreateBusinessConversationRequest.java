package com.bxjeunes.bx_connect.dto.business;

import com.bxjeunes.bx_connect.entity.BusinessConversationContextType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CreateBusinessConversationRequest {

    @NotNull(message = "Le destinataire est obligatoire.")
    private Long destinataireId;

    @Size(max = 180, message = "Le titre est trop long.")
    private String titre;

    private BusinessConversationContextType contexteType = BusinessConversationContextType.AUCUN;

    private Long contexteId;

    @Size(max = 2000, message = "Le message initial est trop long.")
    private String messageInitial;

    public Long getDestinataireId() { return destinataireId; }
    public void setDestinataireId(Long destinataireId) { this.destinataireId = destinataireId; }
    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }
    public BusinessConversationContextType getContexteType() { return contexteType; }
    public void setContexteType(BusinessConversationContextType contexteType) { this.contexteType = contexteType; }
    public Long getContexteId() { return contexteId; }
    public void setContexteId(Long contexteId) { this.contexteId = contexteId; }
    public String getMessageInitial() { return messageInitial; }
    public void setMessageInitial(String messageInitial) { this.messageInitial = messageInitial; }
}
