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
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@ConditionalOnProperty(
        name = "features.payments.stripe.enabled",
        havingValue = "true",
        matchIfMissing = false
)
public class StripeService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(StripeService.class);
    @org.springframework.beans.factory.annotation.Autowired
    private ActivityPaymentService activityPayments;
    @org.springframework.beans.factory.annotation.Autowired
    private ProjetParticipationPaiementService projectParticipationPayments;

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
    @org.springframework.transaction.annotation.Transactional(rollbackFor = Exception.class)
    public PaiementResponse creerSessionCheckout(PaiementRequest request) throws StripeException {

        // Récupérer l'utilisateur connecté
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User donateur = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        // Déterminer la description
        String description = "Soutien BX-CONNECT";
        Activite activite = null;
        Inscription registration = null;
        Projet projet = null;

        verifierCibleUnique(request);
        if (request.getActiviteId() != null) {
            return creerPaiementActivite(request, donateur);
        } else if (request.getProjetId() != null) {
            projet = projetRepository.findById(request.getProjetId())
                    .orElseThrow(() -> new RuntimeException("Projet introuvable"));
            verifierProjetPayable(projet);
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

        Session session = creerSessionExterne(params);

        // Sauvegarder en base avec statut EN_ATTENTE
        SoutienFinancier soutien = new SoutienFinancier();
        soutien.setMontant(request.getMontant());
        soutien.setInscription(registration);
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

    @org.springframework.transaction.annotation.Transactional(rollbackFor = Exception.class)
    public void annulerPaiementActivite(Long paymentId) throws StripeException {
        var p = soutienRepo.findById(paymentId).orElseThrow();
        if (p.getActivite() == null) throw new IllegalArgumentException("Paiement d'activité requis.");
        p = activityPayments.lockedPayment(p);
        activityPayments.owner(p);
        if (p.getStatutPaiement() != StatutPaiement.EN_ATTENTE) return;
        if (p.getStripeSessionId() == null)
            throw new IllegalArgumentException("Le paiement est encore en cours de vérification.");
        var remote = lireSessionExterne(p.getStripeSessionId());
        if ("open".equals(remote.getStatus())) remote = expirerSessionExterne(remote);
        if (!"expired".equals(remote.getStatus()))
            throw new IllegalArgumentException("Le paiement est encore en cours de confirmation.");
        activityPayments.complete(p, false);
    }
    Session lireSessionExterne(String id) throws StripeException { return Session.retrieve(id); }
    Session expirerSessionExterne(Session session) throws StripeException { return session.expire(); }

    private PaiementResponse creerPaiementActivite(PaiementRequest request, User user) throws StripeException {
        var attempt = activityPayments.prepare(request.getActiviteId(), user, request.getMontant(), "STRIPE");
        if (attempt.getCheckoutUrl() != null) return PaiementResponse.fromEntity(attempt);
        var params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                .setExpiresAt(attempt.getCheckoutExpiresAt())
                .setSuccessUrl(successUrl + "?session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(cancelUrl)
                .putMetadata("activity_payment_id", attempt.getId().toString())
                .addLineItem(SessionCreateParams.LineItem.builder().setQuantity(1L)
                    .setPriceData(SessionCreateParams.LineItem.PriceData.builder().setCurrency("eur")
                        .setUnitAmount(attempt.getMontant().movePointRight(2).longValueExact())
                        .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                            .setName("BX-Connect — Activité " + request.getActiviteId()).build()).build()).build())
                .build();
        Session session = creerSessionActiviteExterne(params, attempt.getActivityRequestKey());
        return PaiementResponse.fromEntity(activityPayments.attach(request.getActiviteId(), attempt.getId(),
                session.getId(), session.getUrl(), "STRIPE"));
    }

    Session creerSessionActiviteExterne(SessionCreateParams params, String key) throws StripeException {
        return Session.create(params, com.stripe.net.RequestOptions.builder().setIdempotencyKey(key).build());
    }

    // ─── Vérifier le statut d'une session Stripe ─────────────────────────────
    public PaiementResponse verifierSession(String sessionId, String emailUtilisateur) throws StripeException {
        SoutienFinancier soutien = soutienRepo.findByStripeSessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Soutien introuvable pour cette session"));

        if (soutien.getDonateur() == null
                || !emailUtilisateur.equals(soutien.getDonateur().getEmail())) {
            throw new AccessDeniedException("Cette session Stripe ne vous appartient pas.");
        }

        // Seul le webhook Stripe signé est autorisé à modifier le statut du paiement.
        return PaiementResponse.fromEntity(soutien);
    }

    // ─── Webhook Stripe (mise à jour automatique du statut) ──────────────────
    @org.springframework.transaction.annotation.Transactional
    public void traiterWebhook(String payload, String sigHeader) throws StripeException {
        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            throw new RuntimeException("Signature webhook Stripe invalide");
        }

        try {
            switch (event.getType()) {
                case "checkout.session.completed" -> {
                    Session session = checkoutSession(event);
                    if (session.getMetadata() != null && session.getMetadata().containsKey("project_participation_payment_id")) {
                        projectParticipationPayments.handle(session, true);
                        break;
                    }
                    trouverPaiementSession(session).ifPresent(s -> {
                        if (s.getActivite() != null) {
                            s = activityPayments.lockedPayment(s);
                            if (!s.getId().toString().equals(session.getMetadata() == null ? null
                                    : session.getMetadata().get("activity_payment_id")))
                                throw new IllegalArgumentException("Référence du paiement d'activité invalide.");
                            if (!"paid".equals(session.getPaymentStatus()) || !"eur".equalsIgnoreCase(session.getCurrency())
                                    || session.getAmountTotal() == null
                                    || session.getAmountTotal() != s.getMontant().movePointRight(2).longValueExact())
                                throw new IllegalArgumentException("Paiement non confirmé ou montant invalide.");
                            if (s.getStatutPaiement() == StatutPaiement.PAYE) return;
                            activityPayments.complete(s, true);
                            s.setStripePaymentIntentId(session.getPaymentIntent());
                            soutienRepo.save(s);
                            return;
                        }
                        s.setStatutPaiement(StatutPaiement.PAYE);
                        s.setStripePaymentIntentId(session.getPaymentIntent());
                        s.setDatePaiement(LocalDateTime.now());
                        soutienRepo.save(s);
                    });
                }
                case "checkout.session.expired" -> {
                    Session session = checkoutSession(event);
                    if (session.getMetadata() != null && session.getMetadata().containsKey("project_participation_payment_id")) {
                        projectParticipationPayments.handle(session, false);
                        break;
                    }
                    trouverPaiementSession(session).ifPresent(s -> {
                        if (s.getActivite() != null) {
                            s = activityPayments.lockedPayment(s);
                            activityPayments.complete(s, false);
                        } else if (s.getStatutPaiement() != StatutPaiement.PAYE) {
                            s.setStatutPaiement(StatutPaiement.ANNULE);
                            soutienRepo.save(s);
                        }
                    });
                }
                case "charge.refunded" -> {
                    // Gérer les remboursements
                }
                default -> {
                    // Événement non géré — ignorer
                }
            }
        } catch (RuntimeException | StripeException e) {
            // Never log the payload, signature, credentials, or provider exception message.
            log.warn("Signed Stripe webhook failed: event={}, type={}, apiVersion={}, error={}",
                    event.getId(), event.getType(), event.getApiVersion(), e.getClass().getSimpleName());
            throw e;
        }
    }

    private Session checkoutSession(Event event) throws StripeException {
        var deserializer = event.getDataObjectDeserializer();
        var object = deserializer.getObject();
        if (object.isPresent()) return (Session) object.get();

        // A signed event can use a newer schema than this SDK. Read only its identity,
        // then retrieve the existing Checkout session using the SDK's pinned API version.
        var raw = com.google.gson.JsonParser.parseString(deserializer.getRawJson()).getAsJsonObject();
        if (!raw.has("object") || !"checkout.session".equals(raw.get("object").getAsString())
                || !raw.has("id") || !raw.has("metadata") || !raw.get("metadata").isJsonObject()
                || (!raw.getAsJsonObject("metadata").has("activity_payment_id")
                    && !raw.getAsJsonObject("metadata").has("project_participation_payment_id")))
            throw new IllegalArgumentException("Objet Stripe inattendu.");
        String id = raw.get("id").getAsString();
        String metadataKey = raw.getAsJsonObject("metadata").has("project_participation_payment_id")
                ? "project_participation_payment_id" : "activity_payment_id";
        if (raw.getAsJsonObject("metadata").has("project_participation_payment_id")
                && raw.getAsJsonObject("metadata").has("activity_payment_id"))
            throw new IllegalArgumentException("Référence ambiguë.");
        String paymentId = raw.getAsJsonObject("metadata").get(metadataKey).getAsString();
        if (!id.startsWith("cs_") || !paymentId.matches("[1-9][0-9]*"))
            throw new IllegalArgumentException("Référence Stripe invalide.");
        Session session = lireSessionExterne(id);
        if (session == null || !id.equals(session.getId()) || session.getMetadata() == null
                || !paymentId.equals(session.getMetadata().get(metadataKey)))
            throw new IllegalArgumentException("Session Stripe incohérente.");
        return session;
    }

    private java.util.Optional<SoutienFinancier> trouverPaiementSession(Session session) {
        var found = soutienRepo.findByStripeSessionId(session.getId());
        if (found.isPresent()) return found;
        String id = session.getMetadata() == null ? null : session.getMetadata().get("activity_payment_id");
        if (id == null) return java.util.Optional.empty();
        var payment = soutienRepo.findById(Long.valueOf(id)).orElseThrow();
        if (payment.getInscription() == null || !"STRIPE".equals(payment.getFournisseur()))
            throw new IllegalArgumentException("Paiement invalide.");
        payment = activityPayments.lockedPayment(payment);
        if (payment.getStripeSessionId() != null && !payment.getStripeSessionId().equals(session.getId()))
            throw new IllegalArgumentException("Session invalide.");
        payment.setStripeSessionId(session.getId());
        soutienRepo.saveAndFlush(payment);
        return java.util.Optional.of(payment);
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

    Session creerSessionExterne(SessionCreateParams params) throws StripeException {
        return Session.create(params);
    }

    private void verifierCibleUnique(PaiementRequest request) {
        boolean cibleActivite = request.getActiviteId() != null;
        boolean cibleProjet = request.getProjetId() != null;
        if (cibleProjet && (request.getMontant() == null || request.getMontant().compareTo(BigDecimal.ONE) < 0))
            throw new IllegalArgumentException("Le montant minimum est de 1€.");
        if (cibleActivite == cibleProjet) {
            throw new AccessDeniedException("Le paiement doit cibler une seule activité ou un seul projet ouvert au soutien.");
        }
    }

    private void verifierProjetPayable(Projet projet) {
        boolean statutOuvert = projet.getStatut() == StatutProjet.APPROUVE
                || projet.getStatut() == StatutProjet.EN_COURS;
        boolean visibiliteOuverte = projet.getVisibilite() == VisibiliteProjet.PUBLIC
                || projet.getVisibilite() == VisibiliteProjet.PARTENAIRES;
        if (!statutOuvert || !visibiliteOuverte) {
            throw new AccessDeniedException("Ce projet n'est pas ouvert au paiement.");
        }
    }
}
