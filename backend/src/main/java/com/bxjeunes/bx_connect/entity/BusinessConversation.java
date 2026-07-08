package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "business_conversations")
public class BusinessConversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 180)
    private String titre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private BusinessConversationType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private BusinessConversationStatus status = BusinessConversationStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "contexte_type", nullable = false, length = 30)
    private BusinessConversationContextType contexteType = BusinessConversationContextType.AUCUN;

    @Column(name = "contexte_id")
    private Long contexteId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BusinessConversationParticipant> participants = new ArrayList<>();

    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<BusinessMessage> messages = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }
    public BusinessConversationType getType() { return type; }
    public void setType(BusinessConversationType type) { this.type = type; }
    public BusinessConversationStatus getStatus() { return status; }
    public void setStatus(BusinessConversationStatus status) { this.status = status; }
    public BusinessConversationContextType getContexteType() { return contexteType; }
    public void setContexteType(BusinessConversationContextType contexteType) { this.contexteType = contexteType; }
    public Long getContexteId() { return contexteId; }
    public void setContexteId(Long contexteId) { this.contexteId = contexteId; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public LocalDateTime getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(LocalDateTime lastMessageAt) { this.lastMessageAt = lastMessageAt; }
    public List<BusinessConversationParticipant> getParticipants() { return participants; }
    public void setParticipants(List<BusinessConversationParticipant> participants) { this.participants = participants; }
    public List<BusinessMessage> getMessages() { return messages; }
    public void setMessages(List<BusinessMessage> messages) { this.messages = messages; }
}
