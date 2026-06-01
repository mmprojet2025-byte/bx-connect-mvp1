package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.membre.MembreDashboardResponse;
import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.Inscription;
import com.bxjeunes.bx_connect.entity.MembreGroupe;
import com.bxjeunes.bx_connect.entity.Notification;
import com.bxjeunes.bx_connect.entity.Projet;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import com.bxjeunes.bx_connect.entity.StatutInscription;
import com.bxjeunes.bx_connect.entity.StatutMembre;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.NotificationRepository;
import com.bxjeunes.bx_connect.repository.ProjetRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class MembreDashboardService {

    private final UserRepository userRepository;
    private final MembreGroupeRepository membreGroupeRepository;
    private final InscriptionRepository inscriptionRepository;
    private final ProjetRepository projetRepository;
    private final NotificationRepository notificationRepository;
    private final ActiviteRepository activiteRepository;

    public MembreDashboardService(UserRepository userRepository,
                                  MembreGroupeRepository membreGroupeRepository,
                                  InscriptionRepository inscriptionRepository,
                                  ProjetRepository projetRepository,
                                  NotificationRepository notificationRepository,
                                  ActiviteRepository activiteRepository) {
        this.userRepository = userRepository;
        this.membreGroupeRepository = membreGroupeRepository;
        this.inscriptionRepository = inscriptionRepository;
        this.projetRepository = projetRepository;
        this.notificationRepository = notificationRepository;
        this.activiteRepository = activiteRepository;
    }

    public MembreDashboardResponse dashboard(String emailMembre) {
        User membre = userRepository.findByEmail(emailMembre)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (membre.getRole() != Role.MEMBRE) {
            throw new AccessDeniedException("Le dashboard membre est reserve aux MEMBRES.");
        }

        List<MembreGroupe> adhesions = membreGroupeRepository.findByUserId(membre.getId());
        Optional<MembreGroupe> adhesionAcceptee = adhesions.stream()
                .filter(adhesion -> adhesion.getStatut() == StatutMembre.ACCEPTE)
                .findFirst();
        Optional<MembreGroupe> adhesionEnAttente = adhesions.stream()
                .filter(adhesion -> adhesion.getStatut() == StatutMembre.EN_ATTENTE)
                .findFirst();

        List<Inscription> inscriptions = inscriptionRepository.findByMembreId(membre.getId());
        List<Projet> projets = projetRepository.findByPorteurId(membre.getId());
        List<Notification> notifications = notificationRepository
                .findByDestinataireIdOrderByDateCreationDesc(membre.getId());

        MembreDashboardResponse response = new MembreDashboardResponse();
        adhesionAcceptee.or(() -> adhesionEnAttente).ifPresent(adhesion -> {
            response.setGroupe(toGroupeDashboard(adhesion));
            response.setReferent(toReferentDashboard(adhesion.getGroupe()));
        });
        response.setMessagerieDisponible(adhesionAcceptee.isPresent());
        response.setInscriptions(inscriptions.stream()
                .sorted(Comparator.comparing(
                        inscription -> inscription.getActivite() != null
                                ? inscription.getActivite().getDateDebut()
                                : LocalDateTime.MAX))
                .limit(5)
                .map(this::toInscriptionDashboard)
                .toList());
        response.setProjets(projets.stream()
                .sorted(Comparator.comparing(Projet::getDateCreation).reversed())
                .limit(5)
                .map(this::toProjetDashboard)
                .toList());
        response.setNotifications(notifications.stream()
                .limit(5)
                .map(this::toNotificationDashboard)
                .toList());
        response.setImplication(toImplication(inscriptions, projets));

        return response;
    }

    private MembreDashboardResponse.GroupeDashboard toGroupeDashboard(MembreGroupe adhesion) {
        Groupe groupe = adhesion.getGroupe();
        MembreDashboardResponse.GroupeDashboard dto = new MembreDashboardResponse.GroupeDashboard();
        dto.setId(groupe.getId());
        dto.setNom(groupe.getNom());
        dto.setDescription(groupe.getDescription());
        dto.setImageUrl(null);
        dto.setStatutAdhesion(adhesion.getStatut().name());
        dto.setNombreMembres((int) membreGroupeRepository.countByGroupeIdAndStatut(groupe.getId(), StatutMembre.ACCEPTE));
        dto.setNombreActivitesAVenir(compterActivitesAVenir(groupe));
        dto.setDateAdhesion(adhesion.getDateAdhesion());
        return dto;
    }

    private MembreDashboardResponse.ReferentDashboard toReferentDashboard(Groupe groupe) {
        if (groupe == null || groupe.getReferent() == null) {
            return null;
        }
        User referent = groupe.getReferent();
        MembreDashboardResponse.ReferentDashboard dto = new MembreDashboardResponse.ReferentDashboard();
        dto.setId(referent.getId());
        dto.setPrenom(referent.getPrenom());
        dto.setNom(referent.getNom());
        dto.setEmail(referent.getEmail());
        return dto;
    }

    private long compterActivitesAVenir(Groupe groupe) {
        if (groupe.getReferent() == null) {
            return 0;
        }
        LocalDateTime now = LocalDateTime.now();
        return activiteRepository
                .findByCreateurIdAndStatut(groupe.getReferent().getId(), StatutActivite.PUBLIEE)
                .stream()
                .filter(activite -> activite.getDateDebut() != null && activite.getDateDebut().isAfter(now))
                .count();
    }

    private MembreDashboardResponse.InscriptionDashboard toInscriptionDashboard(Inscription inscription) {
        MembreDashboardResponse.InscriptionDashboard dto = new MembreDashboardResponse.InscriptionDashboard();
        dto.setId(inscription.getId());
        dto.setStatut(inscription.getStatut());
        Activite activite = inscription.getActivite();
        if (activite != null) {
            dto.setActiviteId(activite.getId());
            dto.setActiviteTitre(activite.getTitre());
            dto.setActiviteLieu(activite.getLieu());
            dto.setActiviteDateDebut(activite.getDateDebut());
        }
        return dto;
    }

    private MembreDashboardResponse.ProjetDashboard toProjetDashboard(Projet projet) {
        MembreDashboardResponse.ProjetDashboard dto = new MembreDashboardResponse.ProjetDashboard();
        dto.setId(projet.getId());
        dto.setTitre(projet.getTitre());
        dto.setStatut(projet.getStatut());
        return dto;
    }

    private MembreDashboardResponse.NotificationDashboard toNotificationDashboard(Notification notification) {
        MembreDashboardResponse.NotificationDashboard dto = new MembreDashboardResponse.NotificationDashboard();
        dto.setId(notification.getId());
        dto.setTitre(notification.getTitre());
        dto.setMessage(notification.getMessage());
        dto.setLue(notification.isLue());
        dto.setDateCreation(notification.getDateCreation());
        dto.setLienAction(notification.getLienAction());
        return dto;
    }

    private MembreDashboardResponse.ImplicationDashboard toImplication(
            List<Inscription> inscriptions,
            List<Projet> projets) {
        int activitesRejointes = inscriptions.size();
        int inscriptionsConfirmees = (int) inscriptions.stream()
                .filter(inscription -> inscription.getStatut() == StatutInscription.CONFIRMEE
                        || inscription.getStatut() == StatutInscription.PAYEE)
                .count();

        MembreDashboardResponse.ImplicationDashboard dto = new MembreDashboardResponse.ImplicationDashboard();
        dto.setActivitesRejointes(activitesRejointes);
        dto.setInscriptionsConfirmees(inscriptionsConfirmees);
        dto.setProjetsProposes(projets.size());
        dto.setStatut(statutImplication(inscriptionsConfirmees, projets.size()));
        return dto;
    }

    private String statutImplication(int inscriptionsConfirmees, int projetsProposes) {
        if (inscriptionsConfirmees >= 5 || projetsProposes >= 3) {
            return "MEMBRE_ENGAGE";
        }
        if (inscriptionsConfirmees >= 1 || projetsProposes >= 1) {
            return "MEMBRE_ACTIF";
        }
        return "NOUVEAU_MEMBRE";
    }
}
