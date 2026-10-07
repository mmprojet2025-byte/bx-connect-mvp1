package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.ProjetPaiementResponse;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import com.stripe.model.checkout.Session;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.security.access.AccessDeniedException;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional(isolation = Isolation.READ_COMMITTED)
public class ProjetParticipationPaiementService {
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private java.time.Clock clock = java.time.Clock.systemUTC();
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    private final ProjetRepository projects;
    private final UserRepository users;
    private final MembreGroupeRepository memberships;
    private final ParticipationProjetRepository participations;
    private final ProjetParticipationPaiementRepository payments;
    private final NotificationService notifications;
    public ProjetParticipationPaiementService(ProjetRepository p, UserRepository u, MembreGroupeRepository m,
            ParticipationProjetRepository r, ProjetParticipationPaiementRepository pay, NotificationService n) {
        projects=p; users=u; memberships=m; participations=r; payments=pay; notifications=n;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, isolation = Isolation.READ_COMMITTED)
    public ProjetParticipationPaiement prepare(Long projectId, String email) {
        User user = user(email);
        Projet project = projects.findByIdForUpdate(projectId).orElseThrow();
        if (user.getRole() != Role.MEMBRE || !user.isActif()) throw new AccessDeniedException("Participation réservée aux membres actifs.");
        if (!List.of(StatutProjet.APPROUVE, StatutProjet.EN_COURS).contains(project.getStatut()))
            throw new IllegalArgumentException("Ce projet n'est pas ouvert aux participations.");
        if (project.getVisibilite() != VisibiliteProjet.PUBLIC
                && (project.getGroupe() == null || memberships.findFirstByUserIdAndStatut(user.getId(), StatutMembre.ACCEPTE)
                    .map(m -> m.getGroupe().getId().equals(project.getGroupe().getId())).orElse(false) == false))
            throw new AccessDeniedException("Une adhésion active au groupe concerné est requise.");
        if (project.getPrixParticipation().signum() <= 0) throw new IllegalArgumentException("Ce projet est gratuit.");
        if (participations.existsByUserIdAndProjetId(user.getId(), projectId))
            throw new IllegalArgumentException("Vous participez déjà à ce projet.");
        ProjetParticipationRules.checkOpen(project);
        var existing = payments.findByProjetIdOrderByDateCreationDesc(projectId).stream()
                .filter(p -> p.getMembre().getId().equals(user.getId())).toList();
        if (existing.stream().anyMatch(p -> p.getStatut() == StatutPaiement.PAYE))
            throw new IllegalArgumentException("Cette participation a déjà été payée.");
        var pending = existing.stream().filter(p -> p.getStatut() == StatutPaiement.EN_ATTENTE).findFirst();
        if (pending.isPresent()) return pending.get();
        ProjetParticipationRules.checkCapacity(project,
                participations.countByProjetId(projectId) + participations.countPendingPayments(projectId));
        var payment = new ProjetParticipationPaiement();
        payment.setProjet(project); payment.setMembre(user);
        payment.setMontant(project.getPrixParticipation()); payment.setDevise("EUR");
        payment.setStatut(StatutPaiement.EN_ATTENTE);
        payment.setRequestKey(UUID.randomUUID().toString());
        payment.setExpiresAt(clock.instant().getEpochSecond() + 3600);
        payment.setDateCreation(LocalDateTime.now());
        payment.setTitreProjet(project.getTitre());
        payment.setNomParticipant(user.getPrenom() + " " + user.getNom());
        return payments.saveAndFlush(payment);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, isolation = Isolation.READ_COMMITTED)
    public ProjetPaiementResponse attach(Long id, Session session) {
        var p = lock(id);
        verifySession(p, session);
        p.setStripeSessionId(session.getId());
        if (p.getStatut() == StatutPaiement.EN_ATTENTE) p.setCheckoutUrl(session.getUrl());
        return ProjetPaiementResponse.from(payments.saveAndFlush(p));
    }

    private ProjetParticipationPaiement lock(Long id) {
        var initial = payments.findById(id).orElseThrow();
        projects.findByIdForUpdate(initial.getProjet().getId()).orElseThrow();
        var locked = payments.findByIdForUpdate(id).orElseThrow();
        if (entityManager != null) entityManager.refresh(locked);
        return locked;
    }

    private void verifySession(ProjetParticipationPaiement p, Session session) {
        if (session.getId() == null || !session.getId().startsWith("cs_")
                || session.getMetadata() == null || !p.getId().toString().equals(session.getMetadata().get("project_participation_payment_id"))
                || (session.getMetadata().containsKey("project_id")
                    && !p.getProjet().getId().toString().equals(session.getMetadata().get("project_id")))
                || (p.getStripeSessionId() != null && !p.getStripeSessionId().equals(session.getId()))
                || !"payment".equals(session.getMode())
                || !p.getDevise().equalsIgnoreCase(session.getCurrency())
                || session.getAmountTotal() == null
                || session.getAmountTotal() != p.getMontant().movePointRight(2).longValueExact())
            throw new IllegalArgumentException("Session de participation incohérente.");
    }

    public record RecoverySnapshot(ProjetPaiementResponse payment, String sessionId) {}
    public record StripeAttempt(Long id, String sessionId) {}

    @Transactional(readOnly = true)
    public StripeAttempt currentAttempt(Long projectId, String email) {
        var u = user(email);
        if (u.getRole() != Role.MEMBRE || !u.isActif()) throw new AccessDeniedException("Participation réservée aux membres actifs.");
        return payments.findByProjetIdOrderByDateCreationDesc(projectId).stream()
                .filter(p -> p.getMembre().getId().equals(u.getId()) && p.getStatut() == StatutPaiement.EN_ATTENTE)
                .findFirst().map(p -> new StripeAttempt(p.getId(), p.getStripeSessionId())).orElse(null);
    }

    public List<StripeAttempt> expiredStripeAttempts(Long projectId, String email) {
        var u = user(email);
        var project = projects.findByIdForUpdate(projectId).orElseThrow();
        if (u.getRole() != Role.MEMBRE || !u.isActif()) throw new AccessDeniedException("Participation réservée aux membres actifs.");
        if (project.getVisibilite() != VisibiliteProjet.PUBLIC
                && (project.getGroupe() == null || memberships.findFirstByUserIdAndStatut(u.getId(), StatutMembre.ACCEPTE)
                    .map(m -> m.getGroupe().getId().equals(project.getGroupe().getId())).orElse(false) == false))
            throw new AccessDeniedException("Une adhésion active au groupe concerné est requise.");
        return payments.findByProjetIdOrderByDateCreationDesc(projectId).stream()
                .filter(p -> p.getStatut() == StatutPaiement.EN_ATTENTE && p.getStripeSessionId() != null && p.getExpiresAt() != null
                        && p.getExpiresAt() <= clock.instant().getEpochSecond())
                .limit(20).map(p -> new StripeAttempt(p.getId(), p.getStripeSessionId())).toList();
    }

    public void reconcile(Long paymentId, Session session) {
        var p = lock(paymentId);
        verifySession(p, session);
        if ("complete".equals(session.getStatus()) && "paid".equals(session.getPaymentStatus())) handle(session, true);
        else if ("expired".equals(session.getStatus()) && "unpaid".equals(session.getPaymentStatus())) handle(session, false);
    }

    @Transactional(readOnly = true)
    public RecoverySnapshot recoverySnapshot(Long id, String email) {
        var p = payments.findById(id).orElseThrow();
        requireOwner(p, email);
        return new RecoverySnapshot(ProjetPaiementResponse.from(p), p.getStripeSessionId());
    }

    private void requireOwner(ProjetParticipationPaiement p, String email) {
        var u = user(email);
        if (u.getRole() != Role.MEMBRE || !u.isActif() || !p.getMembre().getId().equals(u.getId()))
            throw new AccessDeniedException("Ce paiement ne vous appartient pas.");
    }

    // Session supplied only by the server's Stripe retrieval, never by the client.
    public ProjetPaiementResponse recover(Long id, String email, Session session) {
        var p = lock(id);
        requireOwner(p, email);
        if (p.getStripeSessionId() == null) throw new IllegalArgumentException("Session Stripe absente.");
        verifySession(p, session);
        if ("complete".equals(session.getStatus()) && "paid".equals(session.getPaymentStatus())) {
            handle(session, true);
        } else if ("expired".equals(session.getStatus()) && "unpaid".equals(session.getPaymentStatus())) {
            handle(session, false);
        }
        var dto = ProjetPaiementResponse.from(p);
        boolean resumable = p.getStatut() == StatutPaiement.EN_ATTENTE
                && "open".equals(session.getStatus()) && "unpaid".equals(session.getPaymentStatus())
                && session.getExpiresAt() != null && session.getExpiresAt() > clock.instant().getEpochSecond();
        return new ProjetPaiementResponse(dto.id(), dto.projetId(), dto.titreProjet(), dto.participant(),
                dto.montant(), dto.devise(), dto.statut(), dto.dateCreation(), dto.datePaiement(),
                dto.numeroRecu(), resumable ? session.getUrl() : null);
    }

    /** Used by the signed webhook and server-to-server Stripe recovery. Never a success URL. */
    public void handle(Session session, boolean completed) {
        String reference = session.getMetadata() == null ? null : session.getMetadata().get("project_participation_payment_id");
        if (reference == null || !reference.matches("[1-9][0-9]*")) throw new IllegalArgumentException("Référence de paiement invalide.");
        var p = lock(Long.valueOf(reference));
        verifySession(p, session);
        if (completed && (!"paid".equals(session.getPaymentStatus()) || !"complete".equals(session.getStatus())
                || session.getPaymentIntent() == null))
            throw new IllegalArgumentException("Paiement non confirmé.");
        if (!completed && (!"expired".equals(session.getStatus()) || "paid".equals(session.getPaymentStatus())))
            throw new IllegalArgumentException("Session non expirée.");
        if (p.getStatut() == StatutPaiement.PAYE || p.getStatut() == StatutPaiement.REMBOURSE) return;
        p.setStripeSessionId(session.getId());
        if (!completed) {
            p.setStatut(StatutPaiement.ANNULE); p.setCheckoutUrl(null); payments.save(p); return;
        }
        // Eligibility and the price were reserved when Checkout opened.
        // A later project/profile edit must not lose an already successful payment.
        p.setStatut(StatutPaiement.PAYE);
        p.setDatePaiement(LocalDateTime.now());
        p.setNumeroRecu("BX-PROJET-" + p.getId());
        p.setStripePaymentIntentId(session.getPaymentIntent());
        p.setCheckoutUrl(null);
        if (!participations.existsByUserIdAndProjetId(p.getMembre().getId(), p.getProjet().getId()))
            participations.save(new ParticipationProjet(p.getMembre(), p.getProjet()));
        payments.save(p);
        notifications.creer(p.getMembre(), "Reçu de paiement disponible",
                "Votre participation au projet « " + p.getTitreProjet() + " » est payée. Votre reçu est disponible dans Mes factures.",
                "RECU_PROJET", "/mes-factures?recu=" + p.getId());
    }

    @Transactional(readOnly = true)
    public List<ProjetPaiementResponse> mine(String email) {
        return payments.findByMembreIdOrderByDateCreationDesc(user(email).getId()).stream().map(ProjetPaiementResponse::from).toList();
    }
    @Transactional(readOnly = true)
    public ProjetPaiementResponse receipt(Long id, String email) {
        var p = payments.findById(id).orElseThrow();
        User user = user(email);
        if (!p.getMembre().getId().equals(user.getId())) manager(p.getProjet(), user);
        if (p.getStatut() != StatutPaiement.PAYE || p.getNumeroRecu() == null)
            throw new IllegalArgumentException("Le reçu sera disponible après confirmation du paiement.");
        return ProjetPaiementResponse.from(p);
    }
    @Transactional(readOnly = true)
    public List<ProjetPaiementResponse> forProject(Long id, String email) {
        Projet project = projects.findById(id).orElseThrow();
        manager(project, user(email));
        return payments.findByProjetIdOrderByDateCreationDesc(id).stream()
            .map(p -> { var dto = ProjetPaiementResponse.from(p);
                return new ProjetPaiementResponse(dto.id(), dto.projetId(), dto.titreProjet(), dto.participant(),
                    dto.montant(), dto.devise(), dto.statut(), dto.dateCreation(), dto.datePaiement(), dto.numeroRecu(), null); })
            .toList();
    }
    private void manager(Projet p, User u) {
        if (u.getRole() == Role.ADMIN) return;
        if (u.getRole() == Role.REFERENT && p.getGroupe() != null && p.getGroupe().getReferent() != null
                && p.getGroupe().getReferent().getId().equals(u.getId())) return;
        throw new AccessDeniedException("Accès aux transactions refusé.");
    }
    private User user(String email) { return users.findByEmail(email).orElseThrow(); }
}
