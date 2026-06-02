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

    private final ProjetRepository projetRepository;
    private final ParticipationProjetRepository participationRepository;
    private final CommentaireProjetRepository commentaireRepository;
    private final UserRepository userRepository;
    private final GroupeRepository groupeRepository;
    private final MembreGroupeRepository membreGroupeRepository;

    public ProjetService(ProjetRepository projetRepository,
                         ParticipationProjetRepository participationRepository,
                         CommentaireProjetRepository commentaireRepository,
                         UserRepository userRepository,
                         GroupeRepository groupeRepository,
                         MembreGroupeRepository membreGroupeRepository) {
        this.projetRepository = projetRepository;
        this.participationRepository = participationRepository;
        this.commentaireRepository = commentaireRepository;
        this.userRepository = userRepository;
        this.groupeRepository = groupeRepository;
        this.membreGroupeRepository = membreGroupeRepository;
    }

    // ─── Lister les projets publics (APPROUVE + EN_COURS) ────────────────────

    public List<ProjetResponse> listerProjetsPublics() {
        return projetRepository.findByStatutIn(
                List.of(StatutProjet.APPROUVE, StatutProjet.EN_COURS, StatutProjet.TERMINE))
                .stream()
                .map(ProjetResponse::fromEntity)
                .collect(Collectors.toList());
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

        if (porteur.getRole() == Role.MEMBRE) {
            MembreGroupe adhesionActive = membreGroupeRepository
                    .findFirstByUserIdAndStatut(porteur.getId(), StatutMembre.ACCEPTE)
                    .orElseThrow(() -> new RuntimeException("Vous devez etre accepte dans un groupe pour proposer un projet."));
            projet.setGroupe(adhesionActive.getGroupe());
        } else if (porteur.getRole() != Role.ADMIN) {
            throw new RuntimeException("Seuls les membres acceptes dans un groupe et les ADMIN peuvent creer un projet.");
        }

        return ProjetResponse.fromEntity(projetRepository.save(projet));
    }

    // ─── Soumettre un projet pour validation ─────────────────────────────────

    public ProjetResponse soumettreProjet(Long id, String emailPorteur) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User porteur = userRepository.findByEmail(emailPorteur)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        verifierAccesProjet(projet, porteur);
        if (!projet.getPorteur().getId().equals(porteur.getId())) {
            throw new RuntimeException("Seul le porteur peut soumettre ce projet");
        }
        if (projet.getStatut() != StatutProjet.BROUILLON) {
            throw new RuntimeException("Ce projet ne peut pas être soumis dans son état actuel");
        }

        projet.setStatut(StatutProjet.SOUMIS);
        projet.setDateSoumission(LocalDateTime.now());
        return ProjetResponse.fromEntity(projetRepository.save(projet));
    }

    // ─── Modifier un projet (porteur / ADMIN) ────────────────────────────────

    public ProjetResponse modifierProjet(Long id, ProjetRequest request, String emailUser) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        verifierAccesProjet(projet, user);
        boolean isAdmin = user.getRole() == Role.ADMIN;
        boolean isPorteur = projet.getPorteur().getId().equals(user.getId());
        if (!isAdmin && !isPorteur) {
            throw new AccessDeniedException("Accès refusé");
        }

        projet.setTitre(request.getTitre());
        projet.setDescription(request.getDescription());
        projet.setObjectifs(request.getObjectifs());
        projet.setBudgetDemande(request.getBudgetDemande());

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
        return ProjetResponse.fromEntity(projetRepository.save(projet));
    }

    // ─── Changer le statut d'un projet (ADMIN) — A10 ─────────────────────────

    public ProjetResponse changerStatut(Long id, StatutProjet nouveauStatut, String emailAdmin) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));

        projet.setStatut(nouveauStatut);

        if (nouveauStatut == StatutProjet.TERMINE || nouveauStatut == StatutProjet.ARCHIVE) {
            projet.setDateCloture(LocalDateTime.now());
        }

        return ProjetResponse.fromEntity(projetRepository.save(projet));
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
        verifierAccesProjet(projet, user);
        if (projet.getGroupe() == null || !membreAppartientAuGroupeActif(user, projet.getGroupe())) {
            throw new AccessDeniedException("Vous ne pouvez rejoindre que les projets de votre groupe actif.");
        }
        if (participationRepository.existsByUserIdAndProjetId(user.getId(), projetId)) {
            throw new RuntimeException("Vous participez déjà à ce projet");
        }

        ParticipationProjet participation = new ParticipationProjet(user, projet);
        participationRepository.save(participation);
    }

    // ─── Commenter un projet (M27) ────────────────────────────────────────────

    public CommentaireResponse commenterProjet(Long projetId, CommentaireRequest request, String emailUser) {
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        Projet projet = projetRepository.findById(projetId)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));

        verifierAccesProjet(projet, user);
        CommentaireProjet commentaire = new CommentaireProjet(request.getContenu(), user, projet);
        return CommentaireResponse.fromEntity(commentaireRepository.save(commentaire));
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
        if (estProjetPublic(projet)) {
            return;
        }
        if (emailUser == null) {
            throw new AccessDeniedException("Acces refuse au projet.");
        }
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        verifierAccesProjet(projet, user);
    }

    private void verifierAccesProjet(Projet projet, User user) {
        if (estProjetPublic(projet)) {
            return;
        }
        if (user.getRole() == Role.ADMIN) {
            return;
        }
        if (user.getRole() == Role.SUPER_ADMIN) {
            throw new AccessDeniedException("Acces refuse au projet.");
        }
        if (user.getRole() == Role.MEMBRE) {
            boolean isPorteur = projet.getPorteur() != null
                    && projet.getPorteur().getId() != null
                    && projet.getPorteur().getId().equals(user.getId());
            if (isPorteur || (projet.getGroupe() != null && membreAppartientAuGroupeActif(user, projet.getGroupe()))) {
                return;
            }
        }
        if (user.getRole() == Role.REFERENT && referentEncadreProjet(user, projet)) {
            return;
        }
        throw new AccessDeniedException("Acces refuse au projet.");
    }

    private boolean estProjetPublic(Projet projet) {
        return List.of(StatutProjet.APPROUVE, StatutProjet.EN_COURS, StatutProjet.TERMINE)
                .contains(projet.getStatut());
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
}
