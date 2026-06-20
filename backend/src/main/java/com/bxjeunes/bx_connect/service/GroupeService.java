package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.GroupeRequest;
import com.bxjeunes.bx_connect.dto.GroupeResponse;
import com.bxjeunes.bx_connect.dto.MembreGroupeResponse;
import com.bxjeunes.bx_connect.dto.admin.AdminGroupeRequest;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class GroupeService {

    private final GroupeRepository groupeRepository;
    private final MembreGroupeRepository membreGroupeRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public GroupeService(GroupeRepository groupeRepository,
                         MembreGroupeRepository membreGroupeRepository,
                         UserRepository userRepository,
                         NotificationService notificationService) {
        this.groupeRepository = groupeRepository;
        this.membreGroupeRepository = membreGroupeRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public List<GroupeResponse> listerGroupes() {
        return groupeRepository.findByStatut(StatutGroupe.VALIDE)
                .stream().map(GroupeResponse::fromEntity).collect(Collectors.toList());
    }

    public List<GroupeResponse> rechercherParNom(String nom) {
        return groupeRepository.findByStatutAndNomContainingIgnoreCase(StatutGroupe.VALIDE, nom)
                .stream().map(GroupeResponse::fromEntity).collect(Collectors.toList());
    }

    public GroupeResponse getGroupe(Long id) {
        Groupe groupe = groupeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable : " + id));
        if (groupe.getStatut() != StatutGroupe.VALIDE) {
            throw new RuntimeException("Groupe introuvable : " + id);
        }
        return GroupeResponse.fromEntity(groupe);
    }

    public GroupeResponse proposerGroupe(GroupeRequest request, String emailReferent) {
        User referent = userRepository.findByEmail(emailReferent)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        Groupe groupe = new Groupe();
        groupe.setNom(request.getNom());
        groupe.setDescription(request.getDescription());
        groupe.setCategorie(request.getCategorie());
        groupe.setTheme(request.getTheme());
        groupe.setObjectif(request.getObjectif());
        appliquerLocalisation(groupe, request);
        groupe.setCapaciteMax(request.getCapaciteMax());
        groupe.setReferent(referent);
        groupe.setStatut(StatutGroupe.EN_ATTENTE);
        groupe.setActif(false);
        Groupe saved = groupeRepository.save(groupe);
        notificationService.creer(referent, "Groupe soumis",
            "Votre groupe attend la validation.", "VALIDATION_GROUPE");
        return GroupeResponse.fromEntity(saved);
    }

    public GroupeResponse creerGroupeParAdmin(AdminGroupeRequest request) {
        User referent = getReferent(request.getReferentId());

        Groupe groupe = new Groupe();
        groupe.setNom(request.getNom());
        groupe.setDescription(request.getDescription());
        groupe.setCategorie(request.getCategorie());
        groupe.setTheme(request.getTheme());
        groupe.setObjectif(request.getObjectif());
        appliquerLocalisation(groupe, request);
        groupe.setCapaciteMax(request.getCapaciteMax());
        groupe.setReferent(referent);
        groupe.setStatut(StatutGroupe.VALIDE);
        groupe.setActif(true);
        groupe.setDateValidation(LocalDateTime.now());

        return GroupeResponse.fromEntity(groupeRepository.save(groupe));
    }

    public GroupeResponse assignerReferent(Long groupeId, Long referentId) {
        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable : " + groupeId));
        User referent = getReferent(referentId);

        groupe.setReferent(referent);
        return GroupeResponse.fromEntity(groupeRepository.save(groupe));
    }

    /**
     * SECURITE : Un referent ne peut modifier QUE ses propres groupes.
     */
    public GroupeResponse modifierGroupe(Long id, GroupeRequest request, String emailUser) {
        Groupe groupe = groupeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable : " + id));
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (user.getRole() == Role.REFERENT &&
            !groupe.getReferent().getId().equals(user.getId())) {
            throw new AccessDeniedException("Vous n'etes pas le referent de ce groupe.");
        }

        groupe.setNom(request.getNom());
        groupe.setDescription(request.getDescription());
        groupe.setCategorie(request.getCategorie());
        if (request.getTheme() != null) groupe.setTheme(request.getTheme());
        if (request.getObjectif() != null) groupe.setObjectif(request.getObjectif());
        appliquerLocalisation(groupe, request);
        if (request.getCapaciteMax() >= 0) groupe.setCapaciteMax(request.getCapaciteMax());
        return GroupeResponse.fromEntity(groupeRepository.save(groupe));
    }

    /**
     * SECURITE : Un referent ne peut accepter que les adhesions de SES groupes.
     */
    public MembreGroupeResponse accepterAdhesion(Long membreGroupeId, String emailReferent) {
        MembreGroupe mg = membreGroupeRepository.findById(membreGroupeId)
                .orElseThrow(() -> new RuntimeException("Demande introuvable : " + membreGroupeId));
        User referent = userRepository.findByEmail(emailReferent)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (referent.getRole() == Role.REFERENT &&
            !mg.getGroupe().getReferent().getId().equals(referent.getId())) {
            throw new AccessDeniedException("Vous n'etes pas le referent de ce groupe.");
        }
        membreGroupeRepository.findFirstByUserIdAndStatut(mg.getUser().getId(), StatutMembre.ACCEPTE)
                .filter(adhesion -> !adhesion.getGroupe().getId().equals(mg.getGroupe().getId()))
                .ifPresent(adhesion -> {
                    throw new RuntimeException("Ce membre appartient deja a un groupe actif.");
                });

        mg.setStatut(StatutMembre.ACCEPTE);
        MembreGroupe saved = membreGroupeRepository.save(mg);
        notificationService.creer(mg.getUser(), "Adhesion acceptee",
            "Votre adhesion a ete acceptee !", "ADHESION_ACCEPTEE",
            "/groupes/" + mg.getGroupe().getId());
        return MembreGroupeResponse.fromEntity(saved);
    }

    /**
     * SECURITE : Un referent ne peut refuser que les adhesions de SES groupes.
     */
    public MembreGroupeResponse refuserAdhesion(Long membreGroupeId, String emailReferent) {
        MembreGroupe mg = membreGroupeRepository.findById(membreGroupeId)
                .orElseThrow(() -> new RuntimeException("Demande introuvable : " + membreGroupeId));
        User referent = userRepository.findByEmail(emailReferent)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (referent.getRole() == Role.REFERENT &&
            !mg.getGroupe().getReferent().getId().equals(referent.getId())) {
            throw new AccessDeniedException("Vous n'etes pas le referent de ce groupe.");
        }

        mg.setStatut(StatutMembre.REFUSE);
        MembreGroupe saved = membreGroupeRepository.save(mg);
        notificationService.creer(mg.getUser(), "Adhesion refusee",
            "Votre adhesion a ete refusee.", "ADHESION_REFUSEE");
        return MembreGroupeResponse.fromEntity(saved);
    }

    public GroupeResponse validerGroupe(Long groupeId) {
        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable : " + groupeId));
        groupe.setStatut(StatutGroupe.VALIDE);
        groupe.setActif(true);
        groupe.setDateValidation(LocalDateTime.now());
        Groupe saved = groupeRepository.save(groupe);
        notificationService.creer(groupe.getReferent(), "Groupe valide",
            "Votre groupe a ete valide.", "VALIDATION_GROUPE", "/groupes/" + groupe.getId());
        return GroupeResponse.fromEntity(saved);
    }

    public GroupeResponse refuserGroupe(Long groupeId, String motif) {
        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable : " + groupeId));
        groupe.setStatut(StatutGroupe.REFUSE);
        groupe.setMotifRefus(motif);
        Groupe saved = groupeRepository.save(groupe);
        notificationService.creer(groupe.getReferent(), "Groupe refuse",
            "Votre groupe a ete refuse. Motif : " + motif, "REFUS_GROUPE");
        return GroupeResponse.fromEntity(saved);
    }

    public List<GroupeResponse> tousLesGroupes() {
        return groupeRepository.findAll().stream()
                .map(GroupeResponse::fromEntity).collect(Collectors.toList());
    }

    public List<GroupeResponse> groupesEnAttente() {
        return groupeRepository.findByStatutOrderByDateCreationAsc(StatutGroupe.EN_ATTENTE)
                .stream().map(GroupeResponse::fromEntity).collect(Collectors.toList());
    }

    public List<GroupeResponse> mesGroupes(String emailReferent) {
        User referent = userRepository.findByEmail(emailReferent)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return groupeRepository.findByReferentId(referent.getId())
                .stream().map(GroupeResponse::fromEntity).collect(Collectors.toList());
    }

    public void supprimerGroupe(Long id) {
        if (!groupeRepository.existsById(id))
            throw new RuntimeException("Groupe introuvable : " + id);
        groupeRepository.deleteById(id);
    }

    public MembreGroupeResponse rejoindreGroupe(Long groupeId, String emailMembre) {
        User membre = userRepository.findByEmail(emailMembre)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        if (membre.getRole() != Role.MEMBRE) {
            throw new AccessDeniedException("Seuls les membres peuvent rejoindre un groupe.");
        }
        if (membreGroupeRepository.estDejaMembreActif(membre.getId()))
            throw new RuntimeException("Vous etes deja membre d'un groupe.");
        membreGroupeRepository.findFirstByUserIdAndStatut(membre.getId(), StatutMembre.EN_ATTENTE)
                .ifPresent(adhesion -> {
                    throw new RuntimeException("Vous avez deja une demande d'adhesion en attente.");
                });
        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable : " + groupeId));
        if (groupe.getStatut() != StatutGroupe.VALIDE)
            throw new RuntimeException("Ce groupe n'est pas disponible.");
        if (groupe.getCapaciteMax() > 0) {
            long actifs = membreGroupeRepository.countByGroupeIdAndStatut(groupeId, StatutMembre.ACCEPTE);
            if (actifs >= groupe.getCapaciteMax())
                throw new RuntimeException("Ce groupe a atteint sa capacite maximale.");
        }
        membreGroupeRepository.findByUserIdAndGroupeId(membre.getId(), groupeId)
                .ifPresent(mg -> { throw new RuntimeException("Vous avez deja une demande."); });
        MembreGroupe mg = new MembreGroupe(membre, groupe);
        mg.setStatut(StatutMembre.EN_ATTENTE);
        MembreGroupe saved = membreGroupeRepository.save(mg);
        notificationService.creer(groupe.getReferent(), "Nouvelle demande d'adhesion",
            membre.getPrenom() + " souhaite rejoindre " + groupe.getNom(),
            "ADHESION", "/referent/adhesions");
        return MembreGroupeResponse.fromEntity(saved);
    }

    public void quitterGroupe(Long groupeId, String emailMembre) {
        User membre = userRepository.findByEmail(emailMembre)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        if (membre.getRole() != Role.MEMBRE) {
            throw new AccessDeniedException("Seuls les membres peuvent quitter un groupe.");
        }
        MembreGroupe mg = membreGroupeRepository.findByUserIdAndGroupeId(membre.getId(), groupeId)
                .orElseThrow(() -> new RuntimeException("Vous n'etes pas membre de ce groupe."));
        membreGroupeRepository.delete(mg);
    }

    public List<MembreGroupeResponse> getMembres(Long groupeId) {
        return membreGroupeRepository.findByGroupeId(groupeId)
                .stream().map(MembreGroupeResponse::fromEntity).collect(Collectors.toList());
    }

    public List<MembreGroupeResponse> getMembresAdminOuReferent(Long groupeId, String emailUser) {
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        if (user.getRole() == Role.ADMIN) {
            return getMembres(groupeId);
        }
        if (user.getRole() == Role.REFERENT) {
            return getMembresReferent(groupeId, emailUser);
        }
        throw new AccessDeniedException("Acces reserve aux ADMIN et REFERENTS du groupe.");
    }

    public List<MembreGroupeResponse> getMembresReferent(Long groupeId, String emailReferent) {
        verifierReferentDuGroupe(groupeId, emailReferent);
        return getMembres(groupeId);
    }

    public List<GroupeResponse> mesGroupesMembre(String emailMembre) {
        User membre = userRepository.findByEmail(emailMembre)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return membreGroupeRepository.findByUserId(membre.getId())
                .stream().map(mg -> GroupeResponse.fromEntity(mg.getGroupe())).collect(Collectors.toList());
    }

    public List<MembreGroupeResponse> mesAdhesionsMembre(String emailMembre) {
        User membre = userRepository.findByEmail(emailMembre)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        if (membre.getRole() != Role.MEMBRE) {
            throw new AccessDeniedException("Seuls les membres ont des adhesions groupe.");
        }
        return membreGroupeRepository.findByUserId(membre.getId())
                .stream().map(MembreGroupeResponse::fromEntity).collect(Collectors.toList());
    }

    public List<MembreGroupeResponse> demandesEnAttente(Long groupeId) {
        return membreGroupeRepository
                .findByGroupeIdAndStatutOrderByDateAdhesionAsc(groupeId, StatutMembre.EN_ATTENTE)
                .stream().map(MembreGroupeResponse::fromEntity).collect(Collectors.toList());
    }

    public List<MembreGroupeResponse> demandesEnAttenteReferent(Long groupeId, String emailReferent) {
        verifierReferentDuGroupe(groupeId, emailReferent);
        return demandesEnAttente(groupeId);
    }

    public List<MembreGroupeResponse> demandesEnAttenteAdminOuReferent(Long groupeId, String emailUser) {
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        if (user.getRole() == Role.ADMIN) {
            return demandesEnAttente(groupeId);
        }
        if (user.getRole() == Role.REFERENT) {
            return demandesEnAttenteReferent(groupeId, emailUser);
        }
        throw new AccessDeniedException("Acces reserve aux ADMIN et REFERENTS du groupe.");
    }

    public void verifierDemandeDansGroupe(Long membreGroupeId, Long groupeId) {
        MembreGroupe mg = membreGroupeRepository.findById(membreGroupeId)
                .orElseThrow(() -> new RuntimeException("Demande introuvable : " + membreGroupeId));
        if (!mg.getGroupe().getId().equals(groupeId)) {
            throw new AccessDeniedException("Cette demande n'appartient pas a ce groupe.");
        }
    }

    private User getReferent(Long referentId) {
        User referent = userRepository.findById(referentId)
                .orElseThrow(() -> new RuntimeException("Referent introuvable"));
        if (referent.getRole() != Role.REFERENT) {
            throw new AccessDeniedException("L'utilisateur choisi doit avoir le role REFERENT.");
        }
        if (!referent.isActif()) {
            throw new AccessDeniedException("Impossible d'assigner un REFERENT inactif.");
        }
        return referent;
    }

    private void appliquerLocalisation(Groupe groupe, GroupeRequest request) {
        groupe.setAdresseReunion(request.getAdresseReunion());
        groupe.setCommune(request.getCommune());
        groupe.setLatitude(request.getLatitude());
        groupe.setLongitude(request.getLongitude());
    }

    private void appliquerLocalisation(Groupe groupe, AdminGroupeRequest request) {
        groupe.setAdresseReunion(request.getAdresseReunion());
        groupe.setCommune(request.getCommune());
        groupe.setLatitude(request.getLatitude());
        groupe.setLongitude(request.getLongitude());
    }

    private void verifierReferentDuGroupe(Long groupeId, String emailReferent) {
        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable : " + groupeId));
        User referent = userRepository.findByEmail(emailReferent)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (referent.getRole() != Role.REFERENT ||
                groupe.getReferent() == null ||
                !groupe.getReferent().getId().equals(referent.getId())) {
            throw new AccessDeniedException("Vous n'etes pas le referent de ce groupe.");
        }
    }
}
