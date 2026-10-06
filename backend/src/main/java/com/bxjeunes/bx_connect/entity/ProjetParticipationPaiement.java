package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** A project participation payment, separate from donations and activity payments.
 * Receipt fields are snapshots: later profile/project edits must not rewrite a paid receipt.
 */
@Entity
@Table(name="paiements_participations_projets")
public class ProjetParticipationPaiement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name="projet_id", nullable=false)
    private Projet projet;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name="membre_id", nullable=false)
    private User membre;
    @Column(nullable=false, precision=10, scale=2)
    private BigDecimal montant;
    @Column(nullable=false, length=3)
    private String devise;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20, columnDefinition="varchar(20)")
    private StatutPaiement statut;
    @Column(nullable=false, unique=true, length=36)
    private String requestKey;
    @Column(unique=true, length=200)
    private String stripeSessionId;
    @Column(unique=true, length=200)
    private String stripePaymentIntentId;
    @Column(length=500)
    private String checkoutUrl;
    @Column(nullable=false)
    private Long expiresAt;
    @Column(nullable=false)
    private LocalDateTime dateCreation;

    private LocalDateTime datePaiement;
    @Column(unique=true, length=50)
    private String numeroRecu;
    @Column(nullable=false, length=150)
    private String titreProjet;
    @Column(nullable=false, length=150)
    private String nomParticipant;
    public Long getId() { return id; }
    public void setId(Long value) { id = value; }
    public Projet getProjet() { return projet; }
    public void setProjet(Projet value) { projet = value; }
    public User getMembre() { return membre; }
    public void setMembre(User value) { membre = value; }
    public BigDecimal getMontant() { return montant; }
    public void setMontant(BigDecimal value) { montant = value; }
    public String getDevise() { return devise; }
    public void setDevise(String value) { devise = value; }
    public StatutPaiement getStatut() { return statut; }
    public void setStatut(StatutPaiement value) { statut = value; }
    public String getRequestKey() { return requestKey; }
    public void setRequestKey(String value) { requestKey = value; }
    public String getStripeSessionId() { return stripeSessionId; }
    public void setStripeSessionId(String value) { stripeSessionId = value; }
    public String getStripePaymentIntentId() { return stripePaymentIntentId; }
    public void setStripePaymentIntentId(String value) { stripePaymentIntentId = value; }
    public String getCheckoutUrl() { return checkoutUrl; }
    public void setCheckoutUrl(String value) { checkoutUrl = value; }
    public Long getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Long value) { expiresAt = value; }
    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime value) { dateCreation = value; }
    public LocalDateTime getDatePaiement() { return datePaiement; }
    public void setDatePaiement(LocalDateTime value) { datePaiement = value; }
    public String getNumeroRecu() { return numeroRecu; }
    public void setNumeroRecu(String value) { numeroRecu = value; }
    public String getTitreProjet() { return titreProjet; }
    public void setTitreProjet(String value) { titreProjet = value; }
    public String getNomParticipant() { return nomParticipant; }
    public void setNomParticipant(String value) { nomParticipant = value; }
}
