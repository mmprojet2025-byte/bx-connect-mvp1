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

    @Column(length = 100)
    private String transactionId; // ID PayPal

    @Column(length = 500)
    private String approvalUrl; // URL de redirection PayPal

    @Column(length = 100)
    private String paypalPaymentId; // Payment ID PayPal

    @Column(length = 100)
    private String paypalPayerId; // Payer ID après confirmation

    @Column(nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    private LocalDateTime datePaiement;

    // ─── Relations ────────────────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "donateur_id", nullable = false)
    private User donateur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activite_id")
    private Activite activite; // Soutien à une activité (optionnel)

    // ─── Constructeurs ────────────────────────────────────────────────────────

    public SoutienFinancier() {}

    // ─── Getters & Setters ────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public BigDecimal getMontant() { return montant; }
    public void setMontant(BigDecimal montant) { this.montant = montant; }

    public StatutPaiement getStatutPaiement() { return statutPaiement; }
    public void setStatutPaiement(StatutPaiement statutPaiement) { this.statutPaiement = statutPaiement; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public String getApprovalUrl() { return approvalUrl; }
    public void setApprovalUrl(String approvalUrl) { this.approvalUrl = approvalUrl; }

    public String getPaypalPaymentId() { return paypalPaymentId; }
    public void setPaypalPaymentId(String paypalPaymentId) { this.paypalPaymentId = paypalPaymentId; }

    public String getPaypalPayerId() { return paypalPayerId; }
    public void setPaypalPayerId(String paypalPayerId) { this.paypalPayerId = paypalPayerId; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }

    public LocalDateTime getDatePaiement() { return datePaiement; }
    public void setDatePaiement(LocalDateTime datePaiement) { this.datePaiement = datePaiement; }

    public User getDonateur() { return donateur; }
    public void setDonateur(User donateur) { this.donateur = donateur; }

    public Activite getActivite() { return activite; }
    public void setActivite(Activite activite) { this.activite = activite; }
}