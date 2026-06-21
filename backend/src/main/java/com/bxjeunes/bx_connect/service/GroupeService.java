package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.GroupeRequest;
import com.bxjeunes.bx_connect.dto.GroupeResponse;
import com.bxjeunes.bx_connect.dto.MembreGroupeResponse;
import com.bxjeunes.bx_connect.dto.admin.AdminGroupeRequest;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class GroupeService {

    private static final Logger log = LoggerFactory.getLogger(GroupeService.class);
    private static final String TARGET_GROUP = "GROUP";

    private final GroupeRepository groupeRepository;
    private final MembreGroupeRepository membreGroupeRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    public GroupeService(GroupeRepository groupeRepository,
                         MembreGroupeRepository membreGroupeRepository,
                         UserRepository userRepository,
                         NotificationService notificationService,
                         AuditLogService auditLogService) {
        this.groupeRepository = groupeRepository;
        this.membreGroupeRepository = membreGroupeRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
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
        auditerStatut(referent, "GROUP_SUBMITTED", saved, null, saved.getStatut().name(),
                "Groupe soumis pour validation.", metadata("referentId", referent.getId()));
        return GroupeResponse.fromEntity(saved);
    }

    public GroupeResponse creerGroupeParAdmin(AdminGroupeRequest request) {
        return creerGroupeParAdmin(request, null);
    }

    public GroupeResponse creerGroupeParAdmin(AdminGroupeRequest request, String emailAdmin) {
        User admin = chargerUtilisateurOptionnel(emailAdmin);
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

        Groupe saved = groupeRepository.save(groupe);
        auditerStatut(admin, "GROUP_CREATED", saved, null, saved.getStatut().name(),
                "Groupe cree par un administrateur.", metadata("referentId", referent.getId()));
        return GroupeResponse.fromEntity(saved);
    }

    public GroupeResponse assignerReferent(Long groupeId, Long referentId) {
        return assignerReferent(groupeId, referentId, null);
    }

    public GroupeResponse assignerReferent(Long groupeId, Long referentId, String emailAdmin) {
        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable : " + groupeId));
        User admin = chargerUtilisateurOptionnel(emailAdmin);
        User ancienReferent = groupe.getReferent();
        User referent = getReferent(referentId);

        groupe.setReferent(referent);
        Groupe saved = groupeRepository.save(groupe);
        auditerAction(admin, "GROUP_REFERENT_ASSIGNED", saved,
                "Referent assigne au groupe.",
                metadata(
                        "ancienReferentId", ancienReferent != null ? ancienReferent.getId() : null,
                        "nouveauReferentId", referent.getId()));
        return GroupeResponse.fromEntity(saved);
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
        Groupe saved = groupeRepository.save(groupe);
        auditerAction(user, "GROUP_UPDATED", saved, "Groupe modifie.",
                metadata("capaciteMax", saved.getCapaciteMax()));
        return GroupeResponse.fromEntity(saved);
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

        StatutMembre ancienStatut = mg.getStatut();
        mg.setStatut(StatutMembre.ACCEPTE);
        MembreGroupe saved = membreGroupeRepository.save(mg);
        notificationService.creer(mg.getUser(), "Adhesion acceptee",
            "Votre adhesion a ete acceptee !", "ADHESION_ACCEPTEE",
            "/groupes/" + mg.getGroupe().getId());
        auditerStatut(referent, "GROUP_ADHESION_ACCEPTED", saved.getGroupe(),
                nomStatut(ancienStatut), saved.getStatut().name(),
                "Adhesion acceptee.",
                metadata("adhesionId", saved.getId(), "membreId", saved.getUser().getId()));
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

        StatutMembre ancienStatut = mg.getStatut();
        mg.setStatut(StatutMembre.REFUSE);
        MembreGroupe saved = membreGroupeRepository.save(mg);
        notificationService.creer(mg.getUser(), "Adhesion refusee",
            "Votre adhesion a ete refusee.", "ADHESION_REFUSEE");
        auditerStatut(referent, "GROUP_ADHESION_REJECTED", saved.getGroupe(),
                nomStatut(ancienStatut), saved.getStatut().name(),
                "Adhesion refusee.",
                metadata("adhesionId", saved.getId(), "membreId", saved.getUser().getId()));
        return MembreGroupeResponse.fromEntity(saved);
    }

    public GroupeResponse validerGroupe(Long groupeId) {
        return validerGroupe(groupeId, null);
    }

    public GroupeResponse validerGroupe(Long groupeId, String emailAdmin) {
        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable : " + groupeId));
        User admin = chargerUtilisateurOptionnel(emailAdmin);
        StatutGroupe ancienStatut = groupe.getStatut();
        groupe.setStatut(StatutGroupe.VALIDE);
        groupe.setActif(true);
        groupe.setDateValidation(LocalDateTime.now());
        Groupe saved = groupeRepository.save(groupe);
        notificationService.creer(groupe.getReferent(), "Groupe valide",
            "Votre groupe a ete valide.", "VALIDATION_GROUPE", "/groupes/" + groupe.getId());
        auditerStatut(admin, "GROUP_VALIDATED", saved, nomStatut(ancienStatut), saved.getStatut().name(),
                "Groupe valide.", metadata("referentId", saved.getReferent() != null ? saved.getReferent().getId() : null));
        return GroupeResponse.fromEntity(saved);
    }

    public GroupeResponse refuserGroupe(Long groupeId, String motif) {
        return refuserGroupe(groupeId, motif, null);
    }

    public GroupeResponse refuserGroupe(Long groupeId, String motif, String emailAdmin) {
        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable : " + groupeId));
        User admin = chargerUtilisateurOptionnel(emailAdmin);
        StatutGroupe ancienStatut = groupe.getStatut();
        groupe.setStatut(StatutGroupe.REFUSE);
        groupe.setMotifRefus(motif);
        Groupe saved = groupeRepository.save(groupe);
        notificationService.creer(groupe.getReferent(), "Groupe refuse",
            "Votre groupe a ete refuse. Motif : " + motif, "REFUS_GROUPE");
        auditerStatut(admin, "GROUP_REJECTED", saved, nomStatut(ancienStatut), saved.getStatut().name(),
                "Groupe refuse.", metadata("motifPresent", motif != null && !motif.isBlank()));
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
        supprimerGroupe(id, null);
    }

    public void supprimerGroupe(Long id, String emailAdmin) {
        Groupe groupe = groupeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable : " + id));
        User admin = chargerUtilisateurOptionnel(emailAdmin);
        groupeRepository.deleteById(id);
        auditerAction(admin, "GROUP_DELETED", groupe, "Groupe supprime.",
                metadata("ancienStatut", nomStatut(groupe.getStatut())));
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
        auditerStatut(membre, "GROUP_JOIN_REQUESTED", groupe, null, saved.getStatut().name(),
                "Demande d'adhesion creee.",
                metadata("adhesionId", saved.getId(), "membreId", membre.getId()));
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
        Groupe groupe = mg.getGroupe();
        StatutMembre ancienStatut = mg.getStatut();
        membreGroupeRepository.delete(mg);
        auditerStatut(membre, "GROUP_LEFT", groupe, nomStatut(ancienStatut), "QUITTE",
                "Membre sorti du groupe.",
                metadata("adhesionId", mg.getId(), "membreId", membre.getId()));
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

    private User chargerUtilisateurOptionnel(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
    }

    private void auditerAction(User acteur, String action, Groupe groupe, String details, String metadataJson) {
        try {
            auditLogService.logAction(
                    acteur,
                    action,
                    TARGET_GROUP,
                    groupe.getId(),
                    groupe.getNom(),
                    null,
                    details,
                    metadataJson);
        } catch (Exception ex) {
            log.warn("Echec audit {} pour le groupe {}: {}", action, groupe.getId(), ex.getMessage());
        }
    }

    private void auditerStatut(
            User acteur,
            String action,
            Groupe groupe,
            String ancienStatut,
            String nouveauStatut,
            String details,
            String metadataJson) {
        try {
            auditLogService.logStatusChange(
                    acteur,
                    action,
                    TARGET_GROUP,
                    groupe.getId(),
                    groupe.getNom(),
                    ancienStatut,
                    nouveauStatut,
                    details,
                    metadataJson);
        } catch (Exception ex) {
            log.warn("Echec audit {} pour le groupe {}: {}", action, groupe.getId(), ex.getMessage());
        }
    }

    private String nomStatut(Enum<?> statut) {
        return statut == null ? null : statut.name();
    }

    private String metadata(Object... keyValues) {
        StringBuilder json = new StringBuilder("{");
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            if (i > 0) {
                json.append(',');
            }
            json.append('"').append(escapeJson(String.valueOf(keyValues[i]))).append("\":");
            Object value = keyValues[i + 1];
            if (value == null) {
                json.append("null");
            } else if (value instanceof Number || value instanceof Boolean) {
                json.append(value);
            } else {
                json.append('"').append(escapeJson(String.valueOf(value))).append('"');
            }
        }
        json.append('}');
        return json.toString();
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
