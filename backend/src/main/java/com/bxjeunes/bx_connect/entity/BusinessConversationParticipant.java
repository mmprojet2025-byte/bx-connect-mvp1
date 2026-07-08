package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "business_conversation_participants",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_business_conversation_participant",
                columnNames = {"conversation_id", "user_id"}
        )
)
public class BusinessConversationParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private BusinessConversation conversation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_snapshot", nullable = false, length = 30)
    private Role roleSnapshot;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    @Column(name = "last_read_at")
    private LocalDateTime lastReadAt;

    @Column(nullable = false)
    private boolean archived = false;

    @PrePersist
    protected void onCreate() {
        joinedAt = LocalDateTime.now();
        if (roleSnapshot == null && user != null) {
            roleSnapshot = user.getRole();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public BusinessConversation getConversation() { return conversation; }
    public void setConversation(BusinessConversation conversation) { this.conversation = conversation; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Role getRoleSnapshot() { return roleSnapshot; }
    public void setRoleSnapshot(Role roleSnapshot) { this.roleSnapshot = roleSnapshot; }
    public LocalDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(LocalDateTime joinedAt) { this.joinedAt = joinedAt; }
    public LocalDateTime getLastReadAt() { return lastReadAt; }
    public void setLastReadAt(LocalDateTime lastReadAt) { this.lastReadAt = lastReadAt; }
    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }
}
