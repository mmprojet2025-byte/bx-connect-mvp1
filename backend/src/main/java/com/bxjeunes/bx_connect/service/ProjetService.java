package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.*;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
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

    private static final List<StatutProjet> STATUTS_DIFFUSABLES =
            List.of(StatutProjet.APPROUVE, StatutProjet.EN_COURS, StatutProjet.TERMINE);

    private final ProjetRepository projetRepository;
    private final ParticipationProjetRepository participationRepository;
    private final CommentaireProjetRepository commentaireRepository;
    private final UserRepository userRepository;
    private final GroupeRepository groupeRepository;
    private final MembreGroupeRepository membreGroupeRepository;
    private final NotificationService notificationService;

    public ProjetService(ProjetRepository projetRepository,
                         ParticipationProjetRepository participationRepository,
                         CommentaireProjetRepository commentaireRepository,
                         UserRepository userRepository,
                         GroupeRepository groupeRepository,
                         MembreGroupeRepository membreGroupeRepository,
                         NotificationService notificationService) {
        this.projetRepository = projetRepository;
        this.participationRepository = participationRepository;
        this.commentaireRepository = commentaireRepository;
        this.userRepository = userRepository;
        this.groupeRepository = groupeRepository;
        this.membreGroupeRepository = membreGroupeRepository;
        this.notificationService = notificationService;
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
        return ProjetResponse.fromEntity(projetRepository.save(projet));
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

        projet.setStatut(StatutProjet.SOUMIS);
        projet.setDateSoumission(LocalDateTime.now());
        Projet saved = projetRepository.save(projet);
        notifierAdminsProjetSoumis(saved);
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

        return ProjetResponse.fromEntity(projetRepository.save(projet));
    }

    // ─── Valider ou rejeter un projet (ADMIN / REFERENT) — A09, R13 ──────────

    public ProjetResponse validerProjet(Long id, boolean approuver, String commentaire, String emailAdmin) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));

        if (projet.getStatut() != StatutProjet.SOUMIS) {
            throw new RuntimeException("Ce projet n'est pas en attente de validation");
        }

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
        return ProjetResponse.fromEntity(saved);
    }

    // ─── Changer le statut d'un projet (ADMIN) — A10 ─────────────────────────

    public ProjetResponse changerStatut(Long id, StatutProjet nouveauStatut, String emailAdmin) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));

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
        return ProjetResponse.fromEntity(saved);
    }

    // ─── Supprimer un projet (ADMIN) ─────────────────────────────────────────

    public void supprimerProjet(Long id) {
        if (!projetRepository.existsById(id)) {
            throw new RuntimeException("Projet introuvable");
        }
        projetRepository.deleteById(id);
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
        return projetRepository.findByStatut(StatutProjet.SOUMIS)
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
                    "/projets/" + projet.getId());
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

    private enum ActionProjet {
        LIRE,
        MODIFIER,
        PARTICIPER
    }
}
