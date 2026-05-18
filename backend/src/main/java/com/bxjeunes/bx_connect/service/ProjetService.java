package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.*;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProjetService {

    private final ProjetRepository projetRepository;
    private final ParticipationProjetRepository participationRepository;
    private final CommentaireProjetRepository commentaireRepository;
    private final UserRepository userRepository;
    private final GroupeRepository groupeRepository;

    public ProjetService(ProjetRepository projetRepository,
                         ParticipationProjetRepository participationRepository,
                         CommentaireProjetRepository commentaireRepository,
                         UserRepository userRepository,
                         GroupeRepository groupeRepository) {
        this.projetRepository = projetRepository;
        this.participationRepository = participationRepository;
        this.commentaireRepository = commentaireRepository;
        this.userRepository = userRepository;
        this.groupeRepository = groupeRepository;
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
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
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

        if (request.getGroupeId() != null) {
            Groupe groupe = groupeRepository.findById(request.getGroupeId())
                    .orElseThrow(() -> new RuntimeException("Groupe introuvable"));
            projet.setGroupe(groupe);
        }

        return ProjetResponse.fromEntity(projetRepository.save(projet));
    }

    // ─── Soumettre un projet pour validation ─────────────────────────────────

    public ProjetResponse soumettreProjet(Long id, String emailPorteur) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));
        User porteur = userRepository.findByEmail(emailPorteur)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

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

        boolean isAdmin = user.getRole() == Role.ADMIN;
        boolean isPorteur = projet.getPorteur().getId().equals(user.getId());
        if (!isAdmin && !isPorteur) {
            throw new RuntimeException("Accès refusé");
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

    // ─── Rejoindre un projet (M26) ────────────────────────────────────────────

    public void rejoindrProjet(Long projetId, String emailUser) {
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        Projet projet = projetRepository.findById(projetId)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));

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

        CommentaireProjet commentaire = new CommentaireProjet(request.getContenu(), user, projet);
        return CommentaireResponse.fromEntity(commentaireRepository.save(commentaire));
    }

    // ─── Commentaires d'un projet ─────────────────────────────────────────────

    public List<CommentaireResponse> getCommentaires(Long projetId) {
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
}