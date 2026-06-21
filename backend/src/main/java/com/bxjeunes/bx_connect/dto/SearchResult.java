package com.bxjeunes.bx_connect.dto;

import java.time.LocalDateTime;

public class SearchResult {

    private String type;
    private Long id;
    private String titre;
    private String sousTitre;
    private String url;
    private String badge;
    private LocalDateTime date;
    private double score;

    public SearchResult() {}

    public SearchResult(String type, Long id, String titre, String sousTitre,
                        String url, String badge, LocalDateTime date, double score) {
        this.type = type;
        this.id = id;
        this.titre = titre;
        this.sousTitre = sousTitre;
        this.url = url;
        this.badge = badge;
        this.date = date;
        this.score = score;
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }

    public String getSousTitre() { return sousTitre; }
    public void setSousTitre(String sousTitre) { this.sousTitre = sousTitre; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getBadge() { return badge; }
    public void setBadge(String badge) { this.badge = badge; }

    public LocalDateTime getDate() { return date; }
    public void setDate(LocalDateTime date) { this.date = date; }

    public double getScore() { return score; }
    public void setScore(double score) { this.score = score; }
}
