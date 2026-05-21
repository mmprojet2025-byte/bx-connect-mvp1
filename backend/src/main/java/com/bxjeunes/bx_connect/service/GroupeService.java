package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.GroupeRequest;
import com.bxjeunes.bx_connect.dto.GroupeResponse;
import com.bxjeunes.bx_connect.dto.MembreGroupeResponse;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
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
        this.groupeRepository       = groupeRepository;
        this.membreGroupeRepository = membreGroupeRepository;
        this.userRepository         = userRepository;
        this.notificationService    = notificationService;
    }

    // ─── Lister groupes validés (public) ─────────────────────────────────────
    public List<GroupeResponse> listerGroupes() {
        return groupeRepository.findByStatut(StatutGroupe.VALIDE)
                .stream()
                .map(GroupeResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Rechercher un groupe par nom (public) ────────────────────────────────
    public List<GroupeResponse> rechercherParNom(String nom) {
        return groupeRepository.findByStatutAndNomContainingIgnoreCase(StatutGroupe.VALIDE, nom)
                .stream()
                .map(GroupeResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Détail d'un groupe ───────────────────────────────────────────────────
    public GroupeResponse getGroupe(Long id) {
        Groupe groupe = groupeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable : " + id));
        return GroupeResponse.fromEntity(groupe);
    }

    // ─── Proposer un groupe (RÉFÉRENT) ────────────────────────────────────────
    // Statut initial : EN_ATTENTE — validation admin obligatoire
    public GroupeResponse proposerGroupe(GroupeRequest request, String emailReferent) {
        User referent = userRepository.findByEmail(emailReferent)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        Groupe groupe = new Groupe();
        groupe.setNom(request.getNom());
        groupe.setDescription(request.getDescription());
        groupe.setCategorie(request.getCategorie());
        groupe.setTheme(request.getTheme());
        groupe.setObjectif(request.getObjectif());
        groupe.setCapaciteMax(request.getCapaciteMax());
        groupe.setReferent(referent);
        groupe.setStatut(StatutGroupe.EN_ATTENTE); // ✅ Validation admin obligatoire
        groupe.setActif(false); // Pas encore visible

        Groupe saved = groupeRepository.save(groupe);

        // Notifier les admins (simplifié — notifie le référent de la soumission)
        notificationService.creer(referent,
            "Groupe soumis",
            "Votre groupe \"" + groupe.getNom() + "\" a été soumis et attend la validation de l'administrateur.",
            "VALIDATION_GROUPE");

        return GroupeResponse.fromEntity(saved);
    }

    // ─── Admin : Valider un groupe ────────────────────────────────────────────
    public GroupeResponse validerGroupe(Long groupeId) {
        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable : " + groupeId));

        groupe.setStatut(StatutGroupe.VALIDE);
        groupe.setActif(true);
        groupe.setDateValidation(LocalDateTime.now());

        Groupe saved = groupeRepository.save(groupe);

        // Notifier le référent
        notificationService.creer(groupe.getReferent(),
            "Groupe validé ✅",
            "Votre groupe \"" + groupe.getNom() + "\" a été validé par l'administrateur. Il est maintenant visible.",
            "VALIDATION_GROUPE",
            "/groupes/" + groupe.getId());

        return GroupeResponse.fromEntity(saved);
    }

    // ─── Admin : Refuser un groupe ────────────────────────────────────────────
    public GroupeResponse refuserGroupe(Long groupeId, String motif) {
        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable : " + groupeId));

        groupe.setStatut(StatutGroupe.REFUSE);
        groupe.setMotifRefus(motif);

        Groupe saved = groupeRepository.save(groupe);

        // Notifier le référent
        notificationService.creer(groupe.getReferent(),
            "Groupe refusé ❌",
            "Votre groupe \"" + groupe.getNom() + "\" a été refusé. Motif : " + motif,
            "REFUS_GROUPE");

        return GroupeResponse.fromEntity(saved);
    }

    // ─── Admin : Tous les groupes ─────────────────────────────────────────────
    public List<GroupeResponse> tousLesGroupes() {
        return groupeRepository.findAll()
                .stream()
                .map(GroupeResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Admin : Groupes en attente ───────────────────────────────────────────
    public List<GroupeResponse> groupesEnAttente() {
        return groupeRepository.findByStatutOrderByDateCreationAsc(StatutGroupe.EN_ATTENTE)
                .stream()
                .map(GroupeResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Référent : Mes groupes ───────────────────────────────────────────────
    public List<GroupeResponse> mesGroupes(String emailReferent) {
        User referent = userRepository.findByEmail(emailReferent)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return groupeRepository.findByReferentId(referent.getId())
                .stream()
                .map(GroupeResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Rejoindre un groupe (MEMBRE) ─────────────────────────────────────────
    // ✅ RÈGLE MÉTIER : Un membre = un seul groupe actif
    public MembreGroupeResponse rejoindreGroupe(Long groupeId, String emailMembre) {
        User membre = userRepository.findByEmail(emailMembre)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        // ✅ Vérifier règle 1 membre = 1 groupe
        if (membreGroupeRepository.estDejaMembreActif(membre.getId())) {
            throw new RuntimeException("Vous êtes déjà membre d'un groupe. Un membre ne peut appartenir qu'à un seul groupe.");
        }

        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable : " + groupeId));

        if (groupe.getStatut() != StatutGroupe.VALIDE) {
            throw new RuntimeException("Ce groupe n'est pas disponible.");
        }

        // Vérifier capacité
        if (groupe.getCapaciteMax() > 0) {
            long membresActifs = membreGroupeRepository.countByGroupeIdAndStatut(groupeId, StatutMembre.ACCEPTE);
            if (membresActifs >= groupe.getCapaciteMax()) {
                throw new RuntimeException("Ce groupe a atteint sa capacité maximale.");
            }
        }

        // Vérifier si déjà une demande en cours
        membreGroupeRepository.findByUserIdAndGroupeId(membre.getId(), groupeId)
                .ifPresent(mg -> { throw new RuntimeException("Vous avez déjà une demande pour ce groupe."); });

        MembreGroupe membreGroupe = new MembreGroupe(membre, groupe);
        membreGroupe.setStatut(StatutMembre.EN_ATTENTE);
        MembreGroupe saved = membreGroupeRepository.save(membreGroupe);

        // Notifier le référent
        notificationService.creer(groupe.getReferent(),
            "Nouvelle demande d'adhésion",
            membre.getPrenom() + " " + membre.getNom() + " souhaite rejoindre votre groupe \"" + groupe.getNom() + "\".",
            "ADHESION",
            "/referent/adhesions");

        return MembreGroupeResponse.fromEntity(saved);
    }

    // ─── Référent : Accepter une demande d'adhésion ───────────────────────────
    public MembreGroupeResponse accepterAdhesion(Long membreGroupeId) {
        MembreGroupe mg = membreGroupeRepository.findById(membreGroupeId)
                .orElseThrow(() -> new RuntimeException("Demande introuvable"));

        mg.setStatut(StatutMembre.ACCEPTE);
        MembreGroupe saved = membreGroupeRepository.save(mg);

        // Notifier le membre
        notificationService.creer(mg.getUser(),
            "Adhésion acceptée ✅",
            "Votre demande d'adhésion au groupe \"" + mg.getGroupe().getNom() + "\" a été acceptée !",
            "ADHESION_ACCEPTEE",
            "/groupes/" + mg.getGroupe().getId());

        return MembreGroupeResponse.fromEntity(saved);
    }

    // ─── Référent : Refuser une demande d'adhésion ────────────────────────────
    public MembreGroupeResponse refuserAdhesion(Long membreGroupeId) {
        MembreGroupe mg = membreGroupeRepository.findById(membreGroupeId)
                .orElseThrow(() -> new RuntimeException("Demande introuvable"));

        mg.setStatut(StatutMembre.REFUSE);
        MembreGroupe saved = membreGroupeRepository.save(mg);

        // Notifier le membre
        notificationService.creer(mg.getUser(),
            "Adhésion refusée",
            "Votre demande d'adhésion au groupe \"" + mg.getGroupe().getNom() + "\" a été refusée.",
            "ADHESION_REFUSEE");

        return MembreGroupeResponse.fromEntity(saved);
    }

    // ─── Quitter un groupe ────────────────────────────────────────────────────
    public void quitterGroupe(Long groupeId, String emailMembre) {
        User membre = userRepository.findByEmail(emailMembre)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        MembreGroupe mg = membreGroupeRepository.findByUserIdAndGroupeId(membre.getId(), groupeId)
                .orElseThrow(() -> new RuntimeException("Vous n'êtes pas membre de ce groupe."));

        membreGroupeRepository.delete(mg);
    }

    // ─── Membres d'un groupe ──────────────────────────────────────────────────
    public List<MembreGroupeResponse> getMembres(Long groupeId) {
        return membreGroupeRepository.findByGroupeId(groupeId)
                .stream()
                .map(MembreGroupeResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Mes groupes (membre) ─────────────────────────────────────────────────
    public List<GroupeResponse> mesGroupesMembre(String emailMembre) {
        User membre = userRepository.findByEmail(emailMembre)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return membreGroupeRepository.findByUserId(membre.getId())
                .stream()
                .map(mg -> GroupeResponse.fromEntity(mg.getGroupe()))
                .collect(Collectors.toList());
    }

    // ─── Demandes en attente pour un groupe (référent) ────────────────────────
    public List<MembreGroupeResponse> demandesEnAttente(Long groupeId) {
        return membreGroupeRepository
                .findByGroupeIdAndStatutOrderByDateAdhesionAsc(groupeId, StatutMembre.EN_ATTENTE)
                .stream()
                .map(MembreGroupeResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Modifier un groupe (référent propriétaire / admin) ───────────────────
    public GroupeResponse modifierGroupe(Long id, GroupeRequest request, String emailUser) {
        Groupe groupe = groupeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable"));

        groupe.setNom(request.getNom());
        groupe.setDescription(request.getDescription());
        groupe.setCategorie(request.getCategorie());
        if (request.getTheme() != null)    groupe.setTheme(request.getTheme());
        if (request.getObjectif() != null) groupe.setObjectif(request.getObjectif());
        if (request.getCapaciteMax() >= 0) groupe.setCapaciteMax(request.getCapaciteMax());

        return GroupeResponse.fromEntity(groupeRepository.save(groupe));
    }

    // ─── Supprimer un groupe (admin) ──────────────────────────────────────────
    public void supprimerGroupe(Long id) {
        groupeRepository.deleteById(id);
    }
}