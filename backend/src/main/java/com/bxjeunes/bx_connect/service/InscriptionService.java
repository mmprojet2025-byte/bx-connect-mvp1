package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.InscriptionRequest;
import com.bxjeunes.bx_connect.dto.InscriptionResponse;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class InscriptionService {

    private static final Logger log = LoggerFactory.getLogger(InscriptionService.class);
    private static final String TARGET_ACTIVITY = "ACTIVITY";

    private final InscriptionRepository inscriptionRepository;
    private final ActiviteRepository activiteRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    public InscriptionService(InscriptionRepository inscriptionRepository,
                               ActiviteRepository activiteRepository,
                               UserRepository userRepository,
                               NotificationService notificationService,
                               AuditLogService auditLogService) {
        this.inscriptionRepository = inscriptionRepository;
        this.activiteRepository = activiteRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
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
        boolean dejaInscrit = inscriptionRepository
                .findByMembreIdAndActiviteIdOrderByDateInscriptionDesc(membre.getId(), activite.getId())
                .stream()
                .anyMatch(i -> i.getStatut() != StatutInscription.ANNULEE);
        if (dejaInscrit) {
            throw new RuntimeException("Vous êtes déjà inscrit à cette activité.");
        }

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
        auditerStatut(
                membre,
                "ACTIVITY_REGISTRATION_CREATED",
                inscriptionSauvee,
                null,
                nomStatut(inscriptionSauvee.getStatut()),
                "Inscription activite creee.");

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

        StatutInscription ancienStatut = inscription.getStatut();
        inscription.setStatut(StatutInscription.ANNULEE);
        inscription.setDateAnnulation(LocalDateTime.now());

        Inscription inscriptionSauvee = inscriptionRepository.save(inscription);
        auditerStatut(
                inscriptionSauvee.getMembre(),
                "ACTIVITY_REGISTRATION_CANCELLED",
                inscriptionSauvee,
                nomStatut(ancienStatut),
                nomStatut(inscriptionSauvee.getStatut()),
                "Inscription activite annulee.");
        return InscriptionResponse.fromEntity(inscriptionSauvee);
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

    private void auditerStatut(
            User acteur,
            String action,
            Inscription inscription,
            String ancienStatut,
            String nouveauStatut,
            String details) {
        Activite activite = inscription.getActivite();
        try {
            auditLogService.logStatusChange(
                    acteur,
                    action,
                    TARGET_ACTIVITY,
                    activite != null ? activite.getId() : null,
                    activite != null ? activite.getTitre() : null,
                    ancienStatut,
                    nouveauStatut,
                    details,
                    metadataJson(inscription));
        } catch (RuntimeException ex) {
            log.warn(
                    "Audit inscription impossible pour l'action {} sur l'inscription {}",
                    action,
                    inscription.getId(),
                    ex);
        }
    }

    private String nomStatut(StatutInscription statut) {
        return statut == null ? null : statut.name();
    }

    private String metadataJson(Inscription inscription) {
        List<String> entries = new ArrayList<>();
        if (inscription.getId() != null) {
            entries.add("\"inscriptionId\":" + inscription.getId());
        }
        Activite activite = inscription.getActivite();
        if (activite != null) {
            ajouterJson(entries, "dateDebut", activite.getDateDebut());
            ajouterJson(entries, "commune", activite.getCommune());
            ajouterJson(entries, "latitude", activite.getLatitude());
            ajouterJson(entries, "longitude", activite.getLongitude());
        }
        return "{" + String.join(",", entries) + "}";
    }

    private void ajouterJson(List<String> entries, String key, Object value) {
        if (value != null) {
            entries.add("\"" + key + "\":\"" + escapeJson(value.toString()) + "\"");
        }
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
