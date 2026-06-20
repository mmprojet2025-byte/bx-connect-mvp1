package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.ActiviteFiltreRequest;
import com.bxjeunes.bx_connect.dto.ActiviteRequest;
import com.bxjeunes.bx_connect.dto.ActiviteResponse;
import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import com.bxjeunes.bx_connect.entity.StatutInscription;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ActiviteService {

    private final ActiviteRepository activiteRepository;
    private final UserRepository userRepository;
    private final InscriptionRepository inscriptionRepository;
    private final NotificationService notificationService;

    public ActiviteService(ActiviteRepository activiteRepository,
                           UserRepository userRepository,
                           InscriptionRepository inscriptionRepository,
                           NotificationService notificationService) {
        this.activiteRepository = activiteRepository;
        this.userRepository = userRepository;
        this.inscriptionRepository = inscriptionRepository;
        this.notificationService = notificationService;
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

        return toResponse(activiteRepository.save(activite));
    }

    // ─── Lister activités publiées (public) ───────────────────────────────────
    public List<ActiviteResponse> listerPubliees() {
        return activiteRepository.findByStatut(StatutActivite.PUBLIEE)
                .stream()
                .map(this::toResponse)
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
            return toResponse(activite);
        }

        User utilisateur = userRepository.findByEmail(emailUtilisateur)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + emailUtilisateur));

        if (utilisateur.getRole() == Role.ADMIN) {
            return toResponse(activite);
        }

        if (utilisateur.getRole() == Role.REFERENT) {
            if (activite.getCreateur() != null &&
                    activite.getCreateur().getId().equals(utilisateur.getId())) {
                return toResponse(activite);
            }
            throw new AccessDeniedException("Vous ne pouvez consulter que vos propres activites.");
        }

        if (activite.getStatut() != StatutActivite.PUBLIEE) {
            throw new RuntimeException("Activité introuvable : " + id);
        }
        return toResponse(activite);
    }

    // ─── Recherche par mot-clé (V06 / M16) ───────────────────────────────────
    public List<ActiviteResponse> rechercher(String motCle) {
        return activiteRepository
                .rechercherMultiChamps(StatutActivite.PUBLIEE, motCle)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── Filtres avancés (V03) ────────────────────────────────────────────────
    public List<ActiviteResponse> filtrer(ActiviteFiltreRequest filtre) {
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
                .map(this::toResponse)
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
        verifierDroitGestion(activite, emailUser);

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

        return toResponse(activiteRepository.save(activite));
    }

    // ─── Changer le statut ────────────────────────────────────────────────────
    public ActiviteResponse changerStatut(Long id, StatutActivite nouveauStatut, String emailUser) {
        Activite activite = activiteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + id));
        verifierDroitGestion(activite, emailUser);
        StatutActivite ancienStatut = activite.getStatut();
        activite.setStatut(nouveauStatut);
        Activite activiteSauvee = activiteRepository.save(activite);

        if (ancienStatut != StatutActivite.PUBLIEE && nouveauStatut == StatutActivite.PUBLIEE) {
            notifierPublication(activiteSauvee);
        }

        return toResponse(activiteSauvee);
    }

    // ─── Supprimer une activité ───────────────────────────────────────────────
    public void supprimer(Long id, String emailUser) {
        Activite activite = activiteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + id));
        verifierDroitGestion(activite, emailUser);
        activiteRepository.delete(activite);
    }

    private void verifierDroitGestion(Activite activite, String emailUser) {
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + emailUser));
        if (user.getRole() == Role.ADMIN) {
            return;
        }
        if (user.getRole() == Role.REFERENT &&
                activite.getCreateur() != null &&
                activite.getCreateur().getId().equals(user.getId())) {
            return;
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

    private ActiviteResponse toResponse(Activite activite) {
        int nombreInscrits = (int) inscriptionRepository.countByActiviteIdAndStatutIn(
                activite.getId(),
                List.of(StatutInscription.CONFIRMEE, StatutInscription.PAYEE)
        );
        return ActiviteResponse.fromEntity(activite, nombreInscrits);
    }
}
