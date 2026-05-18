package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.FilDiscussion;
import com.bxjeunes.bx_connect.entity.TypeFil;

import java.time.LocalDateTime;

public class FilDiscussionResponse {

    private Long id;
    private String titre;
    private String description;
    private TypeFil type;
    private LocalDateTime dateCreation;
    private boolean actif;
    private String createurPrenom;
    private String createurNom;
    private Long groupeId;
    private String groupeNom;
    private Long projetId;
    private String projetTitre;
    private int nombreMessages;
    private long messagesNonLus;

    public static FilDiscussionResponse fromEntity(FilDiscussion fil) {
        FilDiscussionResponse r = new FilDiscussionResponse();
        r.id = fil.getId();
        r.titre = fil.getTitre();
        r.description = fil.getDescription();
        r.type = fil.getType();
        r.dateCreation = fil.getDateCreation();
        r.actif = fil.isActif();
        if (fil.getCreateur() != null) {
            r.createurPrenom = fil.getCreateur().getPrenom();
            r.createurNom = fil.getCreateur().getNom();
        }
        if (fil.getGroupe() != null) {
            r.groupeId = fil.getGroupe().getId();
            r.groupeNom = fil.getGroupe().getNom();
        }
        if (fil.getProjet() != null) {
            r.projetId = fil.getProjet().getId();
            r.projetTitre = fil.getProjet().getTitre();
        }
        r.nombreMessages = fil.getMessages() != null ? fil.getMessages().size() : 0;
        return r;
    }

    // ─── Getters & Setters ───────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public TypeFil getType() { return type; }
    public void setType(TypeFil type) { this.type = type; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }

    public boolean isActif() { return actif; }
    public void setActif(boolean actif) { this.actif = actif; }

    public String getCreateurPrenom() { return createurPrenom; }
    public void setCreateurPrenom(String createurPrenom) { this.createurPrenom = createurPrenom; }

    public String getCreateurNom() { return createurNom; }
    public void setCreateurNom(String createurNom) { this.createurNom = createurNom; }

    public Long getGroupeId() { return groupeId; }
    public void setGroupeId(Long groupeId) { this.groupeId = groupeId; }

    public String getGroupeNom() { return groupeNom; }
    public void setGroupeNom(String groupeNom) { this.groupeNom = groupeNom; }

    public Long getProjetId() { return projetId; }
    public void setProjetId(Long projetId) { this.projetId = projetId; }

    public String getProjetTitre() { return projetTitre; }
    public void setProjetTitre(String projetTitre) { this.projetTitre = projetTitre; }

    public int getNombreMessages() { return nombreMessages; }
    public void setNombreMessages(int nombreMessages) { this.nombreMessages = nombreMessages; }

    public long getMessagesNonLus() { return messagesNonLus; }
    public void setMessagesNonLus(long messagesNonLus) { this.messagesNonLus = messagesNonLus; }
}