package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.ActiviteFiltreRequest;
import com.bxjeunes.bx_connect.dto.ActiviteRequest;
import com.bxjeunes.bx_connect.dto.ActiviteResponse;
import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.Inscription;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import com.bxjeunes.bx_connect.entity.StatutInscription;
import com.bxjeunes.bx_connect.entity.User;
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
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ActiviteService {

    private static final Logger log = LoggerFactory.getLogger(ActiviteService.class);
    private static final String TARGET_ACTIVITY = "ACTIVITY";

    private final ActiviteRepository activiteRepository;
    private final UserRepository userRepository;
    private final InscriptionRepository inscriptionRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    public ActiviteService(ActiviteRepository activiteRepository,
                           UserRepository userRepository,
                           InscriptionRepository inscriptionRepository,
                           NotificationService notificationService,
                           AuditLogService auditLogService) {
        this.activiteRepository = activiteRepository;
        this.userRepository = userRepository;
        this.inscriptionRepository = inscriptionRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
    }

    // ─── Créer une activité ───────────────────────────────────────────────────
    public ActiviteResponse creer(ActiviteRequest request, String emailCreateur) {
        User createur = userRepository.findByEmail(emailCreateur)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + emailCreateur));

        Activite activite = new Activite();
        activite.setTitre(request.getTitre());
        activite.setDescription(request.getDescription());
        activite.setDateDebut(request.getDateDebut());
        activite.setDateFin(request.getDateFin());
        appliquerLocalisation(activite, request);
        activite.setGratuite(request.isGratuite());
        activite.setPrix(request.getPrix());
        activite.setCapaciteMax(request.getCapaciteMax());
        activite.setCategorie(request.getCategorie());
        activite.setTheme(request.getTheme());
        activite.setStatut(StatutActivite.BROUILLON);
        activite.setCreateur(createur);

        Activite activiteSauvee = activiteRepository.save(activite);
        auditerStatut(
                createur,
                "ACTIVITY_CREATED",
                activiteSauvee,
                null,
                nomStatut(activiteSauvee.getStatut()),
                "Activite creee.");
        return toResponse(activiteSauvee);
    }

    // ─── Lister activités publiées (public) ───────────────────────────────────
    public List<ActiviteResponse> listerPubliees(String emailUtilisateur) {
        return activiteRepository.findByStatut(StatutActivite.PUBLIEE)
                .stream()
                .map(activite -> toResponse(activite, emailUtilisateur))
                .collect(Collectors.toList());
    }

    // ─── Lister toutes les activités (admin/référent) ─────────────────────────
    public List<ActiviteResponse> listerToutes() {
        return activiteRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── Détail d'une activité (V04) ──────────────────────────────────────────
    public ActiviteResponse getById(Long id, String emailUtilisateur) {
        Activite activite = activiteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + id));

        if (emailUtilisateur == null) {
            if (activite.getStatut() != StatutActivite.PUBLIEE) {
                throw new RuntimeException("Activité introuvable : " + id);
            }
            return toResponse(activite, null);
        }

        User utilisateur = userRepository.findByEmail(emailUtilisateur)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + emailUtilisateur));

        if (utilisateur.getRole() == Role.ADMIN) {
            return toResponse(activite, emailUtilisateur);
        }

        if (utilisateur.getRole() == Role.REFERENT) {
            if (activite.getCreateur() != null &&
                    activite.getCreateur().getId().equals(utilisateur.getId())) {
                return toResponse(activite, emailUtilisateur);
            }
            throw new AccessDeniedException("Vous ne pouvez consulter que vos propres activites.");
        }

        if (activite.getStatut() != StatutActivite.PUBLIEE) {
            throw new RuntimeException("Activité introuvable : " + id);
        }
        return toResponse(activite, emailUtilisateur);
    }

    // ─── Recherche par mot-clé (V06 / M16) ───────────────────────────────────
    public List<ActiviteResponse> rechercher(String motCle, String emailUtilisateur) {
        return activiteRepository
                .rechercherMultiChamps(StatutActivite.PUBLIEE, motCle)
                .stream()
                .map(activite -> toResponse(activite, emailUtilisateur))
                .collect(Collectors.toList());
    }

    // ─── Filtres avancés (V03) ────────────────────────────────────────────────
    public List<ActiviteResponse> filtrer(ActiviteFiltreRequest filtre, String emailUtilisateur) {
        List<Activite> resultats;

        // Recherche mot-clé multi-champs
        if (filtre.getQ() != null && !filtre.getQ().isBlank()) {
            resultats = activiteRepository.rechercherMultiChamps(
                StatutActivite.PUBLIEE, filtre.getQ().trim()
            );
        }
        // Filtre par date
        else if (filtre.getDateDebut() != null && filtre.getDateFin() != null) {
            resultats = activiteRepository.findByStatutAndDateDebutBetween(
                StatutActivite.PUBLIEE,
                filtre.getDateDebut(),
                filtre.getDateFin()
            );
        }
        // Filtre catégorie + thème
        else if (filtre.getCategorie() != null && filtre.getTheme() != null) {
            resultats = activiteRepository.findByStatutAndCategorieAndTheme(
                StatutActivite.PUBLIEE,
                filtre.getCategorie(),
                filtre.getTheme()
            );
        }
        // Filtre catégorie seule
        else if (filtre.getCategorie() != null) {
            resultats = activiteRepository.findByStatutAndCategorie(
                StatutActivite.PUBLIEE, filtre.getCategorie()
            );
        }
        // Filtre thème seul
        else if (filtre.getTheme() != null) {
            resultats = activiteRepository.findByStatutAndTheme(
                StatutActivite.PUBLIEE, filtre.getTheme()
            );
        }
        // Filtre lieu
        else if (filtre.getLieu() != null && !filtre.getLieu().isBlank()) {
            resultats = activiteRepository.findByStatutAndLieuContainingIgnoreCase(
                StatutActivite.PUBLIEE, filtre.getLieu()
            );
        }
        // Filtre gratuit/payant
        else if (filtre.getGratuite() != null) {
            resultats = activiteRepository.findByStatutAndGratuite(
                StatutActivite.PUBLIEE, filtre.getGratuite()
            );
        }
        // Aucun filtre → toutes les publiées
        else {
            resultats = activiteRepository.findByStatut(StatutActivite.PUBLIEE);
        }

        return resultats.stream()
                .map(activite -> toResponse(activite, emailUtilisateur))
                .collect(Collectors.toList());
    }

    // ─── Options de filtres (catégories, thèmes, lieux disponibles) ──────────
    public Map<String, List<String>> getOptionsFiltre() {
        return Map.of(
            "categories", activiteRepository.findDistinctCategories(),
            "themes",     activiteRepository.findDistinctThemes(),
            "lieux",      activiteRepository.findDistinctLieux()
        );
    }

    // ─── Activités du référent ────────────────────────────────────────────────
    public List<ActiviteResponse> mesActivites(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + email));
        return activiteRepository.findByCreateurId(user.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── Modifier une activité ────────────────────────────────────────────────
    public ActiviteResponse modifier(Long id, ActiviteRequest request, String emailUser) {
        Activite activite = activiteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + id));
        User acteur = verifierDroitGestion(activite, emailUser);

        activite.setTitre(request.getTitre());
        activite.setDescription(request.getDescription());
        activite.setDateDebut(request.getDateDebut());
        activite.setDateFin(request.getDateFin());
        appliquerLocalisation(activite, request);
        activite.setGratuite(request.isGratuite());
        activite.setPrix(request.getPrix());
        activite.setCapaciteMax(request.getCapaciteMax());
        activite.setCategorie(request.getCategorie());
        activite.setTheme(request.getTheme());

        Activite activiteSauvee = activiteRepository.save(activite);
        auditerAction(acteur, "ACTIVITY_UPDATED", activiteSauvee, "Activite modifiee.");
        return toResponse(activiteSauvee);
    }

    // ─── Changer le statut ────────────────────────────────────────────────────
    public ActiviteResponse changerStatut(Long id, StatutActivite nouveauStatut, String emailUser) {
        Activite activite = activiteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + id));
        User acteur = verifierDroitGestion(activite, emailUser);
        StatutActivite ancienStatut = activite.getStatut();
        activite.setStatut(nouveauStatut);
        Activite activiteSauvee = activiteRepository.save(activite);

        if (ancienStatut != StatutActivite.PUBLIEE && nouveauStatut == StatutActivite.PUBLIEE) {
            notifierPublication(activiteSauvee);
        }
        auditerStatut(
                acteur,
                ancienStatut != StatutActivite.PUBLIEE && nouveauStatut == StatutActivite.PUBLIEE
                        ? "ACTIVITY_PUBLISHED"
                        : "ACTIVITY_STATUS_CHANGED",
                activiteSauvee,
                nomStatut(ancienStatut),
                nomStatut(nouveauStatut),
                "Statut activite modifie.");

        return toResponse(activiteSauvee);
    }

    // ─── Supprimer une activité ───────────────────────────────────────────────
    public void supprimer(Long id, String emailUser) {
        Activite activite = activiteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + id));
        User acteur = verifierDroitGestion(activite, emailUser);
        activiteRepository.delete(activite);
        auditerAction(acteur, "ACTIVITY_DELETED", activite, "Activite supprimee.");
    }

    private User verifierDroitGestion(Activite activite, String emailUser) {
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + emailUser));
        if (user.getRole() == Role.ADMIN) {
            return user;
        }
        if (user.getRole() == Role.REFERENT &&
                activite.getCreateur() != null &&
                activite.getCreateur().getId().equals(user.getId())) {
            return user;
        }
        throw new AccessDeniedException("Vous ne pouvez gerer que vos propres activites.");
    }

    private void appliquerLocalisation(Activite activite, ActiviteRequest request) {
        activite.setLieu(request.getLieu());
        activite.setAdresse(request.getAdresse());
        activite.setCommune(request.getCommune());
        activite.setLatitude(request.getLatitude());
        activite.setLongitude(request.getLongitude());
    }

    private void notifierPublication(Activite activite) {
        for (User membre : userRepository.findByRoleAndActifTrue(Role.MEMBRE)) {
            notificationService.creer(
                    membre,
                    "Nouvelle activité publiée",
                    activite.getTitre() + " est maintenant disponible.",
                    "ACTIVITE_PUBLIEE",
                    "/activites/" + activite.getId()
            );
        }
    }

    private void auditerAction(User acteur, String action, Activite activite, String details) {
        try {
            auditLogService.logAction(
                    acteur,
                    action,
                    TARGET_ACTIVITY,
                    activite.getId(),
                    activite.getTitre(),
                    null,
                    details,
                    metadataJson(activite));
        } catch (RuntimeException ex) {
            log.warn("Audit activite impossible pour l'action {} sur l'activite {}", action, activite.getId(), ex);
        }
    }

    private void auditerStatut(
            User acteur,
            String action,
            Activite activite,
            String ancienStatut,
            String nouveauStatut,
            String details) {
        try {
            auditLogService.logStatusChange(
                    acteur,
                    action,
                    TARGET_ACTIVITY,
                    activite.getId(),
                    activite.getTitre(),
                    ancienStatut,
                    nouveauStatut,
                    details,
                    metadataJson(activite));
        } catch (RuntimeException ex) {
            log.warn("Audit activite impossible pour l'action {} sur l'activite {}", action, activite.getId(), ex);
        }
    }

    private String nomStatut(StatutActivite statut) {
        return statut == null ? null : statut.name();
    }

    private String metadataJson(Activite activite) {
        List<String> entries = new ArrayList<>();
        ajouterJson(entries, "dateDebut", activite.getDateDebut());
        ajouterJson(entries, "commune", activite.getCommune());
        ajouterJson(entries, "latitude", activite.getLatitude());
        ajouterJson(entries, "longitude", activite.getLongitude());
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

    private ActiviteResponse toResponse(Activite activite) {
        int nombreInscrits = (int) inscriptionRepository.countByActiviteIdAndStatutIn(
                activite.getId(),
                List.of(StatutInscription.CONFIRMEE, StatutInscription.PAYEE)
        );
        return ActiviteResponse.fromEntity(activite, nombreInscrits);
    }

    private ActiviteResponse toResponse(Activite activite, String emailUtilisateur) {
        ActiviteResponse response = toResponse(activite);
        enrichirEtatInscription(response, activite, emailUtilisateur);
        return response;
    }

    private void enrichirEtatInscription(ActiviteResponse response, Activite activite, String emailUtilisateur) {
        User utilisateur = null;
        if (emailUtilisateur != null) {
            utilisateur = userRepository.findByEmail(emailUtilisateur).orElse(null);
        }

        Inscription inscriptionActive = null;
        if (utilisateur != null && utilisateur.getRole() == Role.MEMBRE) {
            inscriptionActive = inscriptionRepository
                    .findByMembreIdAndActiviteIdOrderByDateInscriptionDesc(utilisateur.getId(), activite.getId())
                    .stream()
                    .filter(inscription -> inscription.getStatut() != StatutInscription.ANNULEE)
                    .findFirst()
                    .orElse(null);
        }

        if (inscriptionActive != null) {
            response.setInscrit(true);
            response.setInscriptionId(inscriptionActive.getId());
            response.setStatutInscription(inscriptionActive.getStatut());
            response.setPeutSInscrire(false);
            response.setRaisonIndisponible("DEJA_INSCRIT");
            return;
        }

        String raison = raisonInscriptionIndisponible(activite, utilisateur);
        response.setInscrit(false);
        response.setPeutSInscrire(raison == null);
        response.setRaisonIndisponible(raison);
    }

    private String raisonInscriptionIndisponible(Activite activite, User utilisateur) {
        if (utilisateur != null && utilisateur.getRole() != Role.MEMBRE) {
            return "ROLE_NON_MEMBRE";
        }
        if (activite.getStatut() == StatutActivite.ANNULEE) {
            return "ANNULEE";
        }
        if (activite.getStatut() == StatutActivite.TERMINEE) {
            return "TERMINEE";
        }
        if (activite.getStatut() != StatutActivite.PUBLIEE) {
            return "NON_PUBLIEE";
        }
        LocalDateTime now = LocalDateTime.now();
        if (activite.getDateFin() != null && activite.getDateFin().isBefore(now)) {
            return "PASSEE";
        }
        if (activite.getDateFin() == null && activite.getDateDebut() != null && activite.getDateDebut().isBefore(now)) {
            return "PASSEE";
        }
        if (activite.getCapaciteMax() > 0 && responseComplete(activite)) {
            return "COMPLETE";
        }
        return null;
    }

    private boolean responseComplete(Activite activite) {
        long nbInscrits = inscriptionRepository.countByActiviteIdAndStatutIn(
                activite.getId(),
                List.of(StatutInscription.CONFIRMEE, StatutInscription.PAYEE)
        );
        return nbInscrits >= activite.getCapaciteMax();
    }
}
