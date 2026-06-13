package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PrestationService {

    private final PrestationBenevoleRepository prestationRepository;
    private final UserRepository userRepository;
    private final GroupeRepository groupeRepository;
    private final MembreGroupeRepository membreGroupeRepository;
    private final NotificationService notificationService;

    public PrestationService(PrestationBenevoleRepository prestationRepository,
                              UserRepository userRepository,
                              GroupeRepository groupeRepository,
                              MembreGroupeRepository membreGroupeRepository,
                              NotificationService notificationService) {
        this.prestationRepository   = prestationRepository;
        this.userRepository         = userRepository;
        this.groupeRepository       = groupeRepository;
        this.membreGroupeRepository = membreGroupeRepository;
        this.notificationService    = notificationService;
    }

    // ─── Encoder une prestation (MEMBRE) ─────────────────────────────────────
    public Map<String, Object> encoderPrestation(Map<String, Object> request, String emailMembre) {
        User membre = userRepository.findByEmail(emailMembre)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        Long groupeId = Long.valueOf(request.get("groupeId").toString());
        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable"));

        // Vérifier que le membre appartient au groupe
        membreGroupeRepository.findByUserIdAndGroupeId(membre.getId(), groupeId)
                .orElseThrow(() -> new RuntimeException("Vous n'êtes pas membre de ce groupe."));

        PrestationBenevole prestation = new PrestationBenevole();
        prestation.setTitre(request.get("titre").toString());
        prestation.setType(request.get("type").toString());
        prestation.setDureeHeures(Double.parseDouble(request.get("dureeHeures").toString()));
        prestation.setDatePrestation(java.time.LocalDate.parse(request.get("datePrestation").toString()));
        prestation.setMembre(membre);
        prestation.setGroupe(groupe);
        prestation.setStatut(StatutPrestation.EN_ATTENTE);

        if (request.containsKey("description")) {
            prestation.setDescription(request.get("description").toString());
        }

        PrestationBenevole saved = prestationRepository.save(prestation);

        // Notifier le référent
        notificationService.creer(groupe.getReferent(),
            "Nouvelle prestation à valider",
            membre.getPrenom() + " " + membre.getNom() + " a encodé une prestation de " +
            prestation.getDureeHeures() + "h : \"" + prestation.getTitre() + "\".",
            "PRESTATION_VALIDEE",
            "/referent/prestations");

        return toMap(saved);
    }

    // ─── Mes prestations (MEMBRE) ─────────────────────────────────────────────
    public List<Map<String, Object>> mesPrestations(String emailMembre) {
        User membre = userRepository.findByEmail(emailMembre)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return prestationRepository.findByMembreId(membre.getId())
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    // ─── Prestations d'un groupe (RÉFÉRENT) ───────────────────────────────────
    public List<Map<String, Object>> prestationsGroupe(Long groupeId, String emailUtilisateur) {
        User utilisateur = chargerUtilisateur(emailUtilisateur);
        Groupe groupe = chargerGroupe(groupeId);
        verifierAccesGroupe(utilisateur, groupe);

        return prestationRepository.findByGroupeId(groupeId)
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    // ─── Prestations en attente d'un groupe (RÉFÉRENT) ────────────────────────
    public List<Map<String, Object>> prestationsEnAttente(Long groupeId, String emailUtilisateur) {
        User utilisateur = chargerUtilisateur(emailUtilisateur);
        Groupe groupe = chargerGroupe(groupeId);
        verifierAccesGroupe(utilisateur, groupe);

        return prestationRepository.findByGroupeIdAndStatut(groupeId, StatutPrestation.EN_ATTENTE)
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    // ─── Valider une prestation (RÉFÉRENT) ────────────────────────────────────
    public Map<String, Object> validerPrestation(Long prestationId, String commentaire, String emailReferent) {
        User referent = userRepository.findByEmail(emailReferent)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        PrestationBenevole prestation = prestationRepository.findById(prestationId)
                .orElseThrow(() -> new RuntimeException("Prestation introuvable"));
        verifierAccesGroupe(referent, prestation.getGroupe());

        prestation.setStatut(StatutPrestation.VALIDEE);
        prestation.setReferent(referent);
        prestation.setCommentaireReferent(commentaire);
        prestation.setDateValidation(LocalDateTime.now());

        PrestationBenevole saved = prestationRepository.save(prestation);

        // Notifier le membre
        notificationService.creer(prestation.getMembre(),
            "Prestation validée ✅",
            "Votre prestation \"" + prestation.getTitre() + "\" de " +
            prestation.getDureeHeures() + "h a été validée.",
            "PRESTATION_VALIDEE");

        return toMap(saved);
    }

    // ─── Refuser une prestation (RÉFÉRENT) ────────────────────────────────────
    public Map<String, Object> refuserPrestation(Long prestationId, String commentaire, String emailReferent) {
        User referent = userRepository.findByEmail(emailReferent)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        PrestationBenevole prestation = prestationRepository.findById(prestationId)
                .orElseThrow(() -> new RuntimeException("Prestation introuvable"));
        verifierAccesGroupe(referent, prestation.getGroupe());

        prestation.setStatut(StatutPrestation.REFUSEE);
        prestation.setReferent(referent);
        prestation.setCommentaireReferent(commentaire);
        prestation.setDateValidation(LocalDateTime.now());

        PrestationBenevole saved = prestationRepository.save(prestation);

        // Notifier le membre
        notificationService.creer(prestation.getMembre(),
            "Prestation refusée",
            "Votre prestation \"" + prestation.getTitre() + "\" a été refusée. Motif : " + commentaire,
            "PRESTATION_REFUSEE");

        return toMap(saved);
    }

    // ─── Statistiques bénévolat (ADMIN) ──────────────────────────────────────
    public Map<String, Object> statistiques() {
        long totalPrestations = prestationRepository.count();
        long enAttente  = prestationRepository.findByStatut(StatutPrestation.EN_ATTENTE).size();
        long validees   = prestationRepository.findByStatut(StatutPrestation.VALIDEE).size();
        long refusees   = prestationRepository.findByStatut(StatutPrestation.REFUSEE).size();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalPrestations", totalPrestations);
        stats.put("enAttente",  enAttente);
        stats.put("validees",   validees);
        stats.put("refusees",   refusees);
        return stats;
    }

    // ─── Stats d'un membre ────────────────────────────────────────────────────
    public Map<String, Object> statsMembre(Long membreId) {
        double totalHeures = prestationRepository.totalHeuresMembre(membreId);
        long totalPrestations = prestationRepository.findByMembreId(membreId).size();
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalHeures",      totalHeures);
        stats.put("totalPrestations", totalPrestations);
        return stats;
    }

    // ─── Toutes les prestations (ADMIN) ──────────────────────────────────────
    public List<Map<String, Object>> toutesLesPrestations() {
        return prestationRepository.findAll()
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    private User chargerUtilisateur(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
    }

    private Groupe chargerGroupe(Long groupeId) {
        return groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable"));
    }

    private void verifierAccesGroupe(User utilisateur, Groupe groupe) {
        if (utilisateur.getRole() == Role.ADMIN) {
            return;
        }

        User referent = groupe != null ? groupe.getReferent() : null;
        if (utilisateur.getRole() != Role.REFERENT
                || referent == null
                || !utilisateur.getEmail().equals(referent.getEmail())) {
            throw new AccessDeniedException("Vous ne pouvez gérer que les prestations de vos groupes.");
        }
    }

    // ─── Convertir en Map ─────────────────────────────────────────────────────
    private Map<String, Object> toMap(PrestationBenevole p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",           p.getId());
        m.put("titre",        p.getTitre());
        m.put("description",  p.getDescription());
        m.put("type",         p.getType());
        m.put("datePrestation", p.getDatePrestation());
        m.put("dureeHeures",  p.getDureeHeures());
        m.put("statut",       p.getStatut());
        m.put("commentaire",  p.getCommentaireReferent());
        m.put("dateCreation", p.getDateCreation());
        m.put("dateValidation", p.getDateValidation());
        if (p.getMembre() != null) {
            m.put("membrePrenom", p.getMembre().getPrenom());
            m.put("membreNom",    p.getMembre().getNom());
            m.put("membreEmail",  p.getMembre().getEmail());
        }
        if (p.getGroupe() != null) {
            m.put("groupeId",  p.getGroupe().getId());
            m.put("groupeNom", p.getGroupe().getNom());
        }
        if (p.getReferent() != null) {
            m.put("referentNom", p.getReferent().getPrenom() + " " + p.getReferent().getNom());
        }
        return m;
    }
}
