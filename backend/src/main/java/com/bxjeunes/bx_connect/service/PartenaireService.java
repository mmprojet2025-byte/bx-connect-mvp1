package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.SoutienRequest;
import com.bxjeunes.bx_connect.dto.SoutienResponse;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PartenaireService {

    private final SoutienFinancierRepository soutienRepository;
    private final UserRepository userRepository;
    private final ProjetRepository projetRepository;
    private final ActiviteRepository activiteRepository;

    public PartenaireService(SoutienFinancierRepository soutienRepository,
                             UserRepository userRepository,
                             ProjetRepository projetRepository,
                             ActiviteRepository activiteRepository) {
        this.soutienRepository  = soutienRepository;
        this.userRepository     = userRepository;
        this.projetRepository   = projetRepository;
        this.activiteRepository = activiteRepository;
    }

    // ─── P05 : Soumettre un soutien à un projet ───────────────────────────────
    public SoutienResponse soutenirProjet(SoutienRequest request, String emailPartenaire) {
        User partenaire = userRepository.findByEmail(emailPartenaire)
                .orElseThrow(() -> new RuntimeException("Partenaire introuvable"));

        if (request.getProjetId() == null) {
            throw new RuntimeException("L'identifiant du projet est obligatoire.");
        }

        Projet projet = projetRepository.findById(request.getProjetId())
                .orElseThrow(() -> new RuntimeException("Projet introuvable : " + request.getProjetId()));

        SoutienFinancier soutien = new SoutienFinancier();
        soutien.setMontant(request.getMontant());
        soutien.setDonateur(partenaire);   // ✅ donateur (pas partenaire)
        soutien.setProjet(projet);
        soutien.setMessage(request.getMessage());
        soutien.setFournisseur("DECLARATION");
        soutien.setTypeSource("DECLARATION");
        soutien.setStatutPaiement(StatutPaiement.EN_ATTENTE);

        return SoutienResponse.fromEntity(soutienRepository.save(soutien));
    }

    // ─── P06 : Soumettre un soutien à une activité ────────────────────────────
    public SoutienResponse soutenirActivite(SoutienRequest request, String emailPartenaire) {
        User partenaire = userRepository.findByEmail(emailPartenaire)
                .orElseThrow(() -> new RuntimeException("Partenaire introuvable"));

        if (request.getActiviteId() == null) {
            throw new RuntimeException("L'identifiant de l'activité est obligatoire.");
        }

        Activite activite = activiteRepository.findById(request.getActiviteId())
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + request.getActiviteId()));

        SoutienFinancier soutien = new SoutienFinancier();
        soutien.setMontant(request.getMontant());
        soutien.setDonateur(partenaire);   // ✅ donateur (pas partenaire)
        soutien.setActivite(activite);
        soutien.setMessage(request.getMessage());
        soutien.setFournisseur("DECLARATION");
        soutien.setTypeSource("DECLARATION");
        soutien.setStatutPaiement(StatutPaiement.EN_ATTENTE);

        return SoutienResponse.fromEntity(soutienRepository.save(soutien));
    }

    // ─── P07 : Consulter le statut de ses offres ──────────────────────────────
    public List<SoutienResponse> mesSoutiens(String emailPartenaire) {
        User partenaire = userRepository.findByEmail(emailPartenaire)
                .orElseThrow(() -> new RuntimeException("Partenaire introuvable"));

        // ✅ findByDonateurId (pas findByPartenaireId)
        return soutienRepository.findByDonateurId(partenaire.getId())
                .stream()
                .map(SoutienResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── P09 : Statistiques du partenaire ────────────────────────────────────
    public Map<String, Object> statistiques(String emailPartenaire) {
        User partenaire = userRepository.findByEmail(emailPartenaire)
                .orElseThrow(() -> new RuntimeException("Partenaire introuvable"));

        Long id = partenaire.getId();

        // ✅ countByDonateurId et totalMontantDonateur (méthodes corrigées)
        long totalSoutiens      = soutienRepository.countByDonateurId(id);
        BigDecimal totalMontant = soutienRepository.totalMontantDonateur(id);

        // ✅ findByDonateurIdAndStatutPaiement (pas findByPartenaireIdAndStatutPaiement)
        long soutiensEnAttente = soutienRepository
                .findByDonateurIdAndStatutPaiement(id, StatutPaiement.EN_ATTENTE).size();
        long soutiensValides = soutienRepository
                .findByDonateurIdAndStatutPaiement(id, StatutPaiement.PAYE).size();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalSoutiens",     totalSoutiens);
        stats.put("totalMontant",      totalMontant);
        stats.put("soutiensEnAttente", soutiensEnAttente);
        stats.put("soutiensValides",   soutiensValides);
        stats.put("partenairePrenom",  partenaire.getPrenom());
        stats.put("partenaireNom",     partenaire.getNom());
        stats.put("partenaireEmail",   partenaire.getEmail());
        return stats;
    }

    // ─── P03 : Projets ouverts au soutien ────────────────────────────────────
    public List<Map<String, Object>> projetsSoutienOuverts() {
        return projetRepository.findAll().stream()
                .filter(p -> p.getStatut() == StatutProjet.APPROUVE
                          || p.getStatut() == StatutProjet.EN_COURS)
                .map(p -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",          p.getId());
                    m.put("titre",       p.getTitre());
                    m.put("description", p.getDescription());
                    m.put("statut",      p.getStatut());
                    m.put("budgetDemande", p.getBudgetDemande());
                    BigDecimal totalRecu = soutienRepository.totalSoutiensProjet(p.getId());
                    m.put("totalSoutiensRecus", totalRecu);
                    return m;
                })
                .collect(Collectors.toList());
    }

    // ─── P04 : Activités ouvertes au soutien ─────────────────────────────────
    public List<Map<String, Object>> activitesSoutienOuverts() {
        return activiteRepository.findByStatut(StatutActivite.PUBLIEE).stream()
                .map(a -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",          a.getId());
                    m.put("titre",       a.getTitre());
                    m.put("description", a.getDescription());
                    m.put("lieu",        a.getLieu());
                    m.put("dateDebut",   a.getDateDebut());
                    m.put("gratuite",    a.isGratuite());
                    BigDecimal totalRecu = soutienRepository.totalSoutiensActivite(a.getId());
                    m.put("totalSoutiensRecus", totalRecu);
                    return m;
                })
                .collect(Collectors.toList());
    }

    // ─── Admin : Valider un soutien (A25) ────────────────────────────────────
    public SoutienResponse validerSoutien(Long soutienId) {
        SoutienFinancier soutien = soutienRepository.findById(soutienId)
                .orElseThrow(() -> new RuntimeException("Soutien introuvable : " + soutienId));
        soutien.setStatutPaiement(StatutPaiement.PAYE);
        soutien.setDatePaiement(java.time.LocalDateTime.now());
        return SoutienResponse.fromEntity(soutienRepository.save(soutien));
    }

    // ─── Admin : Refuser un soutien ───────────────────────────────────────────
    public SoutienResponse refuserSoutien(Long soutienId) {
        SoutienFinancier soutien = soutienRepository.findById(soutienId)
                .orElseThrow(() -> new RuntimeException("Soutien introuvable : " + soutienId));
        soutien.setStatutPaiement(StatutPaiement.REMBOURSE);
        return SoutienResponse.fromEntity(soutienRepository.save(soutien));
    }

    // ─── Admin : Tous les soutiens ────────────────────────────────────────────
    public List<SoutienResponse> tousLesSoutiens() {
        return soutienRepository.findAll().stream()
                .map(SoutienResponse::fromEntity)
                .collect(Collectors.toList());
    }
}