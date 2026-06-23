package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.PresenceBulkRequest;
import com.bxjeunes.bx_connect.dto.PresenceRequest;
import com.bxjeunes.bx_connect.dto.PresenceResponse;
import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.Inscription;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutInscription;
import com.bxjeunes.bx_connect.entity.StatutPresence;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class PresenceService {

    private static final Logger log = LoggerFactory.getLogger(PresenceService.class);
    private static final String TARGET_ACTIVITY = "ACTIVITY";

    private final InscriptionRepository inscriptionRepository;
    private final ActiviteRepository activiteRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    public PresenceService(
            InscriptionRepository inscriptionRepository,
            ActiviteRepository activiteRepository,
            UserRepository userRepository,
            AuditLogService auditLogService) {
        this.inscriptionRepository = inscriptionRepository;
        this.activiteRepository = activiteRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<PresenceResponse> listerPresences(Long activiteId, String emailUtilisateur) {
        User utilisateur = utilisateur(emailUtilisateur);
        Activite activite = activite(activiteId);
        verifierAccesLecture(utilisateur, activite);

        return inscriptionRepository.findByActiviteId(activiteId)
                .stream()
                .map(PresenceResponse::fromEntity)
                .toList();
    }

    @Transactional
    public PresenceResponse modifierPresence(
            Long activiteId,
            Long inscriptionId,
            PresenceRequest request,
            String emailUtilisateur) {
        User utilisateur = utilisateur(emailUtilisateur);
        Activite activite = activite(activiteId);
        verifierAccesGestion(utilisateur, activite);

        Inscription inscription = inscriptionRepository.findByIdAndActiviteId(inscriptionId, activiteId)
                .orElseThrow(() -> new RuntimeException("Inscription introuvable pour cette activite : " + inscriptionId));

        appliquerPresence(inscription, request, utilisateur);
        Inscription sauvegardee = inscriptionRepository.save(inscription);
        return PresenceResponse.fromEntity(sauvegardee);
    }

    @Transactional
    public List<PresenceResponse> modifierPresencesBulk(
            Long activiteId,
            PresenceBulkRequest request,
            String emailUtilisateur) {
        User utilisateur = utilisateur(emailUtilisateur);
        Activite activite = activite(activiteId);
        verifierAccesGestion(utilisateur, activite);

        List<PresenceResponse> responses = new ArrayList<>();
        for (PresenceBulkRequest.PresenceBulkItemRequest item : request.getPresences()) {
            if (item.getInscriptionId() == null) {
                throw new RuntimeException("inscriptionId est obligatoire pour chaque presence.");
            }
            Inscription inscription = inscriptionRepository.findByIdAndActiviteId(item.getInscriptionId(), activiteId)
                    .orElseThrow(() -> new RuntimeException(
                            "Inscription introuvable pour cette activite : " + item.getInscriptionId()));
            appliquerPresence(inscription, item, utilisateur);
            responses.add(PresenceResponse.fromEntity(inscriptionRepository.save(inscription)));
        }
        return responses;
    }

    @Transactional
    public List<PresenceResponse> cloturerPresences(Long activiteId, String emailUtilisateur) {
        User utilisateur = utilisateur(emailUtilisateur);
        Activite activite = activite(activiteId);
        verifierAccesGestion(utilisateur, activite);

        LocalDateTime maintenant = LocalDateTime.now();
        List<Inscription> inscriptions = inscriptionRepository.findByActiviteId(activiteId);
        List<PresenceResponse> responses = inscriptions.stream()
                .filter(inscription -> inscription.getStatut() != StatutInscription.ANNULEE)
                .map(inscription -> {
                    inscription.setPresenceValideePar(utilisateur);
                    inscription.setDateValidationPresence(maintenant);
                    return PresenceResponse.fromEntity(inscriptionRepository.save(inscription));
                })
                .toList();

        auditerValidation(utilisateur, activite, inscriptions.size());
        return responses;
    }

    private void appliquerPresence(Inscription inscription, PresenceRequest request, User utilisateur) {
        if (inscription.getStatut() == StatutInscription.ANNULEE) {
            throw new RuntimeException("Impossible d'encoder la presence d'une inscription annulee.");
        }
        StatutPresence ancienStatut = inscription.getStatutPresence();
        inscription.setStatutPresence(request.getStatutPresence());
        inscription.setCommentairePresence(normaliserCommentaire(request.getCommentairePresence()));
        inscription.setPresenceEncodeePar(utilisateur);
        inscription.setDatePresence(LocalDateTime.now());
        inscription.setPresenceValideePar(null);
        inscription.setDateValidationPresence(null);

        auditerModification(utilisateur, inscription, ancienStatut, inscription.getStatutPresence());
    }

    private User utilisateur(String emailUtilisateur) {
        return userRepository.findByEmail(emailUtilisateur)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + emailUtilisateur));
    }

    private Activite activite(Long activiteId) {
        return activiteRepository.findById(activiteId)
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + activiteId));
    }

    private void verifierAccesLecture(User utilisateur, Activite activite) {
        if (utilisateur.getRole() == Role.SUPER_ADMIN || utilisateur.getRole() == Role.ADMIN) {
            return;
        }
        verifierAccesReferent(utilisateur, activite);
    }

    private void verifierAccesGestion(User utilisateur, Activite activite) {
        if (utilisateur.getRole() == Role.ADMIN) {
            return;
        }
        verifierAccesReferent(utilisateur, activite);
    }

    private void verifierAccesReferent(User utilisateur, Activite activite) {
        if (utilisateur.getRole() != Role.REFERENT) {
            throw new AccessDeniedException("Acces reserve aux ADMIN et REFERENTS.");
        }
        if (activite.getCreateur() == null || !activite.getCreateur().getId().equals(utilisateur.getId())) {
            throw new AccessDeniedException("Vous ne pouvez gerer que les presences de vos propres activites.");
        }
    }

    private String normaliserCommentaire(String commentaire) {
        if (commentaire == null || commentaire.isBlank()) {
            return null;
        }
        return commentaire.trim();
    }

    private void auditerModification(
            User acteur,
            Inscription inscription,
            StatutPresence ancienStatut,
            StatutPresence nouveauStatut) {
        Activite activite = inscription.getActivite();
        try {
            auditLogService.logStatusChange(
                    acteur,
                    "ACTIVITY_ATTENDANCE_UPDATED",
                    TARGET_ACTIVITY,
                    activite != null ? activite.getId() : null,
                    activite != null ? activite.getTitre() : null,
                    ancienStatut != null ? ancienStatut.name() : null,
                    nouveauStatut != null ? nouveauStatut.name() : null,
                    "Presence activite modifiee.",
                    metadataJson(inscription));
        } catch (RuntimeException ex) {
            log.warn("Audit presence impossible pour l'inscription {}", inscription.getId(), ex);
        }
    }

    private void auditerValidation(User acteur, Activite activite, int totalInscriptions) {
        try {
            auditLogService.logStatusChange(
                    acteur,
                    "ACTIVITY_ATTENDANCE_VALIDATED",
                    TARGET_ACTIVITY,
                    activite.getId(),
                    activite.getTitre(),
                    null,
                    "VALIDEE",
                    "Feuille de presence activite validee.",
                    "{\"totalInscriptions\":" + totalInscriptions + "}");
        } catch (RuntimeException ex) {
            log.warn("Audit validation presence impossible pour l'activite {}", activite.getId(), ex);
        }
    }

    private String metadataJson(Inscription inscription) {
        List<String> entries = new ArrayList<>();
        if (inscription.getId() != null) {
            entries.add("\"inscriptionId\":" + inscription.getId());
        }
        if (inscription.getMembre() != null && inscription.getMembre().getId() != null) {
            entries.add("\"membreId\":" + inscription.getMembre().getId());
        }
        if (inscription.getStatut() != null) {
            entries.add("\"statutInscription\":\"" + inscription.getStatut().name() + "\"");
        }
        return "{" + String.join(",", entries) + "}";
    }
}
