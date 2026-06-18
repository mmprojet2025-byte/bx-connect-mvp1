package com.bxjeunes.bx_connect.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "soutiens_financiers")
public class SoutienFinancier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal montant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutPaiement statutPaiement = StatutPaiement.EN_ATTENTE;

    // ─── Fournisseur de paiement ──────────────────────────────────────────────
    @Column(length = 20)
    private String fournisseur = "PAYPAL"; // 'PAYPAL', 'STRIPE', 'DECLARATION'

    // ─── Champs PayPal ────────────────────────────────────────────────────────
    @Column(length = 100)
    private String transactionId;

    @Column(length = 500)
    private String approvalUrl;

    @Column(length = 100)
    private String paypalPaymentId;

    @Column(length = 100)
    private String paypalPayerId;

    // ─── Champs Stripe ────────────────────────────────────────────────────────
    @Column(length = 200)
    private String stripeSessionId;        // Checkout Session ID

    @Column(length = 200)
    private String stripePaymentIntentId;  // Payment Intent ID (après paiement)

    @Column(length = 500)
    private String checkoutUrl;            // URL Stripe Checkout

    // ─── Champs soutien partenaire (déclaration) ──────────────────────────────
    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(columnDefinition = "TEXT")
    private String reponseAdmin;

    @Column(length = 50)
    private String typeSource; // 'PAYPAL', 'STRIPE', 'DECLARATION'

    @Column(nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    private LocalDateTime datePaiement;

    private LocalDateTime dateReponseAdmin;

    // ─── Relations ────────────────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "donateur_id", nullable = false)
    private User donateur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activite_id")
    private Activite activite;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projet_id")
    private Projet projet;

    // ─── Alias partenaire ─────────────────────────────────────────────────────
    public User getPartenaire() { return donateur; }
    public void setPartenaire(User partenaire) { this.donateur = partenaire; }

    // ─── Constructeurs ────────────────────────────────────────────────────────
    public SoutienFinancier() {}

    // ─── Getters & Setters ────────────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public BigDecimal getMontant() { return montant; }
    public void setMontant(BigDecimal montant) { this.montant = montant; }

    public StatutPaiement getStatutPaiement() { return statutPaiement; }
    public void setStatutPaiement(StatutPaiement s) { this.statutPaiement = s; }

    public String getFournisseur() { return fournisseur; }
    public void setFournisseur(String fournisseur) { this.fournisseur = fournisseur; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String t) { this.transactionId = t; }

    public String getApprovalUrl() { return approvalUrl; }
    public void setApprovalUrl(String a) { this.approvalUrl = a; }

    public String getPaypalPaymentId() { return paypalPaymentId; }
    public void setPaypalPaymentId(String p) { this.paypalPaymentId = p; }

    public String getPaypalPayerId() { return paypalPayerId; }
    public void setPaypalPayerId(String p) { this.paypalPayerId = p; }

    public String getStripeSessionId() { return stripeSessionId; }
    public void setStripeSessionId(String s) { this.stripeSessionId = s; }

    public String getStripePaymentIntentId() { return stripePaymentIntentId; }
    public void setStripePaymentIntentId(String s) { this.stripePaymentIntentId = s; }

    public String getCheckoutUrl() { return checkoutUrl; }
    public void setCheckoutUrl(String c) { this.checkoutUrl = c; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getReponseAdmin() { return reponseAdmin; }
    public void setReponseAdmin(String reponseAdmin) { this.reponseAdmin = reponseAdmin; }

    public String getTypeSource() { return typeSource; }
    public void setTypeSource(String typeSource) { this.typeSource = typeSource; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime d) { this.dateCreation = d; }

    public LocalDateTime getDatePaiement() { return datePaiement; }
    public void setDatePaiement(LocalDateTime d) { this.datePaiement = d; }

    public LocalDateTime getDateReponseAdmin() { return dateReponseAdmin; }
    public void setDateReponseAdmin(LocalDateTime d) { this.dateReponseAdmin = d; }

    public User getDonateur() { return donateur; }
    public void setDonateur(User donateur) { this.donateur = donateur; }

    public Activite getActivite() { return activite; }
    public void setActivite(Activite activite) { this.activite = activite; }

    public Projet getProjet() { return projet; }
    public void setProjet(Projet projet) { this.projet = projet; }
}
