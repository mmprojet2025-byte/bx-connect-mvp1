package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.PaiementRequest;
import com.bxjeunes.bx_connect.dto.PaiementResponse;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class StripeService {

    private final SoutienFinancierRepository soutienRepo;
    private final UserRepository userRepository;
    private final ActiviteRepository activiteRepository;
    private final ProjetRepository projetRepository;

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    @Value("${stripe.success-url}")
    private String successUrl;

    @Value("${stripe.cancel-url}")
    private String cancelUrl;

    public StripeService(SoutienFinancierRepository soutienRepo,
                         UserRepository userRepository,
                         ActiviteRepository activiteRepository,
                         ProjetRepository projetRepository) {
        this.soutienRepo       = soutienRepo;
        this.userRepository    = userRepository;
        this.activiteRepository = activiteRepository;
        this.projetRepository  = projetRepository;
    }

    // ─── Créer une session Stripe Checkout ───────────────────────────────────
    public PaiementResponse creerSessionCheckout(PaiementRequest request) throws StripeException {

        // Récupérer l'utilisateur connecté
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User donateur = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        // Déterminer la description
        String description = "Soutien BX-CONNECT";
        Activite activite = null;
        Projet projet = null;

        if (request.getActiviteId() != null) {
            activite = activiteRepository.findById(request.getActiviteId())
                    .orElseThrow(() -> new RuntimeException("Activité introuvable"));
            description = "Soutien activité : " + activite.getTitre();
        } else if (request.getProjetId() != null) {
            projet = projetRepository.findById(request.getProjetId())
                    .orElseThrow(() -> new RuntimeException("Projet introuvable"));
            description = "Soutien projet : " + projet.getTitre();
        }

        // Montant en centimes (Stripe utilise les centimes)
        long montantCentimes = request.getMontant()
                .multiply(BigDecimal.valueOf(100))
                .longValue();

        // Créer la session Stripe Checkout
        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(successUrl + "?session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(cancelUrl)
                .setCustomerEmail(email)
                .addLineItem(
                    SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(
                            SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency("eur")
                                .setUnitAmount(montantCentimes)
                                .setProductData(
                                    SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName(description)
                                        .setDescription("BX-CONNECT — Plateforme des jeunes de Bruxelles")
                                        .build()
                                )
                                .build()
                        )
                        .build()
                )
                .build();

        Session session = Session.create(params);

        // Sauvegarder en base avec statut EN_ATTENTE
        SoutienFinancier soutien = new SoutienFinancier();
        soutien.setMontant(request.getMontant());
        soutien.setDonateur(donateur);
        soutien.setFournisseur("STRIPE");
        soutien.setTypeSource("STRIPE");
        soutien.setStripeSessionId(session.getId());
        soutien.setCheckoutUrl(session.getUrl());
        soutien.setStatutPaiement(StatutPaiement.EN_ATTENTE);
        soutien.setMessage(request.getMessage());

        if (activite != null) soutien.setActivite(activite);
        if (projet != null)   soutien.setProjet(projet);

        SoutienFinancier saved = soutienRepo.save(soutien);
        return PaiementResponse.fromEntity(saved);
    }

    // ─── Vérifier le statut d'une session Stripe ─────────────────────────────
    public PaiementResponse verifierSession(String sessionId) throws StripeException {
        Session session = Session.retrieve(sessionId);

        SoutienFinancier soutien = soutienRepo.findByStripeSessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Soutien introuvable pour cette session"));

        if ("complete".equals(session.getStatus()) ||
            "paid".equals(session.getPaymentStatus())) {
            soutien.setStatutPaiement(StatutPaiement.PAYE);
            soutien.setStripePaymentIntentId(session.getPaymentIntent());
            soutien.setDatePaiement(LocalDateTime.now());
        } else if ("expired".equals(session.getStatus())) {
            soutien.setStatutPaiement(StatutPaiement.ANNULE);
        }

        return PaiementResponse.fromEntity(soutienRepo.save(soutien));
    }

    // ─── Webhook Stripe (mise à jour automatique du statut) ──────────────────
    public void traiterWebhook(String payload, String sigHeader) throws StripeException {
        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            throw new RuntimeException("Signature webhook Stripe invalide");
        }

        switch (event.getType()) {
            case "checkout.session.completed" -> {
                Session session = (Session) event.getDataObjectDeserializer()
                        .getObject().orElseThrow();
                soutienRepo.findByStripeSessionId(session.getId()).ifPresent(s -> {
                    s.setStatutPaiement(StatutPaiement.PAYE);
                    s.setStripePaymentIntentId(session.getPaymentIntent());
                    s.setDatePaiement(LocalDateTime.now());
                    soutienRepo.save(s);
                });
            }
            case "checkout.session.expired" -> {
                Session session = (Session) event.getDataObjectDeserializer()
                        .getObject().orElseThrow();
                soutienRepo.findByStripeSessionId(session.getId()).ifPresent(s -> {
                    s.setStatutPaiement(StatutPaiement.ANNULE);
                    soutienRepo.save(s);
                });
            }
            case "charge.refunded" -> {
                // Gérer les remboursements
            }
            default -> {
                // Événement non géré — ignorer
            }
        }
    }

    // ─── Historique des paiements Stripe de l'utilisateur connecté ───────────
    public List<PaiementResponse> mesPaymentsStripe() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User donateur = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        return soutienRepo.findByDonateurId(donateur.getId())
                .stream()
                .filter(s -> "STRIPE".equals(s.getFournisseur()))
                .map(PaiementResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Historique complet (PayPal + Stripe) ────────────────────────────────
    public List<PaiementResponse> tousLesPaiements() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User donateur = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        return soutienRepo.findByDonateurId(donateur.getId())
                .stream()
                .map(PaiementResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Clé publique Stripe (pour le frontend) ───────────────────────────────
    @Value("${stripe.publishable-key}")
    private String publishableKey;

    public String getPublishableKey() {
        return publishableKey;
    }
}