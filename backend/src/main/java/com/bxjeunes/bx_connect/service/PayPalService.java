package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.PaiementRequest;
import com.bxjeunes.bx_connect.dto.PaiementResponse;
import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.SoutienFinancier;
import com.bxjeunes.bx_connect.entity.StatutPaiement;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.SoutienFinancierRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.paypal.api.payments.*;
import com.paypal.base.rest.APIContext;
import com.paypal.base.rest.PayPalRESTException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class PayPalService {

    private final APIContext apiContext;
    private final SoutienFinancierRepository soutienRepo;
    private final UserRepository userRepository;
    private final ActiviteRepository activiteRepository;

    @Value("${paypal.return-url}")
    private String returnUrl;

    @Value("${paypal.cancel-url}")
    private String cancelUrl;

    public PayPalService(APIContext apiContext,
                         SoutienFinancierRepository soutienRepo,
                         UserRepository userRepository,
                         ActiviteRepository activiteRepository) {
        this.apiContext = apiContext;
        this.soutienRepo = soutienRepo;
        this.userRepository = userRepository;
        this.activiteRepository = activiteRepository;
    }

    // ─── Créer un paiement PayPal ─────────────────────────────────────────────

    public PaiementResponse creerPaiement(PaiementRequest request) throws PayPalRESTException {

        // Récupérer l'utilisateur connecté
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User donateur = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

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
        Payment createdPayment = payment.create(apiContext);

        // ── Trouver l'URL d'approbation ────────────────────────────────────────
        String approvalUrl = createdPayment.getLinks().stream()
                .filter(link -> "approval_url".equals(link.getRel()))
                .findFirst()
                .map(Links::getHref)
                .orElseThrow(() -> new RuntimeException("URL d'approbation PayPal introuvable"));

        // ── Sauvegarder en base ────────────────────────────────────────────────
        SoutienFinancier soutien = new SoutienFinancier();
        soutien.setMontant(request.getMontant());
        soutien.setStatutPaiement(StatutPaiement.EN_ATTENTE);
        soutien.setPaypalPaymentId(createdPayment.getId());
        soutien.setApprovalUrl(approvalUrl);
        soutien.setDonateur(donateur);

        // Lier à une activité si fournie
        if (request.getActiviteId() != null) {
            Activite activite = activiteRepository.findById(request.getActiviteId())
                    .orElseThrow(() -> new RuntimeException("Activité non trouvée"));
            soutien.setActivite(activite);
        }

        SoutienFinancier saved = soutienRepo.save(soutien);
        return PaiementResponse.fromEntity(saved);
    }

    // ─── Confirmer un paiement PayPal ─────────────────────────────────────────

    public PaiementResponse confirmerPaiement(String paymentId, String payerId) throws PayPalRESTException {

        // Exécuter le paiement PayPal
        Payment payment = new Payment();
        payment.setId(paymentId);

        PaymentExecution execution = new PaymentExecution();
        execution.setPayerId(payerId);

        Payment executedPayment = payment.execute(apiContext, execution);

        // Mettre à jour en base
        SoutienFinancier soutien = soutienRepo.findByPaypalPaymentId(paymentId)
                .orElseThrow(() -> new RuntimeException("Soutien financier non trouvé pour ce paiement"));

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

    public PaiementResponse annulerPaiement(String paymentId) {
        SoutienFinancier soutien = soutienRepo.findByPaypalPaymentId(paymentId)
                .orElseThrow(() -> new RuntimeException("Soutien financier non trouvé"));

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

    public List<PaiementResponse> soutiensParActivite(Long activiteId) {
        return soutienRepo.findByActiviteId(activiteId)
                .stream()
                .map(PaiementResponse::fromEntity)
                .toList();
    }
}