package com.bxjeunes.bx_connect.service;

import org.springframework.transaction.annotation.Transactional;
import com.bxjeunes.bx_connect.dto.PaiementRequest;
import com.bxjeunes.bx_connect.dto.PaiementResponse;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.ProjetRepository;
import com.bxjeunes.bx_connect.repository.SoutienFinancierRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.paypal.api.payments.*;
import com.paypal.base.rest.APIContext;
import com.paypal.base.rest.PayPalRESTException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@ConditionalOnProperty(
        name = "features.payments.paypal.enabled",
        havingValue = "true",
        matchIfMissing = false
)
public class PayPalService {
    @org.springframework.beans.factory.annotation.Autowired
    private ActivityPaymentService activityPayments;

    private final APIContext apiContext;
    private final SoutienFinancierRepository soutienRepo;
    private final UserRepository userRepository;
    private final ActiviteRepository activiteRepository;
    private final ProjetRepository projetRepository;

    @Value("${paypal.return-url}")
    private String returnUrl;

    @Value("${paypal.cancel-url}")
    private String cancelUrl;

    public PayPalService(APIContext apiContext,
                         SoutienFinancierRepository soutienRepo,
                         UserRepository userRepository,
                         ActiviteRepository activiteRepository,
                         ProjetRepository projetRepository) {
        this.apiContext = apiContext;
        this.soutienRepo = soutienRepo;
        this.userRepository = userRepository;
        this.activiteRepository = activiteRepository;
        this.projetRepository = projetRepository;
    }

    // ─── Créer un paiement PayPal ─────────────────────────────────────────────

    @org.springframework.transaction.annotation.Transactional(rollbackFor = Exception.class)
    public PaiementResponse creerPaiement(PaiementRequest request) throws PayPalRESTException {

        // Récupérer l'utilisateur connecté
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User donateur = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        Activite activite = null;
        Inscription registration = null;
        Projet projet = null;
        verifierCibleUnique(request);
        if (request.getActiviteId() != null) {
            return creerPaiementActivite(request, donateur);
        } else {
            projet = projetRepository.findById(request.getProjetId())
                    .orElseThrow(() -> new RuntimeException("Projet non trouvé"));
            verifierProjetPayable(projet);
        }

        // Montant formaté (2 décimales)
        String montantStr = request.getMontant()
                .setScale(2, RoundingMode.HALF_UP)
                .toPlainString();

        // ── Construire l'objet PayPal ──────────────────────────────────────────

        Amount amount = new Amount();
        amount.setCurrency("EUR");
        amount.setTotal(montantStr);

        Transaction transaction = new Transaction();
        transaction.setDescription("Soutien financier BX-CONNECT");
        transaction.setAmount(amount);

        List<Transaction> transactions = new ArrayList<>();
        transactions.add(transaction);

        Payer payer = new Payer();
        payer.setPaymentMethod("paypal");

        RedirectUrls redirectUrls = new RedirectUrls();
        redirectUrls.setReturnUrl(returnUrl);
        redirectUrls.setCancelUrl(cancelUrl);

        Payment payment = new Payment();
        payment.setIntent("sale");
        payment.setPayer(payer);
        payment.setTransactions(transactions);
        payment.setRedirectUrls(redirectUrls);

        // ── Appel API PayPal ───────────────────────────────────────────────────
        Payment createdPayment = creerPaiementExterne(payment);

        // ── Trouver l'URL d'approbation ────────────────────────────────────────
        String approvalUrl = createdPayment.getLinks().stream()
                .filter(link -> "approval_url".equals(link.getRel()))
                .findFirst()
                .map(Links::getHref)
                .orElseThrow(() -> new RuntimeException("URL d'approbation PayPal introuvable"));

        // ── Sauvegarder en base ────────────────────────────────────────────────
        SoutienFinancier soutien = new SoutienFinancier();
        soutien.setMontant(request.getMontant());
        soutien.setInscription(registration);
        soutien.setStatutPaiement(StatutPaiement.EN_ATTENTE);
        soutien.setPaypalPaymentId(createdPayment.getId());
        soutien.setApprovalUrl(approvalUrl);
        soutien.setDonateur(donateur);

        if (activite != null) {
            soutien.setActivite(activite);
        }
        if (projet != null) {
            soutien.setProjet(projet);
        }

        SoutienFinancier saved = soutienRepo.save(soutien);
        return PaiementResponse.fromEntity(saved);
    }

    private PaiementResponse creerPaiementActivite(PaiementRequest request, User user) throws PayPalRESTException {
        var attempt = activityPayments.prepare(request.getActiviteId(), user, request.getMontant(), "PAYPAL");
        if (attempt.getApprovalUrl() != null) return PaiementResponse.fromEntity(attempt);
        Transaction transaction = new Transaction();
        transaction.setDescription("BX-Connect — Activité " + request.getActiviteId());
        transaction.setAmount(new Amount().setCurrency("EUR").setTotal(attempt.getMontant().setScale(2).toPlainString()));
        var payment = new Payment().setIntent("sale").setPayer(new Payer().setPaymentMethod("paypal"))
                .setTransactions(List.of(transaction))
                .setRedirectUrls(new RedirectUrls().setReturnUrl(activityReturnUrl).setCancelUrl(activityCancelUrl));
        var created = creerPaiementActiviteExterne(payment, attempt.getActivityRequestKey());
        String url = created.getLinks().stream().filter(link -> "approval_url".equals(link.getRel()))
                .map(Links::getHref).findFirst().orElseThrow();
        return PaiementResponse.fromEntity(activityPayments.attach(request.getActiviteId(), attempt.getId(), created.getId(), url, "PAYPAL"));
    }

    @Value("${paypal.activity-return-url:http://localhost:5173/paiement/succes}")
    private String activityReturnUrl;
    @Value("${paypal.activity-cancel-url:http://localhost:5173/paiement/annule}")
    private String activityCancelUrl;

    private APIContext activityContext(String key) {
        var context = new APIContext(apiContext.getClientID(), apiContext.getClientSecret(), apiContext.getConfiguration("mode"));
        context.setRequestId(key);
        return context;
    }
    Payment creerPaiementActiviteExterne(Payment payment, String key) throws PayPalRESTException {
        return payment.create(activityContext(key));
    }
    Payment lirePaiementExterne(String id) throws PayPalRESTException { return Payment.get(apiContext, id); }
    Payment executerPaiementExterne(Payment payment, PaymentExecution execution, String key) throws PayPalRESTException {
        return payment.execute(activityContext(key), execution);
    }

    // ─── Confirmer un paiement PayPal ─────────────────────────────────────────

    @Transactional(rollbackFor = Exception.class)
    public PaiementResponse confirmerPaiement(String paymentId, String payerId) throws PayPalRESTException {

        SoutienFinancier soutien = soutienRepo.findByPaypalPaymentId(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Paiement introuvable."));
        if (soutien.getActivite() != null) {
            soutien = activityPayments.lockedPayment(soutien);
            activityPayments.owner(soutien);
            if (soutien.getStatutPaiement() == StatutPaiement.PAYE) return PaiementResponse.fromEntity(soutien);
            if (soutien.getStatutPaiement() != StatutPaiement.EN_ATTENTE)
                throw new IllegalArgumentException("Ce paiement n'est plus disponible.");
            var remote = lirePaiementExterne(paymentId);
            if (paiementTermine(remote)) {
                verifierMontant(soutien, remote);
                activityPayments.complete(soutien, true);
                return PaiementResponse.fromEntity(soutien);
            }
            if ("approved".equals(remote.getState())) return PaiementResponse.fromEntity(soutien);
            activityPayments.check(soutien.getActivite(), soutien.getDonateur());
        }

        // Exécuter le paiement PayPal
        Payment payment = new Payment();
        payment.setId(paymentId);

        PaymentExecution execution = new PaymentExecution();
        execution.setPayerId(payerId);

        Payment executedPayment = soutien.getActivite() == null ? payment.execute(apiContext, execution)
                : executerPaiementExterne(payment, execution, soutien.getActivityRequestKey().substring(0, 32) + "-pay");

        // Mettre à jour en base


        if (soutien.getActivite() != null) {
            boolean paid = paiementTermine(executedPayment);
            if (paid && (executedPayment.getTransactions().size() != 1
                    || !"EUR".equals(executedPayment.getTransactions().get(0).getAmount().getCurrency())
                    || soutien.getMontant().compareTo(new BigDecimal(executedPayment.getTransactions().get(0).getAmount().getTotal())) != 0))
                throw new IllegalArgumentException("Montant du paiement invalide.");
            // Pending provider settlement is not a confirmed registration.
            if (paid) activityPayments.complete(soutien, true);
            return PaiementResponse.fromEntity(soutien);
        }
        if ("approved".equals(executedPayment.getState())) {
            soutien.setStatutPaiement(StatutPaiement.PAYE);
            soutien.setPaypalPayerId(payerId);
            soutien.setTransactionId(executedPayment.getTransactions().get(0)
                    .getRelatedResources().get(0).getSale().getId());
            soutien.setDatePaiement(LocalDateTime.now());
        } else {
            soutien.setStatutPaiement(StatutPaiement.ECHOUE);
        }

        SoutienFinancier saved = soutienRepo.save(soutien);
        return PaiementResponse.fromEntity(saved);
    }

    // ─── Annuler un paiement ──────────────────────────────────────────────────

    @Transactional
    public PaiementResponse annulerPaiement(String paymentId) throws PayPalRESTException {
        SoutienFinancier soutien = soutienRepo.findByPaypalPaymentId(paymentId)
                .orElseThrow(() -> new RuntimeException("Soutien financier non trouvé"));

        if (soutien.getActivite() != null) {
            soutien = activityPayments.lockedPayment(soutien);
            activityPayments.owner(soutien);
            var remote = lirePaiementExterne(paymentId);
            if (paiementTermine(remote)) {
                verifierMontant(soutien, remote);
                activityPayments.complete(soutien, true);
            } else if ("created".equals(remote.getState()) || "failed".equals(remote.getState()) || "canceled".equals(remote.getState())) {
                activityPayments.complete(soutien, false);
            } else throw new IllegalArgumentException("Le paiement est encore en cours de vérification.");
            return PaiementResponse.fromEntity(soutien);
        }
        soutien.setStatutPaiement(StatutPaiement.ANNULE);
        SoutienFinancier saved = soutienRepo.save(soutien);
        return PaiementResponse.fromEntity(saved);
    }

    // ─── Historique des soutiens de l'utilisateur connecté ───────────────────

    public List<PaiementResponse> mesSoutiens() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User donateur = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        return soutienRepo.findByDonateurId(donateur.getId())
                .stream()
                .map(PaiementResponse::fromEntity)
                .toList();
    }

    // ─── Soutiens d'une activité (admin/référent) ─────────────────────────────

    @Transactional(readOnly = true)
    public List<PaiementResponse> soutiensParActivite(Long activiteId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        Activite activite = activiteRepository.findById(activiteId)
                .orElseThrow(() -> new RuntimeException("Activité introuvable"));
        if (!ActiviteLecture.gestion(activite, user)) {
            throw new RuntimeException("Activité introuvable");
        }
        return soutienRepo.findByActiviteId(activiteId)
                .stream()
                .map(PaiementResponse::fromEntity)
                .toList();
    }

    Payment creerPaiementExterne(Payment payment) throws PayPalRESTException {
        return payment.create(apiContext);
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

    private boolean paiementTermine(Payment payment) {
        return "approved".equals(payment.getState()) && payment.getTransactions() != null
                && payment.getTransactions().size() == 1
                && payment.getTransactions().get(0).getRelatedResources() != null
                && payment.getTransactions().get(0).getRelatedResources().stream()
                    .anyMatch(r -> r.getSale() != null && "completed".equals(r.getSale().getState()));
    }
    private void verifierMontant(SoutienFinancier payment, Payment remote) {
        var amount = remote.getTransactions().get(0).getAmount();
        if (!"EUR".equals(amount.getCurrency()) || payment.getMontant().compareTo(new BigDecimal(amount.getTotal())) != 0)
            throw new IllegalArgumentException("Montant du paiement invalide.");
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
