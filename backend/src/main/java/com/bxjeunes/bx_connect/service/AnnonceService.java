package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AnnonceService {

    private final AnnonceRepository annonceRepository;
    private final UserRepository userRepository;
    private final GroupeRepository groupeRepository;
    private final MembreGroupeRepository membreGroupeRepository;

    public AnnonceService(AnnonceRepository annonceRepository,
                          UserRepository userRepository,
                          GroupeRepository groupeRepository,
                          MembreGroupeRepository membreGroupeRepository) {
        this.annonceRepository      = annonceRepository;
        this.userRepository         = userRepository;
        this.groupeRepository       = groupeRepository;
        this.membreGroupeRepository = membreGroupeRepository;
    }

    // ─── Créer une annonce ────────────────────────────────────────────────────
    // ADMIN → type GLOBALE (groupeId = null)
    // RÉFÉRENT → type GROUPE (groupeId obligatoire)
    public Map<String, Object> creerAnnonce(Map<String, Object> request, String emailAuteur) {
        User auteur = userRepository.findByEmail(emailAuteur)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        Annonce annonce = new Annonce();
        annonce.setTitre(request.get("titre").toString());
        annonce.setContenu(request.get("contenu").toString());
        annonce.setAuteur(auteur);

        if (auteur.getRole() == Role.REFERENT) {
            if (!request.containsKey("groupeId") || request.get("groupeId") == null) {
                throw new AccessDeniedException("Un référent ne peut pas créer d'annonce globale.");
            }
            Long groupeId = Long.valueOf(request.get("groupeId").toString());
            Groupe groupe = chargerGroupe(groupeId);
            verifierReferentDuGroupe(auteur, groupe);
            annonce.setGroupe(groupe);
            annonce.setType("GROUPE");
            annonce.setEpinglee(false);
        } else if (auteur.getRole() == Role.ADMIN) {
            if (request.containsKey("groupeId") && request.get("groupeId") != null) {
                annonce.setGroupe(chargerGroupe(Long.valueOf(request.get("groupeId").toString())));
                annonce.setType("GROUPE");
            } else {
                annonce.setType("GLOBALE");
            }
            if (request.containsKey("epinglee")) {
                annonce.setEpinglee(Boolean.parseBoolean(request.get("epinglee").toString()));
            }
        } else {
            throw new AccessDeniedException("Seuls les administrateurs et référents peuvent créer une annonce.");
        }

        return toMap(annonceRepository.save(annonce));
    }

    // ─── Annonces visibles pour un utilisateur connecté ──────────────────────
    public List<Map<String, Object>> annoncesVisibles(String emailUser) {
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (user.getRole() == Role.ADMIN) {
            return annonceRepository.findAll()
                    .stream().map(this::toMap).collect(Collectors.toList());
        }

        if (user.getRole() == Role.REFERENT) {
            List<Annonce> annonces = new ArrayList<>(
                    annonceRepository.findByTypeOrderByEpingleeDescDateCreationDesc("GLOBALE"));
            for (Groupe groupe : groupeRepository.findByReferentId(user.getId())) {
                annonces.addAll(annonceRepository
                        .findByGroupeIdOrderByEpingleeDescDateCreationDesc(groupe.getId()));
            }
            annonces.sort(Comparator.comparing(Annonce::isEpinglee).reversed()
                    .thenComparing(Annonce::getDateCreation, Comparator.reverseOrder()));
            return annonces.stream().map(this::toMap).collect(Collectors.toList());
        }

        // Trouver le groupe du membre
        return membreGroupeRepository.findFirstByUserIdAndStatut(user.getId(), StatutMembre.ACCEPTE)
                .map(membership -> annonceRepository.findAnnoncesVisibles(membership.getGroupe().getId())
                        .stream().map(this::toMap).collect(Collectors.toList()))
                .orElseGet(() -> {
            // Pas de groupe → seulement les annonces globales
                    return annonceRepository.findByTypeOrderByEpingleeDescDateCreationDesc("GLOBALE")
                            .stream().map(this::toMap).collect(Collectors.toList());
                });
    }

    // ─── Annonces globales (public) ───────────────────────────────────────────
    public List<Map<String, Object>> annoncesGlobales() {
        return annonceRepository.findByTypeOrderByEpingleeDescDateCreationDesc("GLOBALE")
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    // ─── Annonces d'un groupe ─────────────────────────────────────────────────
    public List<Map<String, Object>> annoncesGroupe(Long groupeId, String emailUtilisateur) {
        User utilisateur = chargerUtilisateur(emailUtilisateur);
        Groupe groupe = chargerGroupe(groupeId);

        if (utilisateur.getRole() == Role.REFERENT) {
            verifierReferentDuGroupe(utilisateur, groupe);
        } else if (utilisateur.getRole() != Role.ADMIN) {
            membreGroupeRepository.findByUserIdAndGroupeId(utilisateur.getId(), groupeId)
                    .filter(m -> m.getStatut() == StatutMembre.ACCEPTE)
                    .orElseThrow(() -> new AccessDeniedException(
                            "Vous ne pouvez pas consulter les annonces de ce groupe."));
        }

        return annonceRepository.findByGroupeIdOrderByEpingleeDescDateCreationDesc(groupeId)
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    // ─── Toutes les annonces (ADMIN) ──────────────────────────────────────────
    public List<Map<String, Object>> toutesLesAnnonces() {
        return annonceRepository.findAll()
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    // ─── Épingler/désépingler (ADMIN) ────────────────────────────────────────
    public Map<String, Object> toggleEpingler(Long annonceId) {
        Annonce annonce = annonceRepository.findById(annonceId)
                .orElseThrow(() -> new RuntimeException("Annonce introuvable"));
        annonce.setEpinglee(!annonce.isEpinglee());
        return toMap(annonceRepository.save(annonce));
    }

    // ─── Supprimer une annonce ────────────────────────────────────────────────
    public void supprimer(Long annonceId, String emailUtilisateur) {
        User utilisateur = chargerUtilisateur(emailUtilisateur);
        Annonce annonce = annonceRepository.findById(annonceId)
                .orElseThrow(() -> new RuntimeException("Annonce introuvable"));

        if (utilisateur.getRole() != Role.ADMIN) {
            if (utilisateur.getRole() != Role.REFERENT
                    || annonce.getAuteur() == null
                    || !utilisateur.getEmail().equals(annonce.getAuteur().getEmail())
                    || annonce.getGroupe() == null) {
                throw new AccessDeniedException("Vous ne pouvez supprimer que vos annonces de groupe.");
            }
            verifierReferentDuGroupe(utilisateur, annonce.getGroupe());
        }

        annonceRepository.delete(annonce);
    }

    private User chargerUtilisateur(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
    }

    private Groupe chargerGroupe(Long groupeId) {
        return groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable"));
    }

    private void verifierReferentDuGroupe(User utilisateur, Groupe groupe) {
        User referent = groupe.getReferent();
        if (referent == null || !utilisateur.getEmail().equals(referent.getEmail())) {
            throw new AccessDeniedException("Un référent ne peut gérer que les annonces de ses groupes.");
        }
    }

    // ─── Convertir en Map ─────────────────────────────────────────────────────
    private Map<String, Object> toMap(Annonce a) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",           a.getId());
        m.put("titre",        a.getTitre());
        m.put("contenu",      a.getContenu());
        m.put("type",         a.getType());
        m.put("epinglee",     a.isEpinglee());
        m.put("dateCreation", a.getDateCreation());
        m.put("dateExpiration", a.getDateExpiration());
        if (a.getAuteur() != null) {
            m.put("auteurPrenom", a.getAuteur().getPrenom());
            m.put("auteurNom",    a.getAuteur().getNom());
            m.put("auteurRole",   a.getAuteur().getRole());
            m.put("auteurEmail",  a.getAuteur().getEmail());
        }
        if (a.getGroupe() != null) {
            m.put("groupeId",  a.getGroupe().getId());
            m.put("groupeNom", a.getGroupe().getNom());
        }
        return m;
    }
}
