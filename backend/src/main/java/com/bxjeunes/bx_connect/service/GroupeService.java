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

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class GroupeService {

    private final GroupeRepository groupeRepository;
    private final MembreGroupeRepository membreGroupeRepository;
    private final UserRepository userRepository;

    public GroupeService(GroupeRepository groupeRepository,
                         MembreGroupeRepository membreGroupeRepository,
                         UserRepository userRepository) {
        this.groupeRepository = groupeRepository;
        this.membreGroupeRepository = membreGroupeRepository;
        this.userRepository = userRepository;
    }

    // ─── Lister tous les groupes actifs (public) ─────────────────────────────

    public List<GroupeResponse> listerGroupes() {
        return groupeRepository.findByActifTrue()
                .stream()
                .map(GroupeResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Rechercher un groupe par nom (M17) ──────────────────────────────────

    public List<GroupeResponse> rechercherParNom(String nom) {
        return groupeRepository.findByActifTrueAndNomContainingIgnoreCase(nom)
                .stream()
                .map(GroupeResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Détail d'un groupe ───────────────────────────────────────────────────

    public GroupeResponse getGroupe(Long id) {
        Groupe groupe = groupeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable"));
        return GroupeResponse.fromEntity(groupe);
    }

    // ─── Créer un groupe (REFERENT / ADMIN) ──────────────────────────────────

    public GroupeResponse creerGroupe(GroupeRequest request, String emailReferent) {
        User referent = userRepository.findByEmail(emailReferent)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        Groupe groupe = new Groupe();
        groupe.setNom(request.getNom());
        groupe.setDescription(request.getDescription());
        groupe.setCategorie(request.getCategorie());
        groupe.setReferent(referent);

        Groupe saved = groupeRepository.save(groupe);
        return GroupeResponse.fromEntity(saved);
    }

    // ─── Modifier un groupe (REFERENT propriétaire / ADMIN) ──────────────────

    public GroupeResponse modifierGroupe(Long id, GroupeRequest request, String emailUser) {
        Groupe groupe = groupeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable"));

        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        // Vérification : seul le référent du groupe ou un admin peut modifier
        boolean isAdmin = user.getRole() == Role.ADMIN;
        boolean isReferent = groupe.getReferent().getId().equals(user.getId());
        if (!isAdmin && !isReferent) {
            throw new RuntimeException("Accès refusé");
        }

        groupe.setNom(request.getNom());
        groupe.setDescription(request.getDescription());
        groupe.setCategorie(request.getCategorie());

        return GroupeResponse.fromEntity(groupeRepository.save(groupe));
    }

    // ─── Supprimer un groupe (ADMIN) ─────────────────────────────────────────

    public void supprimerGroupe(Long id) {
        Groupe groupe = groupeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable"));
        groupe.setActif(false);
        groupeRepository.save(groupe);
    }

    // ─── Rejoindre un groupe (M18) ────────────────────────────────────────────

    public MembreGroupeResponse rejoindrGroupe(Long groupeId, String emailUser) {
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable"));

        if (membreGroupeRepository.existsByUserIdAndGroupeId(user.getId(), groupeId)) {
            throw new RuntimeException("Vous avez déjà une demande ou êtes déjà membre de ce groupe");
        }

        MembreGroupe mg = new MembreGroupe(user, groupe);
        return MembreGroupeResponse.fromEntity(membreGroupeRepository.save(mg));
    }

    // ─── Quitter un groupe (M19) ──────────────────────────────────────────────

    public void quitterGroupe(Long groupeId, String emailUser) {
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        MembreGroupe mg = membreGroupeRepository.findByUserIdAndGroupeId(user.getId(), groupeId)
                .orElseThrow(() -> new RuntimeException("Vous n'êtes pas membre de ce groupe"));

        mg.setStatut(StatutMembre.QUITTE);
        membreGroupeRepository.save(mg);
    }

    // ─── Consulter les membres d'un groupe (M20) ─────────────────────────────

    public List<MembreGroupeResponse> getMembresAcceptes(Long groupeId) {
        return membreGroupeRepository.findByGroupeIdAndStatut(groupeId, StatutMembre.ACCEPTE)
                .stream()
                .map(MembreGroupeResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Demandes en attente (R04) ────────────────────────────────────────────

    public List<MembreGroupeResponse> getDemandesEnAttente(Long groupeId, String emailReferent) {
        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable"));
        User referent = userRepository.findByEmail(emailReferent)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        boolean isAdmin = referent.getRole() == Role.ADMIN;
        boolean isReferent = groupe.getReferent().getId().equals(referent.getId());
        if (!isAdmin && !isReferent) {
            throw new RuntimeException("Accès refusé");
        }

        return membreGroupeRepository.findByGroupeIdAndStatut(groupeId, StatutMembre.EN_ATTENTE)
                .stream()
                .map(MembreGroupeResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Accepter ou refuser une demande (R04) ────────────────────────────────

    public MembreGroupeResponse traiterDemande(Long membreGroupeId, boolean accepter, String emailReferent) {
        MembreGroupe mg = membreGroupeRepository.findById(membreGroupeId)
                .orElseThrow(() -> new RuntimeException("Demande introuvable"));

        User referent = userRepository.findByEmail(emailReferent)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        Groupe groupe = mg.getGroupe();
        boolean isAdmin = referent.getRole() == Role.ADMIN;
        boolean isReferent = groupe.getReferent().getId().equals(referent.getId());
        if (!isAdmin && !isReferent) {
            throw new RuntimeException("Accès refusé");
        }

        mg.setStatut(accepter ? StatutMembre.ACCEPTE : StatutMembre.REFUSE);
        return MembreGroupeResponse.fromEntity(membreGroupeRepository.save(mg));
    }

    // ─── Mes groupes (membre connecté) ───────────────────────────────────────

    public List<GroupeResponse> mesGroupes(String emailUser) {
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        return membreGroupeRepository.findByUserIdAndStatut(user.getId(), StatutMembre.ACCEPTE)
                .stream()
                .map(mg -> GroupeResponse.fromEntity(mg.getGroupe()))
                .collect(Collectors.toList());
    }

    // ─── Groupes gérés par un référent ───────────────────────────────────────

    public List<GroupeResponse> groupesParReferent(String emailReferent) {
        User referent = userRepository.findByEmail(emailReferent)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return groupeRepository.findByReferentId(referent.getId())
                .stream()
                .map(GroupeResponse::fromEntity)
                .collect(Collectors.toList());
    }
}