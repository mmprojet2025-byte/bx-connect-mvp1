package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.exception.ActivityRuleException;

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
        long expires = Math.min(System.currentTimeMillis() / 1000 + 3600,
                (activity.getDateLimiteInscription() == null ? activity.getDateDebut() : activity.getDateLimiteInscription())
                        .atZone(java.time.ZoneId.systemDefault()).toEpochSecond());
        if ("STRIPE".equals(provider) && expires < System.currentTimeMillis() / 1000 + 1860)
            throw new ActivityRuleException("Le délai restant est trop court pour ouvrir un paiement Stripe.");
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
            payment.setStripeSessionId(externalId); payment.setCheckoutUrl(url);
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
        LocalDateTime now=LocalDateTime.now();
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
