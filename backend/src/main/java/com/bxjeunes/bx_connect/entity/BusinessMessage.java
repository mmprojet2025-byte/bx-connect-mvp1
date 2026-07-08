package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "business_messages")
public class BusinessMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private BusinessConversation conversation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "auteur_id", nullable = false)
    private User auteur;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenu;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "system_message", nullable = false)
    private boolean systemMessage = false;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public BusinessConversation getConversation() { return conversation; }
    public void setConversation(BusinessConversation conversation) { this.conversation = conversation; }
    public User getAuteur() { return auteur; }
    public void setAuteur(User auteur) { this.auteur = auteur; }
    public String getContenu() { return contenu; }
    public void setContenu(String contenu) { this.contenu = contenu; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public boolean isSystemMessage() { return systemMessage; }
    public void setSystemMessage(boolean systemMessage) { this.systemMessage = systemMessage; }
}
