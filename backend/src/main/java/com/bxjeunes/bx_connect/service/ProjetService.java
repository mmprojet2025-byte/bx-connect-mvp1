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
        if (user.getRole() == Role.SUPER_ADMIN) {
            return projetRepository.findByStatutInAndVisibilite(
                            STATUTS_DIFFUSABLES, VisibiliteProjet.PUBLIC)
                    .stream()
                    .map(ProjetResponse::fromEntity)
                    .collect(Collectors.toList());
        }
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

        if (user.getRole() == Role.SUPER_ADMIN) {
            return PagedResponse.fromPage(projetRepository
                    .findByStatutInAndVisibilite(STATUTS_DIFFUSABLES, VisibiliteProjet.PUBLIC, pageable)
                    .map(ProjetResponse::fromEntity));
        }

        if (user.getRole() == Role.ADMIN) {
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
                .map(ProjetReviewResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public PagedResponse<ProjetResponse> listerTousProjetsPage(int page, int size) {
        return PagedResponse.fromPage(projetRepository
                .findAll(PaginationUtils.pageRequest(page, size, Sort.by(Sort.Direction.DESC, "dateCreation")))
                .map(projet -> (ProjetResponse) ProjetReviewResponse.fromEntity(projet)));
    }

    public ProjetAdminResponse getProjetAdmin(Long id, String emailAdmin) {
        exigerAdmin(emailAdmin);
        return ProjetAdminResponse.fromEntity(chargerProjet(id));
    }

    // ─── Détail d'un projet ───────────────────────────────────────────────────

    public ProjetResponse getProjet(Long id) {
        return getProjet(id, null);
    }

    public ProjetResponse getProjet(Long id, String emailUser) {
        if (emailUser != null) {
            User user = userRepository.findByEmail(emailUser)
                    .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
            if (user.getRole() == Role.SUPER_ADMIN) {
                return projetRepository.findByIdAndStatutInAndVisibilite(
                                id, STATUTS_DIFFUSABLES, VisibiliteProjet.PUBLIC)
                        .map(ProjetResponse::fromEntity)
                        .orElseThrow(() -> new RuntimeException("Projet introuvable"));
            }
        }
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
            if (request.getGroupeId() == null) {
                throw new RuntimeException("Le groupe doit etre choisi explicitement.");
            }
            MembreGroupe adhesionActive = membreGroupeRepository
                    .findByUserIdAndGroupeId(porteur.getId(), request.getGroupeId())
                    .filter(adhesion -> adhesion.getStatut() == StatutMembre.ACCEPTE)
                    .orElseThrow(() -> new RuntimeException("Vous devez etre accepte dans le groupe choisi pour proposer un projet."));
            projet.setGroupe(adhesionActive.getGroupe());
            verifierGroupeActifEtValide(projet.getGroupe());
            verifierVisibiliteCreateur(porteur, projet.getVisibilite());
        } else if (porteur.getRole() == Role.REFERENT) {
            Groupe groupe = chargerGroupeEncadre(request.getGroupeId(), porteur);
            verifierGroupeActifEtValide(groupe);
            projet.setGroupe(groupe);
            verifierVisibiliteCreateur(porteur, projet.getVisibilite());
        } else if (porteur.getRole() == Role.ADMIN) {
            Groupe groupe = chargerGroupeOptionnel(request.getGroupeId());
            if (groupe != null) {
                verifierGroupeActifEtValide(groupe);
                exigerTexte(request.getJustificationAdmin(), "Une justification est obligatoire pour un projet ADMIN rattache a un groupe.");
            }
            projet.setGroupe(groupe);
            projet.setJustificationAdmin(normaliserTexte(request.getJustificationAdmin()));
        } else {
            throw new AccessDeniedException(
                    "Seuls les membres, les referents et les administrateurs peuvent creer un projet.");
        }

        verifierCoherenceGroupeVisibilite(projet);
        Projet saved = projetRepository.save(projet);
        auditerStatut(porteur, "PROJECT_CREATED", saved, null, nomStatut(saved.getStatut()),
                "Projet cree.", metadataProjet(saved));
        return reponsePourActeur(saved, porteur);
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
        if (projet.getStatut() != StatutProjet.BROUILLON
                && projet.getStatut() != StatutProjet.A_CORRIGER_REFERENT
                && projet.getStatut() != StatutProjet.A_CORRIGER_ADMIN) {
            throw new RuntimeException("Ce projet ne peut pas être soumis dans son état actuel");
        }

        StatutProjet ancienStatut = projet.getStatut();
        if (projet.getGroupe() != null) {
            verifierGroupeActifEtValide(projet.getGroupe());
        }
        StatutProjet nouveauStatut;
        if (porteur.getRole() == Role.ADMIN) {
            if (ancienStatut != StatutProjet.BROUILLON) {
                throw new RuntimeException("Un projet ADMIN ne peut etre soumis que depuis BROUILLON.");
            }
            nouveauStatut = StatutProjet.APPROUVE;
            projet.setDateValidation(LocalDateTime.now());
        } else if (ancienStatut == StatutProjet.A_CORRIGER_ADMIN) {
            nouveauStatut = StatutProjet.VALIDE_REFERENT;
        } else {
            nouveauStatut = StatutProjet.SOUMIS;
        }
        projet.setStatut(nouveauStatut);
        projet.setDateSoumission(LocalDateTime.now());
        Projet saved = projetRepository.save(projet);
        if (nouveauStatut == StatutProjet.APPROUVE) {
            auditerStatut(porteur, "PROJECT_ADMIN_AUTO_APPROVED", saved,
                    nomStatut(ancienStatut), nomStatut(nouveauStatut),
                    "Projet ADMIN approuve automatiquement lors de sa soumission.", metadataProjet(saved));
        } else {
            if (ancienStatut == StatutProjet.A_CORRIGER_ADMIN) {
                notifierAdminsProjetValideReferent(saved);
                notifierReferentValidateurApresCorrectionAdmin(saved, porteur);
            } else {
                notifierReferentProjetSoumis(saved, porteur);
            }
            auditerStatut(porteur, "PROJECT_SUBMITTED", saved, nomStatut(ancienStatut), nomStatut(saved.getStatut()),
                    "Projet soumis pour validation.", metadataProjet(saved));
        }
        return reponsePourActeur(saved, porteur);
    }

    // ─── Modifier un projet (porteur / ADMIN) ────────────────────────────────

    public ProjetResponse modifierProjet(Long id, ProjetRequest request, String emailUser) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        verifierAccesProjet(projet, user, ActionProjet.MODIFIER);
        boolean isPorteur = projet.getPorteur().getId().equals(user.getId());
        if (!isPorteur) {
            throw new AccessDeniedException("Accès refusé");
        }
        verifierStatutModifiable(projet);

        projet.setTitre(request.getTitre());
        projet.setDescription(request.getDescription());
        projet.setObjectifs(request.getObjectifs());
        projet.setBudgetDemande(request.getBudgetDemande());
        projet.setVisibilite(request.getVisibilite());

        if (user.getRole() == Role.ADMIN) {
            Groupe groupe = chargerGroupeOptionnel(request.getGroupeId());
            if (groupe != null) {
                verifierGroupeActifEtValide(groupe);
                exigerTexte(request.getJustificationAdmin(), "Une justification est obligatoire pour un projet ADMIN rattache a un groupe.");
            }
            projet.setGroupe(groupe);
            projet.setJustificationAdmin(normaliserTexte(request.getJustificationAdmin()));
        } else if (user.getRole() == Role.REFERENT) {
            projet.setGroupe(chargerGroupeEncadre(request.getGroupeId(), user));
            verifierVisibiliteCreateur(user, projet.getVisibilite());
        } else {
            verifierVisibiliteCreateur(user, projet.getVisibilite());
        }
        verifierCoherenceGroupeVisibilite(projet);

        Projet saved = projetRepository.save(projet);
        auditerAction(user, "PROJECT_UPDATED", saved, "Projet modifie.", metadataProjet(saved));
        return reponsePourActeur(saved, user);
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
        if (!estPorteur(referent, projet)) {
            throw new AccessDeniedException("Seul le porteur peut corriger ce projet.");
        }
        verifierStatutModifiable(projet);

        projet.setTitre(request.getTitre());
        projet.setDescription(request.getDescription());
        projet.setObjectifs(request.getObjectifs());
        projet.setBudgetDemande(request.getBudgetDemande());
        projet.setVisibilite(request.getVisibilite());
        projet.setGroupe(chargerGroupeEncadre(request.getGroupeId(), referent));
        verifierGroupeActifEtValide(projet.getGroupe());
        verifierVisibiliteCreateur(referent, projet.getVisibilite());
        verifierCoherenceGroupeVisibilite(projet);

        Projet saved = projetRepository.save(projet);
        auditerAction(referent, "PROJECT_UPDATED", saved, "Projet modifie par referent.", metadataProjet(saved));
        return ProjetReviewResponse.fromEntity(saved);
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
        notifierAdminsProjetValideReferent(saved);
        notificationService.creer(
                saved.getPorteur(),
                "Projet validé par votre référent",
                "Votre projet \"" + saved.getTitre() + "\" a été validé par le référent et sera examiné par l'administration.",
                "VALIDATION_REFERENT_PROJET",
                "/projets/" + saved.getId());
        auditerStatut(referent, "PROJECT_REFERENT_APPROVED", saved,
                nomStatut(ancienStatut), nomStatut(saved.getStatut()),
                "Projet valide par referent.", metadataProjet(saved));
        return ProjetReviewResponse.fromEntity(saved);
    }

    public ProjetResponse refuserProjetReferent(Long id, String commentaire, String emailReferent) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User referent = chargerUtilisateur(emailReferent);

        verifierDecisionReferentAutorisee(projet, referent);
        exigerTexte(commentaire, "Le motif du refus est obligatoire.");

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
        return ProjetReviewResponse.fromEntity(saved);
    }

    public ProjetResponse demanderCorrectionReferent(Long id, String commentaire, String emailReferent) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User referent = chargerUtilisateur(emailReferent);
        verifierDecisionReferentAutorisee(projet, referent);
        exigerTexte(commentaire, "Le commentaire de correction est obligatoire.");
        return appliquerTransition(projet, referent, StatutProjet.A_CORRIGER_REFERENT,
                "PROJECT_REFERENT_CORRECTION_REQUESTED", commentaire, true);
    }

    // ─── Valider ou rejeter un projet (ADMIN / REFERENT) — A09, R13 ──────────

    public ProjetResponse validerProjet(Long id, boolean approuver, String commentaire, String emailAdmin) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User admin = exigerAdmin(emailAdmin);

        if (!projetPretPourDecisionAdmin(projet)) {
            throw new RuntimeException("Ce projet n'est pas en attente de validation administrative");
        }
        if (!approuver) {
            exigerTexte(commentaire, "Le motif du rejet est obligatoire.");
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
        return ProjetReviewResponse.fromEntity(saved);
    }

    public ProjetResponse demanderCorrectionAdmin(Long id, String commentaire, String emailAdmin) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User admin = exigerAdmin(emailAdmin);
        if (!projetPretPourDecisionAdmin(projet)) {
            throw new RuntimeException("Ce projet n'est pas en attente de validation administrative");
        }
        exigerTexte(commentaire, "Le commentaire de correction est obligatoire.");
        projet.setCommentaireAdmin(commentaire.trim());
        return appliquerTransition(projet, admin, StatutProjet.A_CORRIGER_ADMIN,
                "PROJECT_ADMIN_CORRECTION_REQUESTED", commentaire, true);
    }

    // ─── Changer le statut d'un projet (ADMIN) — A10 ─────────────────────────

    public ProjetResponse changerStatut(Long id, StatutProjet nouveauStatut, String emailAdmin) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User admin = exigerAdmin(emailAdmin);
        if (projet.getStatut() == StatutProjet.APPROUVE && nouveauStatut == StatutProjet.EN_COURS) {
            return demarrerProjetCharge(projet, admin);
        }
        if ((projet.getStatut() == StatutProjet.TERMINE
                || projet.getStatut() == StatutProjet.ANNULE
                || projet.getStatut() == StatutProjet.REJETE
                || projet.getStatut() == StatutProjet.REFUSE_REFERENT)
                && nouveauStatut == StatutProjet.ARCHIVE) {
            return archiverProjetCharge(projet, admin);
        }
        throw new RuntimeException("Transition de statut interdite; utilisez l'operation metier dediee.");
    }

    public ProjetResponse demarrerProjet(Long id, String emailAdmin) {
        return demarrerProjetCharge(chargerProjet(id), exigerAdmin(emailAdmin));
    }

    public ProjetResponse terminerProjet(Long id, String bilan, String emailAdmin) {
        Projet projet = chargerProjet(id);
        User admin = exigerAdmin(emailAdmin);
        verifierTransition(projet, StatutProjet.EN_COURS, StatutProjet.TERMINE);
        exigerTexte(bilan, "Le bilan est obligatoire pour terminer un projet.");
        projet.setBilan(bilan.trim());
        projet.setDateCloture(LocalDateTime.now());
        return appliquerTransition(projet, admin, StatutProjet.TERMINE, "PROJECT_COMPLETED", bilan, true);
    }

    public ProjetResponse archiverProjet(Long id, String emailAdmin) {
        return archiverProjetCharge(chargerProjet(id), exigerAdmin(emailAdmin));
    }

    public ProjetResponse annulerProjet(Long id, String motif, String emailUser) {
        Projet projet = chargerProjet(id);
        User user = chargerUtilisateur(emailUser);
        boolean porteur = estPorteur(user, projet);
        boolean admin = user.getRole() == Role.ADMIN;
        if (!porteur && !admin) {
            throw new AccessDeniedException("Seul le porteur ou un ADMIN autorise peut annuler ce projet.");
        }
        if (projet.getStatut() == StatutProjet.APPROUVE || projet.getStatut() == StatutProjet.EN_COURS) {
            if (!admin) throw new AccessDeniedException("Seul un ADMIN peut annuler un projet approuve ou en cours.");
            exigerTexte(motif, "Le motif d'annulation est obligatoire.");
        } else if (!List.of(StatutProjet.BROUILLON, StatutProjet.SOUMIS,
                StatutProjet.A_CORRIGER_REFERENT, StatutProjet.VALIDE_REFERENT,
                StatutProjet.A_CORRIGER_ADMIN).contains(projet.getStatut())) {
            throw new RuntimeException("Ce projet ne peut pas etre annule dans son etat actuel.");
        }
        projet.setDateCloture(LocalDateTime.now());
        return appliquerTransition(projet, user, StatutProjet.ANNULE, "PROJECT_CANCELLED", motif, true);
    }

    // ─── Supprimer un projet (ADMIN) ─────────────────────────────────────────

    public void supprimerProjet(Long id) {
        supprimerProjet(id, null);
    }

    public void supprimerProjet(Long id, String emailAdmin) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User acteur = chargerUtilisateurOptionnel(emailAdmin);
        if (projet.getStatut() != StatutProjet.BROUILLON) {
            throw new RuntimeException("Seul un brouillon jamais soumis peut etre supprime.");
        }
        if (acteur != null && acteur.getRole() != Role.ADMIN && !estPorteur(acteur, projet)) {
            throw new AccessDeniedException("Acces refuse");
        }
        projetRepository.delete(projet);
        auditerAction(acteur, "PROJECT_DELETED", projet, "Projet supprime.", metadataProjet(projet));
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
        if (user.getRole() == Role.SUPER_ADMIN) {
            throw new AccessDeniedException("Le SUPER_ADMIN technique n'a pas acces aux commentaires de projet.");
        }
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
        refuserCommentairesSuperAdmin(emailUser);
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
        refuserCommentairesSuperAdmin(emailUser);
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
        return projetRepository.findByStatut(StatutProjet.VALIDE_REFERENT)
                .stream()
                .map(ProjetReviewResponse::fromEntity)
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
                .map(ProjetReviewResponse::fromEntity)
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
        if (user.getRole() == Role.ADMIN) {
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

    private void refuserCommentairesSuperAdmin(String emailUser) {
        if (emailUser == null) {
            return;
        }
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        if (user.getRole() == Role.SUPER_ADMIN) {
            throw new AccessDeniedException("Le SUPER_ADMIN technique n'a pas acces aux commentaires de projet.");
        }
    }

    private void notifierReferentProjetSoumis(Projet projet, User acteur) {
        User referent = projet.getGroupe() == null ? null : projet.getGroupe().getReferent();
        if (referent != null && referent.isActif()
                && (acteur == null || !referent.getId().equals(acteur.getId()))) {
            notificationService.creer(
                    referent,
                    "Projet soumis",
                    "Le projet \"" + projet.getTitre() + "\" attend votre validation.",
                    "PROJET",
                    "/referent/projets");
        }
    }

    private void notifierAdminsProjetValideReferent(Projet projet) {
        for (User admin : userRepository.findByRoleAndActifTrue(Role.ADMIN)) {
            notificationService.creer(
                    admin,
                    "Projet validé par référent",
                    "Le projet \"" + projet.getTitre() + "\" attend une décision finale.",
                    "VALIDATION_REFERENT_PROJET",
                    "/admin/projets");
        }
    }

    private void notifierReferentValidateurApresCorrectionAdmin(Projet projet, User acteur) {
        User referent = projet.getReferentValidateur();
        if (referent != null && referent.isActif()
                && (acteur == null || !referent.getId().equals(acteur.getId()))) {
            notificationService.creer(
                    referent,
                    "Projet corrigé et resoumis",
                    "Le projet \"" + projet.getTitre() + "\" a été renvoyé à l'administration.",
                    "CORRECTION_ADMIN_PROJET",
                    "/referent/projets");
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
        return projet.getStatut() == StatutProjet.VALIDE_REFERENT;
    }

    private Projet chargerProjet(Long id) {
        return projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
    }

    private User exigerAdmin(String email) {
        User user = chargerUtilisateur(email);
        if (user.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Seul un ADMIN peut effectuer cette transition.");
        }
        return user;
    }

    private void verifierTransition(Projet projet, StatutProjet attendu, StatutProjet cible) {
        if (projet.getStatut() != attendu) {
            throw new RuntimeException("Transition interdite de " + projet.getStatut() + " vers " + cible + ".");
        }
    }

    private ProjetResponse demarrerProjetCharge(Projet projet, User admin) {
        verifierTransition(projet, StatutProjet.APPROUVE, StatutProjet.EN_COURS);
        return appliquerTransition(projet, admin, StatutProjet.EN_COURS, "PROJECT_STARTED", null, true);
    }

    private ProjetResponse archiverProjetCharge(Projet projet, User admin) {
        if (!List.of(StatutProjet.TERMINE, StatutProjet.ANNULE,
                StatutProjet.REJETE, StatutProjet.REFUSE_REFERENT).contains(projet.getStatut())) {
            throw new RuntimeException("Ce projet ne peut pas etre archive dans son etat actuel.");
        }
        projet.setDateCloture(LocalDateTime.now());
        return appliquerTransition(projet, admin, StatutProjet.ARCHIVE, "PROJECT_ARCHIVED", null, false);
    }

    private ProjetResponse appliquerTransition(
            Projet projet,
            User acteur,
            StatutProjet cible,
            String action,
            String commentaire,
            boolean notifierPorteur) {
        StatutProjet ancienStatut = projet.getStatut();
        projet.setStatut(cible);
        Projet saved = projetRepository.save(projet);
        if (notifierPorteur && saved.getPorteur() != null && !saved.getPorteur().getId().equals(acteur.getId())) {
            notificationService.creer(
                    saved.getPorteur(),
                    "Projet mis à jour",
                    "Le projet \"" + saved.getTitre() + "\" est maintenant " + cible + ".",
                    "PROJET",
                    "/projets/" + saved.getId());
        }
        auditerStatut(acteur, action, saved, nomStatut(ancienStatut), nomStatut(cible),
                "Transition technique du projet.", metadataProjet(saved));
        return reponsePourActeur(saved, acteur);
    }

    private ProjetResponse reponsePourActeur(Projet projet, User acteur) {
        if (acteur != null && (acteur.getRole() == Role.ADMIN || acteur.getRole() == Role.REFERENT)) {
            return ProjetReviewResponse.fromEntity(projet);
        }
        return ProjetResponse.fromEntity(projet);
    }

    private void verifierStatutModifiable(Projet projet) {
        if (!List.of(StatutProjet.BROUILLON, StatutProjet.A_CORRIGER_REFERENT,
                StatutProjet.A_CORRIGER_ADMIN).contains(projet.getStatut())) {
            throw new RuntimeException("Le contenu de ce projet ne peut pas etre modifie dans son etat actuel.");
        }
    }

    private void verifierGroupeActifEtValide(Groupe groupe) {
        if (groupe == null || !groupe.isActif() || groupe.getStatut() != StatutGroupe.VALIDE) {
            throw new RuntimeException("Le groupe doit etre actif et valide.");
        }
    }

    private void exigerTexte(String valeur, String message) {
        if (valeur == null || valeur.isBlank()) {
            throw new RuntimeException(message);
        }
        if (valeur.trim().length() > 500) {
            throw new RuntimeException("Le texte ne peut pas depasser 500 caracteres.");
        }
    }

    private String normaliserTexte(String valeur) {
        return valeur == null || valeur.isBlank() ? null : valeur.trim();
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
                "version", projet.getVersion());
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
