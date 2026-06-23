package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.StatutPresence;
import jakarta.validation.constraints.NotNull;

public class PresenceRequest {

    @NotNull
    private StatutPresence statutPresence;

    private String commentairePresence;

    public StatutPresence getStatutPresence() {
        return statutPresence;
    }

    public void setStatutPresence(StatutPresence statutPresence) {
        this.statutPresence = statutPresence;
    }

    public String getCommentairePresence() {
        return commentairePresence;
    }

    public void setCommentairePresence(String commentairePresence) {
        this.commentairePresence = commentairePresence;
    }
}
