package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.exception.ActivityRuleException;
import com.bxjeunes.bx_connect.dto.PaiementResponse;
import com.stripe.model.checkout.Session;

import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Isolation;

/** Shared activity rules for the existing Stripe and PayPal adapters.
 * All callers hold a transaction; activity lock is always acquired before payment/registration access.
 */
@Service
public class ActivityPaymentService {
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private java.time.Clock clock = java.time.Clock.systemUTC();
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    private final ActiviteRepository activities;
    private final InscriptionRepository registrations;
    private final SoutienFinancierRepository payments;
    private final MembreGroupeRepository memberships;
    public ActivityPaymentService(ActiviteRepository a, InscriptionRepository i,
                                  SoutienFinancierRepository p, MembreGroupeRepository m) {
        activities=a; registrations=i; payments=p; memberships=m;
    }
    /** Commit the reservation and attempt BEFORE any external payment request.
     * A timeout therefore leaves a recoverable attempt, never a second charge on retry.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, isolation = Isolation.READ_COMMITTED)
    public SoutienFinancier prepare(Long activityId, User user, BigDecimal amount, String provider) {
        Activite activity = lock(activityId);
        SoutienFinancier existing = pending(activity, user, amount, provider);
        if (existing != null) {
            // Initialize response relationships before leaving this transaction.
            existing.getActivite().getTitre(); existing.getDonateur().getPrenom();
            return existing;
        }
        long expires = ActivityCheckoutWindow.expiresAt(activity, clock);
        if ("STRIPE".equals(provider) && !ActivityCheckoutWindow.canOpen(activity, clock))
            throw new ActivityRuleException("PAYMENT_WINDOW_CLOSED", "Le délai restant est trop court pour ouvrir un paiement Stripe.");
        var payment = new SoutienFinancier();
        payment.setActivite(activity);
        payment.setDonateur(user);
        payment.setInscription(reserve(activity, user));
        payment.setMontant(activity.getPrix());
        payment.setFournisseur(provider);
        payment.setTypeSource(provider);
        payment.setActivityRequestKey(java.util.UUID.randomUUID().toString());
        payment.setCheckoutExpiresAt(expires);
        return payments.saveAndFlush(payment);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, isolation = Isolation.READ_COMMITTED)
    public SoutienFinancier attach(Long activityId, Long paymentId, String externalId, String url, String provider) {
        lock(activityId);
        var payment = payments.findByIdForUpdate(paymentId).orElseThrow();
        if ("STRIPE".equals(provider)) {
            if (payment.getStripeSessionId() != null && !payment.getStripeSessionId().equals(externalId))
                throw new ActivityRuleException("Une autre session est déjà associée.");
            payment.setStripeSessionId(externalId);
            if (payment.getStatutPaiement() == StatutPaiement.EN_ATTENTE) payment.setCheckoutUrl(url);
        } else {
            if (payment.getPaypalPaymentId() != null && !payment.getPaypalPaymentId().equals(externalId))
                throw new ActivityRuleException("Un autre paiement est déjà associé.");
            payment.setPaypalPaymentId(externalId); payment.setApprovalUrl(url);
        }
        payment = payments.saveAndFlush(payment);
        com.bxjeunes.bx_connect.dto.PaiementResponse.fromEntity(payment); // Initialize response relations before transaction closes.
        return payment;
    }

    public Activite lock(Long id) {
        return activities.findByIdForUpdate(id).orElseThrow(() -> new IllegalArgumentException("Activité introuvable."));
    }
    public void check(Activite a, User user) {
        if (user.getRole()!=Role.MEMBRE || !user.isActif()
                || !ActiviteLecture.lecteur(user, memberships.findByUserId(user.getId())).contenu(a))
            throw new AccessDeniedException("Inscription réservée aux membres autorisés.");
        LocalDateTime now=ActivityCheckoutWindow.now(clock);
        if (a.getStatut()!=StatutActivite.PUBLIEE || a.getDateDebut()==null || !a.getDateDebut().isAfter(now)
                || (a.getDateLimiteInscription()!=null && !a.getDateLimiteInscription().isAfter(now))
                || registrations.existsByActiviteIdAndDateValidationPresenceIsNotNull(a.getId()))
            throw new ActivityRuleException("Les inscriptions à cette activité sont clôturées.");
        if (a.isGratuite() || a.getPrix()==null || a.getPrix().signum()<=0)
            throw new ActivityRuleException("Cette activité ne nécessite pas de paiement.");
    }
    public SoutienFinancier pending(Activite a, User user, BigDecimal amount, String provider) {
        check(a,user);
        if (amount==null || a.getPrix().compareTo(amount)!=0)
            throw new ActivityRuleException("Le montant ne correspond pas au prix de l'activité.");
        var all=payments.findByActiviteId(a.getId()).stream().filter(p -> p.getDonateur().getId().equals(user.getId())).toList();
        if (all.stream().anyMatch(p -> p.getStatutPaiement()==StatutPaiement.PAYE))
            throw new ActivityRuleException("Cette inscription a déjà été payée.");
        var pending=all.stream().filter(p -> p.getStatutPaiement()==StatutPaiement.EN_ATTENTE).findFirst().orElse(null);
        if (pending!=null && !provider.equals(pending.getFournisseur()))
            throw new ActivityRuleException("Un paiement est déjà en cours avec un autre fournisseur.");
        return pending;
    }
    public Inscription reserve(Activite a, User user) {
        var previous=registrations.findByMembreIdAndActiviteId(user.getId(),a.getId()).orElse(null);
        if (previous!=null && previous.getStatut()!=StatutInscription.ANNULEE)
            throw new ActivityRuleException("Une inscription existe déjà.");
        if (registrations.countByActiviteIdAndStatutIn(a.getId(),List.of(StatutInscription.CONFIRMEE,
                StatutInscription.PAYEE,StatutInscription.EN_ATTENTE_PAIEMENT))>=a.getCapaciteMax())
            throw new ActivityRuleException("Cette activité est complète.");
        Inscription i=previous==null?new Inscription():previous;
        i.setActivite(a);i.setMembre(user);i.setDateAnnulation(null);i.setDateInscription(LocalDateTime.now());
        i.setStatut(StatutInscription.EN_ATTENTE_PAIEMENT);
        return registrations.saveAndFlush(i);
    }
    public SoutienFinancier lockedPayment(SoutienFinancier payment) {
        lock(payment.getActivite().getId());
        var current = payments.findByIdForUpdate(payment.getId()).orElseThrow();
        if (entityManager != null) entityManager.refresh(current);
        return current;
    }
    public void owner(SoutienFinancier p) {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null || !p.getDonateur().getEmail().equals(auth.getName()))
            throw new AccessDeniedException("Ce paiement ne vous appartient pas.");
    }

    public record RecoverySnapshot(PaiementResponse payment, String sessionId) {}
    public record StripeAttempt(Long id, String sessionId, Long expiresAt) {}

    @Transactional(readOnly = true)
    public StripeAttempt currentStripeAttempt(Long activityId, User user) {
        if (!user.isActif() || user.getRole() != Role.MEMBRE)
            throw new AccessDeniedException("Paiement réservé aux membres actifs.");
        return payments.findByActiviteId(activityId).stream()
                .filter(p -> p.getDonateur().getId().equals(user.getId()) && "STRIPE".equals(p.getFournisseur())
                        && p.getStatutPaiement() == StatutPaiement.EN_ATTENTE)
                .findFirst().map(p -> new StripeAttempt(p.getId(), p.getStripeSessionId(), p.getCheckoutExpiresAt())).orElse(null);
    }

    /** Called only before a new authenticated Checkout, never from a GET or a default scheduler. */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public List<StripeAttempt> expiredStripeAttempts(Long activityId, User user, BigDecimal amount) {
        var activity = lock(activityId);
        check(activity, user);
        if (amount == null || activity.getPrix().compareTo(amount) != 0)
            throw new ActivityRuleException("Le montant ne correspond pas au prix de l'activité.");
        return payments.findByActiviteId(activityId).stream()
                .filter(p -> "STRIPE".equals(p.getFournisseur()) && p.getStatutPaiement() == StatutPaiement.EN_ATTENTE
                        && p.getStripeSessionId() != null && p.getCheckoutExpiresAt() != null
                        && p.getCheckoutExpiresAt() <= clock.instant().getEpochSecond())
                .limit(20).map(p -> new StripeAttempt(p.getId(), p.getStripeSessionId(), p.getCheckoutExpiresAt())).toList();
    }

    @Transactional(readOnly = true)
    public RecoverySnapshot recoverySnapshot(Long paymentId, String email) {
        var p = payments.findById(paymentId).orElseThrow();
        requireRecoveryOwner(p, email);
        requireActivityPayment(p);
        return new RecoverySnapshot(PaiementResponse.fromEntity(p), p.getStripeSessionId());
    }

    private void requireRecoveryOwner(SoutienFinancier p, String email) {
        var member = p.getDonateur();
        if (member == null || !member.isActif() || member.getRole() != Role.MEMBRE
                || !member.getEmail().equals(email))
            throw new AccessDeniedException("Ce paiement ne vous appartient pas.");
    }

    private void requireActivityPayment(SoutienFinancier p) {
        if (!"STRIPE".equals(p.getFournisseur()) || p.getActivite() == null || p.getProjet() != null
                || p.getInscription() == null || p.getDonateur() == null
                || !p.getActivite().getId().equals(p.getInscription().getActivite().getId())
                || !p.getDonateur().getId().equals(p.getInscription().getMembre().getId()))
            throw new IllegalArgumentException("Paiement d'activité incohérent.");
    }

    /** The supplied session comes only from Stripe's server API, never from the browser. */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public PaiementResponse recover(Long paymentId, String email, Session session) {
        var snapshot = payments.findById(paymentId).orElseThrow();
        requireRecoveryOwner(snapshot, email);
        requireActivityPayment(snapshot);
        var p = lockedPayment(snapshot);
        requireRecoveryOwner(p, email);
        if (p.getStripeSessionId() == null) throw new IllegalArgumentException("Session Stripe absente.");
        verifyStripeSession(p, session);
        reconcileStripeState(p, session);
        return verifiedResponse(p, session);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void reconcileStripe(Long paymentId, Session session) {
        var p = payments.findById(paymentId).orElseThrow();
        requireActivityPayment(p);
        p = lockedPayment(p);
        verifyStripeSession(p, session);
        reconcileStripeState(p, session);
    }

    private void reconcileStripeState(SoutienFinancier p, Session session) {
        if ("complete".equals(session.getStatus()) && "paid".equals(session.getPaymentStatus()))
            applyStripeSession(p, session, true);
        else if ("expired".equals(session.getStatus()) && "unpaid".equals(session.getPaymentStatus()))
            applyStripeSession(p, session, false);
    }

    private PaiementResponse verifiedResponse(SoutienFinancier p, Session session) {
        boolean resumable = p.getStatutPaiement() == StatutPaiement.EN_ATTENTE
                && "open".equals(session.getStatus()) && "unpaid".equals(session.getPaymentStatus())
                && session.getExpiresAt() != null && session.getExpiresAt() > clock.instant().getEpochSecond();
        return PaiementResponse.fromEntity(p).withVerifiedCheckoutUrl(resumable ? session.getUrl() : null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, isolation = Isolation.READ_COMMITTED)
    public PaiementResponse attachVerifiedStripe(Long paymentId, Session session) {
        var p = payments.findById(paymentId).orElseThrow();
        requireActivityPayment(p);
        p = lockedPayment(p);
        verifyStripeSession(p, session);
        p.setStripeSessionId(session.getId());
        if (p.getStatutPaiement() == StatutPaiement.EN_ATTENTE) p.setCheckoutUrl(session.getUrl());
        reconcileStripeState(p, session);
        payments.saveAndFlush(p);
        return verifiedResponse(p, session);
    }

    /** Shared confirmation for signed webhooks and server-side recovery, with the same locks. */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void handleStripe(Session session, boolean completed) {
        String reference = session.getMetadata() == null ? null : session.getMetadata().get("activity_payment_id");
        if (reference == null || !reference.matches("[1-9][0-9]*"))
            throw new IllegalArgumentException("Référence du paiement d'activité invalide.");
        var p = payments.findByStripeSessionId(session.getId())
                .orElseGet(() -> payments.findById(Long.valueOf(reference)).orElseThrow());
        requireActivityPayment(p);
        p = lockedPayment(p);
        verifyStripeSession(p, session);
        applyStripeSession(p, session, completed);
    }

    private void verifyStripeSession(SoutienFinancier p, Session session) {
        requireActivityPayment(p);
        if (session == null || session.getId() == null || !session.getId().startsWith("cs_")
                || (p.getStripeSessionId() != null && !p.getStripeSessionId().equals(session.getId()))
                || session.getMetadata() == null
                || !p.getId().toString().equals(session.getMetadata().get("activity_payment_id"))
                || session.getMetadata().containsKey("project_participation_payment_id")
                || !"payment".equals(session.getMode()) || !"eur".equalsIgnoreCase(session.getCurrency())
                || session.getAmountTotal() == null || p.getMontant() == null
                || session.getAmountTotal() != p.getMontant().movePointRight(2).longValueExact())
            throw new IllegalArgumentException("Session de paiement d'activité incohérente.");
    }

    private void applyStripeSession(SoutienFinancier p, Session session, boolean completed) {
        if (completed && (!"complete".equals(session.getStatus()) || !"paid".equals(session.getPaymentStatus())
                || session.getPaymentIntent() == null || session.getPaymentIntent().isBlank()))
            throw new IllegalArgumentException("Paiement non confirmé.");
        if (!completed && (!"expired".equals(session.getStatus()) || "paid".equals(session.getPaymentStatus())))
            throw new IllegalArgumentException("Session non expirée.");
        if (p.getStatutPaiement() == StatutPaiement.PAYE || p.getStatutPaiement() == StatutPaiement.REMBOURSE) return;
        p.setStripeSessionId(session.getId());
        if (completed) p.setStripePaymentIntentId(session.getPaymentIntent());
        p.setCheckoutUrl(null);
        complete(p, completed);
    }

    public void complete(SoutienFinancier p, boolean paid) {
        // A successful provider event must never be overwritten by a delayed expiration/failure.
        if (p.getStatutPaiement()==StatutPaiement.PAYE || (!paid && p.getStatutPaiement()!=StatutPaiement.EN_ATTENTE)) return;
        p.setStatutPaiement(paid?StatutPaiement.PAYE:StatutPaiement.ANNULE);
        if(paid) p.setDatePaiement(LocalDateTime.now());
        Inscription i=p.getInscription();
        if(i!=null) {
            i.setStatut(paid && i.getActivite().getStatut()==StatutActivite.PUBLIEE
                    ?StatutInscription.PAYEE:StatutInscription.ANNULEE);
            if(i.getStatut()==StatutInscription.ANNULEE) i.setDateAnnulation(LocalDateTime.now());
            registrations.save(i);
        }
        payments.save(p);
    }
}
