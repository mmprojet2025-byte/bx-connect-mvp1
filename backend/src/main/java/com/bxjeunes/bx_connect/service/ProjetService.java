package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.*;
import com.bxjeunes.bx_connect.util.PaginationUtils;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProjetService {

    private static final Logger log = LoggerFactory.getLogger(ProjetService.class);
    private static final String TARGET_PROJECT = "PROJECT";

    private static final List<StatutProjet> STATUTS_DIFFUSABLES =
            List.of(StatutProjet.APPROUVE, StatutProjet.EN_COURS, StatutProjet.TERMINE);

    private final ProjetRepository projetRepository;
    private final ParticipationProjetRepository participationRepository;
    private final CommentaireProjetRepository commentaireRepository;
    private final UserRepository userRepository;
    private final GroupeRepository groupeRepository;
    private final MembreGroupeRepository membreGroupeRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    public ProjetService(ProjetRepository projetRepository,
                         ParticipationProjetRepository participationRepository,
                         CommentaireProjetRepository commentaireRepository,
                         UserRepository userRepository,
                         GroupeRepository groupeRepository,
                         MembreGroupeRepository membreGroupeRepository,
                         NotificationService notificationService,
                         AuditLogService auditLogService) {
        this.projetRepository = projetRepository;
        this.participationRepository = participationRepository;
        this.commentaireRepository = commentaireRepository;
        this.userRepository = userRepository;
        this.groupeRepository = groupeRepository;
        this.membreGroupeRepository = membreGroupeRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
    }

    // ─── Lister les projets publics (APPROUVE + EN_COURS) ────────────────────

    public List<ProjetResponse> listerProjetsVisibles(String emailUser) {
        if (emailUser == null) {
            return projetRepository.findByStatutInAndVisibilite(
                            STATUTS_DIFFUSABLES, VisibiliteProjet.PUBLIC)
                    .stream()
                    .map(ProjetResponse::fromEntity)
                    .collect(Collectors.toList());
        }

        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return projetRepository.findAll()
                .stream()
                .filter(projet -> peutConsulterProjet(projet, user))
                .map(ProjetResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public PagedResponse<ProjetResponse> listerProjetsVisiblesPage(String emailUser, int page, int size) {
        var pageable = PaginationUtils.pageRequest(page, size, Sort.by(Sort.Direction.DESC, "dateCreation"));
        if (emailUser == null) {
            return PagedResponse.fromPage(projetRepository
                    .findByStatutInAndVisibilite(STATUTS_DIFFUSABLES, VisibiliteProjet.PUBLIC, pageable)
                    .map(ProjetResponse::fromEntity));
        }

        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (user.getRole() == Role.ADMIN || user.getRole() == Role.SUPER_ADMIN) {
            return PagedResponse.fromPage(projetRepository
                    .findAll(pageable)
                    .map(ProjetResponse::fromEntity));
        }

        if (user.getRole() == Role.MEMBRE) {
            Long groupeId = membreGroupeRepository
                    .findFirstByUserIdAndStatut(user.getId(), StatutMembre.ACCEPTE)
                    .map(MembreGroupe::getGroupe)
                    .map(Groupe::getId)
                    .orElse(null);
            return PagedResponse.fromPage(projetRepository
                    .findVisibleForMembre(
                            user.getId(),
                            groupeId,
                            VisibiliteProjet.GROUPE,
                            STATUTS_DIFFUSABLES,
                            List.of(VisibiliteProjet.COMMUNAUTE, VisibiliteProjet.PARTENAIRES, VisibiliteProjet.PUBLIC),
                            pageable)
                    .map(ProjetResponse::fromEntity));
        }

        if (user.getRole() == Role.REFERENT) {
            return PagedResponse.fromPage(projetRepository
                    .findVisibleForReferent(
                            user.getId(),
                            STATUTS_DIFFUSABLES,
                            List.of(VisibiliteProjet.COMMUNAUTE, VisibiliteProjet.PARTENAIRES, VisibiliteProjet.PUBLIC),
                            pageable)
                    .map(ProjetResponse::fromEntity));
        }

        if (user.getRole() == Role.PARTENAIRE) {
            return PagedResponse.fromPage(projetRepository
                    .findVisibleForPartenaire(
                            user.getId(),
                            STATUTS_DIFFUSABLES,
                            List.of(VisibiliteProjet.PARTENAIRES, VisibiliteProjet.PUBLIC),
                            pageable)
                    .map(ProjetResponse::fromEntity));
        }

        return PagedResponse.fromPage(org.springframework.data.domain.Page.<ProjetResponse>empty(pageable));
    }

    public List<ProjetResponse> listerProjetsPublics() {
        return listerProjetsVisibles(null);
    }

    // ─── Lister tous les projets (ADMIN / REFERENT) ───────────────────────────

    public List<ProjetResponse> listerTousProjets() {
        return projetRepository.findAll()
                .stream()
                .map(ProjetResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public PagedResponse<ProjetResponse> listerTousProjetsPage(int page, int size) {
        return PagedResponse.fromPage(projetRepository
                .findAll(PaginationUtils.pageRequest(page, size, Sort.by(Sort.Direction.DESC, "dateCreation")))
                .map(ProjetResponse::fromEntity));
    }

    // ─── Détail d'un projet ───────────────────────────────────────────────────

    public ProjetResponse getProjet(Long id) {
        return getProjet(id, null);
    }

    public ProjetResponse getProjet(Long id, String emailUser) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        verifierAccesProjet(projet, emailUser);
        return ProjetResponse.fromEntity(projet);
    }

    // ─── Proposer un projet (M24) ─────────────────────────────────────────────

    public ProjetResponse proposerProjet(ProjetRequest request, String emailPorteur) {
        User porteur = userRepository.findByEmail(emailPorteur)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        Projet projet = new Projet();
        projet.setTitre(request.getTitre());
        projet.setDescription(request.getDescription());
        projet.setObjectifs(request.getObjectifs());
        projet.setBudgetDemande(request.getBudgetDemande());
        projet.setPorteur(porteur);
        projet.setStatut(StatutProjet.BROUILLON);
        projet.setVisibilite(request.getVisibilite());

        if (porteur.getRole() == Role.MEMBRE) {
            MembreGroupe adhesionActive = membreGroupeRepository
                    .findFirstByUserIdAndStatut(porteur.getId(), StatutMembre.ACCEPTE)
                    .orElseThrow(() -> new RuntimeException("Vous devez etre accepte dans un groupe pour proposer un projet."));
            projet.setGroupe(adhesionActive.getGroupe());
            verifierVisibiliteCreateur(porteur, projet.getVisibilite());
        } else if (porteur.getRole() == Role.REFERENT) {
            Groupe groupe = chargerGroupeEncadre(request.getGroupeId(), porteur);
            projet.setGroupe(groupe);
            verifierVisibiliteCreateur(porteur, projet.getVisibilite());
        } else if (porteur.getRole() == Role.ADMIN) {
            projet.setGroupe(chargerGroupeOptionnel(request.getGroupeId()));
        } else {
            throw new AccessDeniedException(
                    "Seuls les membres, les referents et les administrateurs peuvent creer un projet.");
        }

        verifierCoherenceGroupeVisibilite(projet);
        Projet saved = projetRepository.save(projet);
        auditerStatut(porteur, "PROJECT_CREATED", saved, null, nomStatut(saved.getStatut()),
                "Projet cree.", metadataProjet(saved));
        return ProjetResponse.fromEntity(saved);
    }

    // ─── Soumettre un projet pour validation ─────────────────────────────────

    public ProjetResponse soumettreProjet(Long id, String emailPorteur) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User porteur = userRepository.findByEmail(emailPorteur)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        verifierAccesProjet(projet, porteur, ActionProjet.MODIFIER);
        if (!projet.getPorteur().getId().equals(porteur.getId())) {
            throw new RuntimeException("Seul le porteur peut soumettre ce projet");
        }
        if (projet.getStatut() != StatutProjet.BROUILLON) {
            throw new RuntimeException("Ce projet ne peut pas être soumis dans son état actuel");
        }

        StatutProjet ancienStatut = projet.getStatut();
        projet.setStatut(StatutProjet.SOUMIS);
        projet.setDateSoumission(LocalDateTime.now());
        Projet saved = projetRepository.save(projet);
        notifierAdminsProjetSoumis(saved);
        auditerStatut(porteur, "PROJECT_SUBMITTED", saved, nomStatut(ancienStatut), nomStatut(saved.getStatut()),
                "Projet soumis pour validation.", metadataProjet(saved));
        return ProjetResponse.fromEntity(saved);
    }

    // ─── Modifier un projet (porteur / ADMIN) ────────────────────────────────

    public ProjetResponse modifierProjet(Long id, ProjetRequest request, String emailUser) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        verifierAccesProjet(projet, user, ActionProjet.MODIFIER);
        boolean isAdmin = user.getRole() == Role.ADMIN;
        boolean isPorteur = projet.getPorteur().getId().equals(user.getId());
        if (!isAdmin && !isPorteur) {
            throw new AccessDeniedException("Accès refusé");
        }

        projet.setTitre(request.getTitre());
        projet.setDescription(request.getDescription());
        projet.setObjectifs(request.getObjectifs());
        projet.setBudgetDemande(request.getBudgetDemande());
        projet.setVisibilite(request.getVisibilite());

        if (isAdmin) {
            projet.setGroupe(chargerGroupeOptionnel(request.getGroupeId()));
        } else if (user.getRole() == Role.REFERENT) {
            projet.setGroupe(chargerGroupeEncadre(request.getGroupeId(), user));
            verifierVisibiliteCreateur(user, projet.getVisibilite());
        } else {
            verifierVisibiliteCreateur(user, projet.getVisibilite());
        }
        verifierCoherenceGroupeVisibilite(projet);

        Projet saved = projetRepository.save(projet);
        auditerAction(user, "PROJECT_UPDATED", saved, "Projet modifie.", metadataProjet(saved));
        return ProjetResponse.fromEntity(saved);
    }

    // ─── Modifier un projet encadre par un REFERENT ─────────────────────────

    public ProjetResponse modifierProjetReferent(Long id, ProjetRequest request, String emailReferent) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User referent = userRepository.findByEmail(emailReferent)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (referent.getRole() != Role.REFERENT || !referentEncadreProjet(referent, projet)) {
            throw new AccessDeniedException("Vous ne pouvez modifier que les projets des groupes que vous encadrez.");
        }

        projet.setTitre(request.getTitre());
        projet.setDescription(request.getDescription());
        projet.setObjectifs(request.getObjectifs());
        projet.setBudgetDemande(request.getBudgetDemande());
        projet.setVisibilite(request.getVisibilite());
        projet.setGroupe(chargerGroupeEncadre(request.getGroupeId(), referent));
        verifierVisibiliteCreateur(referent, projet.getVisibilite());
        verifierCoherenceGroupeVisibilite(projet);

        Projet saved = projetRepository.save(projet);
        auditerAction(referent, "PROJECT_UPDATED", saved, "Projet modifie par referent.", metadataProjet(saved));
        return ProjetResponse.fromEntity(saved);
    }

    // ─── Validation terrain par REFERENT : ne valide jamais définitivement ───

    public ProjetResponse validerProjetReferent(Long id, String commentaire, String emailReferent) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User referent = chargerUtilisateur(emailReferent);

        verifierDecisionReferentAutorisee(projet, referent);

        StatutProjet ancienStatut = projet.getStatut();
        projet.setStatut(StatutProjet.VALIDE_REFERENT);
        projet.setCommentaireReferent(commentaire);
        projet.setReferentValidateur(referent);
        projet.setDateValidationReferent(LocalDateTime.now());
        projet.setDateRefusReferent(null);

        Projet saved = projetRepository.save(projet);
        notifierAdminsProjetValideReferent(saved, referent);
        notificationService.creer(
                saved.getPorteur(),
                "Projet validé par votre référent",
                "Votre projet \"" + saved.getTitre() + "\" a été validé par le référent et sera examiné par l'administration.",
                "VALIDATION_REFERENT_PROJET",
                "/projets/" + saved.getId());
        auditerStatut(referent, "PROJECT_REFERENT_APPROVED", saved,
                nomStatut(ancienStatut), nomStatut(saved.getStatut()),
                "Projet valide par referent.", metadataProjet(saved));
        return ProjetResponse.fromEntity(saved);
    }

    public ProjetResponse refuserProjetReferent(Long id, String commentaire, String emailReferent) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User referent = chargerUtilisateur(emailReferent);

        verifierDecisionReferentAutorisee(projet, referent);

        StatutProjet ancienStatut = projet.getStatut();
        projet.setStatut(StatutProjet.REFUSE_REFERENT);
        projet.setCommentaireReferent(commentaire);
        projet.setReferentValidateur(referent);
        projet.setDateRefusReferent(LocalDateTime.now());
        projet.setDateValidationReferent(null);

        Projet saved = projetRepository.save(projet);
        notificationService.creer(
                saved.getPorteur(),
                "Projet refusé par votre référent",
                "Votre projet \"" + saved.getTitre() + "\" a été refusé par le référent.",
                "REFUS_REFERENT_PROJET",
                "/projets/" + saved.getId());
        auditerStatut(referent, "PROJECT_REFERENT_REJECTED", saved,
                nomStatut(ancienStatut), nomStatut(saved.getStatut()),
                "Projet refuse par referent.", metadataProjet(saved));
        return ProjetResponse.fromEntity(saved);
    }

    // ─── Valider ou rejeter un projet (ADMIN / REFERENT) — A09, R13 ──────────

    public ProjetResponse validerProjet(Long id, boolean approuver, String commentaire, String emailAdmin) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User admin = chargerUtilisateur(emailAdmin);

        if (!projetPretPourDecisionAdmin(projet)) {
            throw new RuntimeException("Ce projet n'est pas en attente de validation administrative");
        }

        StatutProjet ancienStatut = projet.getStatut();
        projet.setStatut(approuver ? StatutProjet.APPROUVE : StatutProjet.REJETE);
        projet.setDateValidation(LocalDateTime.now());
        projet.setCommentaireAdmin(commentaire);
        Projet saved = projetRepository.save(projet);
        notificationService.creer(
                saved.getPorteur(),
                approuver ? "Projet validé" : "Projet refusé",
                approuver
                        ? "Votre projet \"" + saved.getTitre() + "\" a été validé."
                        : "Votre projet \"" + saved.getTitre() + "\" a été refusé.",
                approuver ? "VALIDATION_PROJET" : "REFUS_PROJET",
                "/projets/" + saved.getId());
        auditerStatut(admin, approuver ? "PROJECT_APPROVED" : "PROJECT_REJECTED", saved,
                nomStatut(ancienStatut), nomStatut(saved.getStatut()),
                approuver ? "Projet approuve." : "Projet rejete.", metadataProjet(saved));
        return ProjetResponse.fromEntity(saved);
    }

    // ─── Changer le statut d'un projet (ADMIN) — A10 ─────────────────────────

    public ProjetResponse changerStatut(Long id, StatutProjet nouveauStatut, String emailAdmin) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User admin = chargerUtilisateur(emailAdmin);

        StatutProjet ancienStatut = projet.getStatut();
        projet.setStatut(nouveauStatut);

        if (nouveauStatut == StatutProjet.TERMINE || nouveauStatut == StatutProjet.ARCHIVE) {
            projet.setDateCloture(LocalDateTime.now());
        }

        Projet saved = projetRepository.save(projet);
        notificationService.creer(
                saved.getPorteur(),
                "Statut du projet mis à jour",
                "Le projet \"" + saved.getTitre() + "\" est maintenant " + nouveauStatut + ".",
                "PROJET",
                "/projets/" + saved.getId());
        auditerStatut(admin, "PROJECT_STATUS_CHANGED", saved, nomStatut(ancienStatut), nomStatut(saved.getStatut()),
                "Statut du projet modifie.", metadataProjet(saved));
        return ProjetResponse.fromEntity(saved);
    }

    // ─── Supprimer un projet (ADMIN) ─────────────────────────────────────────

    public void supprimerProjet(Long id) {
        supprimerProjet(id, null);
    }

    public void supprimerProjet(Long id, String emailAdmin) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User admin = chargerUtilisateurOptionnel(emailAdmin);
        projetRepository.deleteById(id);
        auditerAction(admin, "PROJECT_DELETED", projet, "Projet supprime.", metadataProjet(projet));
    }

    // ─── Rejoindre un projet (M26) ────────────────────────────────────────────

    public void rejoindrProjet(Long projetId, String emailUser) {
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        Projet projet = projetRepository.findById(projetId)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));

        if (user.getRole() != Role.MEMBRE) {
            throw new AccessDeniedException("Seuls les membres peuvent rejoindre un projet.");
        }
        verifierAccesProjet(projet, user, ActionProjet.PARTICIPER);
        if (projet.getGroupe() == null || !membreAppartientAuGroupeActif(user, projet.getGroupe())) {
            throw new AccessDeniedException("Vous ne pouvez rejoindre que les projets de votre groupe actif.");
        }
        if (participationRepository.existsByUserIdAndProjetId(user.getId(), projetId)) {
            throw new RuntimeException("Vous participez déjà à ce projet");
        }

        ParticipationProjet participation = new ParticipationProjet(user, projet);
        participationRepository.save(participation);
        if (projet.getPorteur() != null && !projet.getPorteur().getId().equals(user.getId())) {
            notificationService.creer(
                    projet.getPorteur(),
                    "Nouveau participant",
                    user.getPrenom() + " rejoint le projet \"" + projet.getTitre() + "\".",
                    "PROJET",
                    "/projets/" + projet.getId());
        }
        auditerAction(user, "PROJECT_JOINED", projet, "Participation au projet creee.",
                metadata("groupeId", idGroupe(projet), "porteurId", idPorteur(projet), "membreId", user.getId()));
    }

    // ─── Commenter un projet (M27) ────────────────────────────────────────────

    public CommentaireResponse commenterProjet(Long projetId, CommentaireRequest request, String emailUser) {
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        Projet projet = projetRepository.findById(projetId)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));

        verifierAccesProjet(projet, user, ActionProjet.LIRE);
        CommentaireProjet commentaire = new CommentaireProjet(request.getContenu(), user, projet);
        CommentaireProjet saved = commentaireRepository.save(commentaire);
        if (projet.getPorteur() != null && !projet.getPorteur().getId().equals(user.getId())) {
            notificationService.creer(
                    projet.getPorteur(),
                    "Nouveau commentaire",
                    user.getPrenom() + " a commenté le projet \"" + projet.getTitre() + "\".",
                    "PROJET",
                    "/projets/" + projet.getId());
        }
        auditerAction(user, "PROJECT_COMMENTED", projet, "Commentaire ajoute au projet.",
                metadata("groupeId", idGroupe(projet), "porteurId", idPorteur(projet), "commentaireId", saved.getId()));
        return CommentaireResponse.fromEntity(saved);
    }

    // ─── Commentaires d'un projet ─────────────────────────────────────────────

    public List<CommentaireResponse> getCommentaires(Long projetId) {
        return getCommentaires(projetId, null);
    }

    public List<CommentaireResponse> getCommentaires(Long projetId, String emailUser) {
        Projet projet = projetRepository.findById(projetId)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        verifierAccesProjet(projet, emailUser);
        return commentaireRepository.findByProjetIdOrderByDateCommentaireAsc(projetId)
                .stream()
                .map(CommentaireResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public PagedResponse<CommentaireResponse> getCommentairesPage(
            Long projetId,
            String emailUser,
            int page,
            int size
    ) {
        Projet projet = projetRepository.findById(projetId)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        verifierAccesProjet(projet, emailUser);
        return PagedResponse.fromPage(commentaireRepository
                .findByProjetId(
                        projetId,
                        PaginationUtils.pageRequest(page, size, Sort.by(Sort.Direction.DESC, "dateCommentaire"))
                )
                .map(CommentaireResponse::fromEntity));
    }

    // ─── Mes projets (porteur connecté) — M28 ────────────────────────────────

    public List<ProjetResponse> mesProjets(String emailUser) {
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return projetRepository.findByPorteurId(user.getId())
                .stream()
                .map(ProjetResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Projets auxquels je participe ───────────────────────────────────────

    public List<ProjetResponse> mesProjetsParticipation(String emailUser) {
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return participationRepository.findByUserId(user.getId())
                .stream()
                .map(p -> ProjetResponse.fromEntity(p.getProjet()))
                .collect(Collectors.toList());
    }

    // ─── Projets soumis en attente (ADMIN / REFERENT) ────────────────────────

    public List<ProjetResponse> projetsSoumis() {
        // Transition douce V2.3 : les nouveaux projets arrivent en VALIDE_REFERENT.
        // Les anciens projets deja SOUMIS restent visibles temporairement pour ne pas
        // bloquer la file admin avant migration.
        return projetRepository.findByStatutIn(List.of(StatutProjet.VALIDE_REFERENT, StatutProjet.SOUMIS))
                .stream()
                .map(ProjetResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public List<ProjetResponse> projetsGroupesReferent(String emailReferent) {
        User referent = userRepository.findByEmail(emailReferent)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        if (referent.getRole() != Role.REFERENT) {
            throw new RuntimeException("Seuls les referents peuvent consulter les projets de leurs groupes.");
        }
        return projetRepository.findByGroupeReferentEmail(emailReferent)
                .stream()
                .map(ProjetResponse::fromEntity)
                .collect(Collectors.toList());
    }

    private void verifierAccesProjet(Projet projet, String emailUser) {
        if (emailUser == null) {
            if (estProjetPublic(projet)) {
                return;
            }
            throw new AccessDeniedException("Acces refuse au projet.");
        }
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        verifierAccesProjet(projet, user, ActionProjet.LIRE);
    }

    private void verifierAccesProjet(Projet projet, User user, ActionProjet action) {
        if (peutConsulterProjet(projet, user)
                && (action == ActionProjet.LIRE
                    || action == ActionProjet.PARTICIPER
                    || estPorteur(user, projet)
                    || user.getRole() == Role.ADMIN)) {
            return;
        }
        throw new AccessDeniedException("Acces refuse au projet.");
    }

    private boolean estProjetPublic(Projet projet) {
        return projet.getVisibilite() == VisibiliteProjet.PUBLIC
                && STATUTS_DIFFUSABLES.contains(projet.getStatut());
    }

    private boolean peutConsulterProjet(Projet projet, User user) {
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.SUPER_ADMIN) {
            return true;
        }
        if (estPorteur(user, projet)) {
            return true;
        }

        boolean membreDuGroupe = user.getRole() == Role.MEMBRE
                && projet.getGroupe() != null
                && membreAppartientAuGroupeActif(user, projet.getGroupe());
        boolean referentDuGroupe = user.getRole() == Role.REFERENT
                && referentEncadreProjet(user, projet);

        if (projet.getVisibilite() == VisibiliteProjet.GROUPE) {
            return membreDuGroupe || referentDuGroupe;
        }
        if (!STATUTS_DIFFUSABLES.contains(projet.getStatut())) {
            return referentDuGroupe;
        }

        return switch (projet.getVisibilite()) {
            case COMMUNAUTE -> user.getRole() == Role.MEMBRE || user.getRole() == Role.REFERENT;
            case PARTENAIRES -> user.getRole() == Role.MEMBRE
                    || user.getRole() == Role.REFERENT
                    || user.getRole() == Role.PARTENAIRE;
            case PUBLIC -> true;
            case GROUPE -> membreDuGroupe || referentDuGroupe;
        };
    }

    private boolean estPorteur(User user, Projet projet) {
        return projet.getPorteur() != null
                && projet.getPorteur().getId() != null
                && projet.getPorteur().getId().equals(user.getId());
    }

    private void notifierAdminsProjetSoumis(Projet projet) {
        for (User admin : userRepository.findByRoleAndActifTrue(Role.ADMIN)) {
            notificationService.creer(
                    admin,
                    "Projet soumis",
                    "Le projet \"" + projet.getTitre() + "\" attend une validation.",
                    "PROJET",
                    "/admin/projets");
        }
    }

    private void notifierAdminsProjetValideReferent(Projet projet, User referent) {
        String nomReferent = referent.getPrenom() != null ? referent.getPrenom() : referent.getEmail();
        for (User admin : userRepository.findByRoleAndActifTrue(Role.ADMIN)) {
            notificationService.creer(
                    admin,
                    "Projet validé par référent",
                    "Le projet \"" + projet.getTitre() + "\" a été validé par " + nomReferent + " et attend une décision finale.",
                    "VALIDATION_REFERENT_PROJET",
                    "/admin/projets");
        }
    }

    private Groupe chargerGroupeEncadre(Long groupeId, User referent) {
        if (groupeId == null) {
            throw new RuntimeException("Le groupe est obligatoire pour un projet referent.");
        }
        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable"));
        if (groupe.getReferent() == null
                || groupe.getReferent().getId() == null
                || !groupe.getReferent().getId().equals(referent.getId())) {
            throw new AccessDeniedException("Vous ne pouvez creer un projet que pour un groupe que vous encadrez.");
        }
        return groupe;
    }

    private Groupe chargerGroupeOptionnel(Long groupeId) {
        if (groupeId == null) {
            return null;
        }
        return groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable"));
    }

    private void verifierVisibiliteCreateur(User user, VisibiliteProjet visibilite) {
        if ((user.getRole() == Role.MEMBRE || user.getRole() == Role.REFERENT)
                && visibilite != VisibiliteProjet.GROUPE
                && visibilite != VisibiliteProjet.COMMUNAUTE) {
            throw new AccessDeniedException(
                    "Les membres et referents peuvent choisir uniquement GROUPE ou COMMUNAUTE.");
        }
    }

    private void verifierCoherenceGroupeVisibilite(Projet projet) {
        if (projet.getVisibilite() == VisibiliteProjet.GROUPE && projet.getGroupe() == null) {
            throw new RuntimeException("Un projet de visibilite GROUPE doit etre rattache a un groupe.");
        }
    }

    private boolean membreAppartientAuGroupeActif(User user, Groupe groupe) {
        if (groupe == null || groupe.getId() == null) {
            return false;
        }
        Optional<MembreGroupe> adhesionActive = membreGroupeRepository
                .findFirstByUserIdAndStatut(user.getId(), StatutMembre.ACCEPTE);
        return adhesionActive
                .map(MembreGroupe::getGroupe)
                .map(Groupe::getId)
                .map(groupe.getId()::equals)
                .orElse(false);
    }

    private boolean referentEncadreProjet(User referent, Projet projet) {
        if (projet.getGroupe() == null
                || projet.getGroupe().getReferent() == null
                || projet.getGroupe().getReferent().getId() == null) {
            return false;
        }
        return projet.getGroupe().getReferent().getId().equals(referent.getId());
    }

    private void verifierDecisionReferentAutorisee(Projet projet, User referent) {
        if (referent.getRole() != Role.REFERENT || !referentEncadreProjet(referent, projet)) {
            throw new AccessDeniedException("Vous ne pouvez valider que les projets des groupes que vous encadrez.");
        }
        if (projet.getStatut() != StatutProjet.SOUMIS) {
            throw new RuntimeException("Le projet doit etre en statut SOUMIS pour etre relu par un referent.");
        }
    }

    private boolean projetPretPourDecisionAdmin(Projet projet) {
        return projet.getStatut() == StatutProjet.VALIDE_REFERENT
                || projet.getStatut() == StatutProjet.SOUMIS;
    }

    private User chargerUtilisateur(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
    }

    private User chargerUtilisateurOptionnel(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return chargerUtilisateur(email);
    }

    private void auditerAction(User acteur, String action, Projet projet, String details, String metadataJson) {
        try {
            auditLogService.logAction(
                    acteur,
                    action,
                    TARGET_PROJECT,
                    projet.getId(),
                    projet.getTitre(),
                    null,
                    details,
                    metadataJson);
        } catch (Exception ex) {
            log.warn("Echec audit {} pour le projet {}: {}", action, projet.getId(), ex.getMessage());
        }
    }

    private void auditerStatut(
            User acteur,
            String action,
            Projet projet,
            String ancienStatut,
            String nouveauStatut,
            String details,
            String metadataJson) {
        try {
            auditLogService.logStatusChange(
                    acteur,
                    action,
                    TARGET_PROJECT,
                    projet.getId(),
                    projet.getTitre(),
                    ancienStatut,
                    nouveauStatut,
                    details,
                    metadataJson);
        } catch (Exception ex) {
            log.warn("Echec audit {} pour le projet {}: {}", action, projet.getId(), ex.getMessage());
        }
    }

    private String metadataProjet(Projet projet) {
        return metadata(
                "groupeId", idGroupe(projet),
                "porteurId", idPorteur(projet),
                "budgetDemande", projet.getBudgetDemande());
    }

    private Long idGroupe(Projet projet) {
        return projet.getGroupe() != null ? projet.getGroupe().getId() : null;
    }

    private Long idPorteur(Projet projet) {
        return projet.getPorteur() != null ? projet.getPorteur().getId() : null;
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

    private enum ActionProjet {
        LIRE,
        MODIFIER,
        PARTICIPER
    }
}
