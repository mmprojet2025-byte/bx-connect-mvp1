package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.InscriptionRequest;
import com.bxjeunes.bx_connect.dto.InscriptionResponse;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class InscriptionService {

    private final InscriptionRepository inscriptionRepository;
    private final ActiviteRepository activiteRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public InscriptionService(InscriptionRepository inscriptionRepository,
                               ActiviteRepository activiteRepository,
                               UserRepository userRepository,
                               NotificationService notificationService) {
        this.inscriptionRepository = inscriptionRepository;
        this.activiteRepository = activiteRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    // ─── S'inscrire à une activité (M06 CDC) ────────────────────────────────

    public InscriptionResponse inscrire(InscriptionRequest request, String emailMembre) {

        // 1. Récupérer le membre
        User membre = userRepository.findByEmail(emailMembre)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + emailMembre));

        // 2. Récupérer l'activité
        Activite activite = activiteRepository.findById(request.getActiviteId())
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + request.getActiviteId()));

        // 3. Vérifier que l'activité est publiée
        if (activite.getStatut() != StatutActivite.PUBLIEE) {
            throw new RuntimeException("Cette activité n'est pas disponible à l'inscription.");
        }

        // 4. Vérifier que le membre n'est pas déjà inscrit
        inscriptionRepository.findByMembreIdAndActiviteId(membre.getId(), activite.getId())
                .ifPresent(i -> {
                    if (i.getStatut() != StatutInscription.ANNULEE) {
                        throw new RuntimeException("Vous êtes déjà inscrit à cette activité.");
                    }
                });

        // 5. Vérifier la capacité maximale (si limitée)
        if (activite.getCapaciteMax() > 0) {
            long nbInscrits = inscriptionRepository.countByActiviteIdAndStatutIn(
                    activite.getId(),
                    List.of(StatutInscription.CONFIRMEE, StatutInscription.PAYEE)
            );
            if (nbInscrits >= activite.getCapaciteMax()) {
                throw new RuntimeException("Cette activité est complète (capacité maximale atteinte).");
            }
        }

        // 6. Créer l'inscription
        Inscription inscription = new Inscription();
        inscription.setMembre(membre);
        inscription.setActivite(activite);

        // Activité gratuite → CONFIRMEE directement
        // Activité payante → EN_ATTENTE_PAIEMENT (PayPal à venir)
        if (activite.isGratuite()) {
            inscription.setStatut(StatutInscription.CONFIRMEE);
        } else {
            inscription.setStatut(StatutInscription.EN_ATTENTE_PAIEMENT);
        }

        Inscription inscriptionSauvee = inscriptionRepository.save(inscription);
        if (inscriptionSauvee.getStatut() == StatutInscription.CONFIRMEE) {
            notificationService.creer(
                    membre,
                    "Inscription confirmée",
                    "Votre inscription à " + activite.getTitre() + " est confirmée.",
                    "INSCRIPTION_CONFIRMEE",
                    "/activites/" + activite.getId()
            );
        }

        return InscriptionResponse.fromEntity(inscriptionSauvee);
    }

    // ─── Annuler son inscription (M12 CDC) ──────────────────────────────────

    public InscriptionResponse annuler(Long inscriptionId, String emailMembre) {
        Inscription inscription = inscriptionRepository.findById(inscriptionId)
                .orElseThrow(() -> new RuntimeException("Inscription introuvable : " + inscriptionId));

        // Vérifier que c'est bien l'inscription du membre connecté
        if (!inscription.getMembre().getEmail().equals(emailMembre)) {
            throw new RuntimeException("Vous n'êtes pas autorisé à annuler cette inscription.");
        }

        if (inscription.getStatut() == StatutInscription.ANNULEE) {
            throw new RuntimeException("Cette inscription est déjà annulée.");
        }

        inscription.setStatut(StatutInscription.ANNULEE);
        inscription.setDateAnnulation(LocalDateTime.now());

        return InscriptionResponse.fromEntity(inscriptionRepository.save(inscription));
    }

    // ─── Consulter ses inscriptions (M11 CDC) ───────────────────────────────

    public List<InscriptionResponse> mesInscriptions(String emailMembre) {
        User membre = userRepository.findByEmail(emailMembre)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + emailMembre));

        return inscriptionRepository
                .findByMembreIdAndStatutNot(membre.getId(), StatutInscription.ANNULEE)
                .stream()
                .map(InscriptionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Consulter toutes les inscriptions d'une activité (R07 / admin) ─────

    public List<InscriptionResponse> inscriptionsParActivite(Long activiteId, String emailUtilisateur) {
        User utilisateur = userRepository.findByEmail(emailUtilisateur)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + emailUtilisateur));
        Activite activite = activiteRepository.findById(activiteId)
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + activiteId));

        if (utilisateur.getRole() == Role.REFERENT &&
                (activite.getCreateur() == null ||
                        !activite.getCreateur().getId().equals(utilisateur.getId()))) {
            throw new AccessDeniedException("Vous ne pouvez consulter que les inscriptions de vos propres activites.");
        }
        if (utilisateur.getRole() != Role.ADMIN && utilisateur.getRole() != Role.REFERENT) {
            throw new AccessDeniedException("Acces reserve aux ADMIN et REFERENTS.");
        }

        return inscriptionRepository.findByActiviteId(activiteId)
                .stream()
                .map(InscriptionResponse::fromEntity)
                .collect(Collectors.toList());
    }
}
