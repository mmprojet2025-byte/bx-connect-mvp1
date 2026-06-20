package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.*;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import org.springframework.security.access.AccessDeniedException;
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
    private final PartenaireProfilRepository partenaireProfilRepository;
    private final NotificationService notificationService;

    public PartenaireService(SoutienFinancierRepository soutienRepository,
                             UserRepository userRepository,
                             ProjetRepository projetRepository,
                             ActiviteRepository activiteRepository,
                             PartenaireProfilRepository partenaireProfilRepository,
                             NotificationService notificationService) {
        this.soutienRepository  = soutienRepository;
        this.userRepository     = userRepository;
        this.projetRepository   = projetRepository;
        this.activiteRepository = activiteRepository;
        this.partenaireProfilRepository = partenaireProfilRepository;
        this.notificationService = notificationService;
    }

    public PartenaireProfilResponse getProfilInstitutionnel(String emailPartenaire) {
        User partenaire = getPartenaire(emailPartenaire);
        return partenaireProfilRepository.findByUtilisateurId(partenaire.getId())
                .map(PartenaireProfilResponse::fromEntity)
                .orElseGet(() -> profilParDefaut(partenaire));
    }

    public List<PartenairePublicResponse> partenairesPublics() {
        return partenaireProfilRepository.findPublicActiveProfiles()
                .stream()
                .map(PartenairePublicResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public PartenaireProfilResponse enregistrerProfilInstitutionnel(
            PartenaireProfilRequest request,
            String emailPartenaire) {
        User partenaire = getPartenaire(emailPartenaire);
        PartenaireProfil profil = partenaireProfilRepository.findByUtilisateurId(partenaire.getId())
                .orElseGet(() -> {
                    PartenaireProfil nouveau = new PartenaireProfil();
                    nouveau.setUtilisateur(partenaire);
                    return nouveau;
                });

        profil.setNomOrganisation(request.getNomOrganisation().trim());
        profil.setTypePartenaire(request.getTypePartenaire());
        profil.setLogoUrl(normaliser(request.getLogoUrl()));
        profil.setPersonneContact(normaliser(request.getPersonneContact()));
        profil.setEmailContact(normaliser(request.getEmailContact()));
        profil.setTelephone(normaliser(request.getTelephone()));
        profil.setSiteWeb(normaliser(request.getSiteWeb()));
        profil.setDescription(normaliser(request.getDescription()));
        return PartenaireProfilResponse.fromEntity(partenaireProfilRepository.save(profil));
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
        boolean statutOuvert = projet.getStatut() == StatutProjet.APPROUVE
                || projet.getStatut() == StatutProjet.EN_COURS;
        boolean visiblePartenaire = projet.getVisibilite() == VisibiliteProjet.PARTENAIRES
                || projet.getVisibilite() == VisibiliteProjet.PUBLIC;
        if (!statutOuvert || !visiblePartenaire) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Ce projet n'est pas ouvert au soutien partenaire.");
        }

        SoutienFinancier soutien = new SoutienFinancier();
        soutien.setMontant(request.getMontant());
        soutien.setDonateur(partenaire);   // ✅ donateur (pas partenaire)
        soutien.setProjet(projet);
        soutien.setMessage(request.getMessage());
        soutien.setFournisseur("DECLARATION");
        soutien.setTypeSource("DECLARATION");
        soutien.setStatutPaiement(StatutPaiement.EN_ATTENTE);

        SoutienFinancier saved = soutienRepository.save(soutien);
        notifierAdminsNouveauSoutien(saved);
        return SoutienResponse.fromEntity(saved);
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

        if (activite.getStatut() != StatutActivite.PUBLIEE) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Cette activité n'est pas ouverte au soutien partenaire.");
        }

        SoutienFinancier soutien = new SoutienFinancier();
        soutien.setMontant(request.getMontant());
        soutien.setDonateur(partenaire);   // ✅ donateur (pas partenaire)
        soutien.setActivite(activite);
        soutien.setMessage(request.getMessage());
        soutien.setFournisseur("DECLARATION");
        soutien.setTypeSource("DECLARATION");
        soutien.setStatutPaiement(StatutPaiement.EN_ATTENTE);

        SoutienFinancier saved = soutienRepository.save(soutien);
        notifierAdminsNouveauSoutien(saved);
        return SoutienResponse.fromEntity(saved);
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

    public SoutienResponse modifierSoutien(Long soutienId, SoutienRequest request, String emailPartenaire) {
        SoutienFinancier soutien = chargerSoutienEditable(soutienId, emailPartenaire);
        soutien.setMontant(request.getMontant());
        soutien.setMessage(normaliser(request.getMessage()));
        return SoutienResponse.fromEntity(soutienRepository.save(soutien));
    }

    public SoutienResponse annulerSoutien(Long soutienId, String emailPartenaire) {
        SoutienFinancier soutien = chargerSoutienEditable(soutienId, emailPartenaire);
        soutien.setStatutPaiement(StatutPaiement.ANNULE);
        return SoutienResponse.fromEntity(soutienRepository.save(soutien));
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
        stats.put("projetsSoutenus", soutienRepository.countProjetsSoutenusParDonateur(id));
        stats.put("activitesSoutenues", soutienRepository.countActivitesSoutenuesParDonateur(id));
        stats.put("partenairePrenom",  partenaire.getPrenom());
        stats.put("partenaireNom",     partenaire.getNom());
        stats.put("partenaireEmail",   partenaire.getEmail());
        return stats;
    }

    // ─── P03 : Projets ouverts au soutien ────────────────────────────────────
    public List<Map<String, Object>> projetsSoutienOuverts() {
        return projetRepository.findByStatutInAndVisibiliteIn(
                        List.of(StatutProjet.APPROUVE, StatutProjet.EN_COURS),
                        List.of(VisibiliteProjet.PARTENAIRES, VisibiliteProjet.PUBLIC))
                .stream()
                .map(p -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",          p.getId());
                    m.put("titre",       p.getTitre());
                    m.put("description", p.getDescription());
                    m.put("statut",      p.getStatut());
                    m.put("visibilite",  p.getVisibilite());
                    m.put("budgetDemande", p.getBudgetDemande());
                    if (p.getGroupe() != null) {
                        m.put("groupeId", p.getGroupe().getId());
                        m.put("groupeNom", p.getGroupe().getNom());
                    }
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
    public SoutienResponse validerSoutien(Long soutienId, String commentaireAdmin) {
        SoutienFinancier soutien = soutienRepository.findById(soutienId)
                .orElseThrow(() -> new RuntimeException("Soutien introuvable : " + soutienId));
        soutien.setStatutPaiement(StatutPaiement.PAYE);
        soutien.setDatePaiement(java.time.LocalDateTime.now());
        soutien.setReponseAdmin(normaliser(commentaireAdmin));
        soutien.setDateReponseAdmin(java.time.LocalDateTime.now());
        SoutienFinancier saved = soutienRepository.save(soutien);
        notifierPartenaireDecision(saved, "Soutien validé",
                "Votre soutien pour \"" + cibleTitre(saved) + "\" a été validé.");
        return SoutienResponse.fromEntity(saved);
    }

    // ─── Admin : Refuser un soutien ───────────────────────────────────────────
    public SoutienResponse refuserSoutien(Long soutienId, String commentaireAdmin) {
        SoutienFinancier soutien = soutienRepository.findById(soutienId)
                .orElseThrow(() -> new RuntimeException("Soutien introuvable : " + soutienId));
        soutien.setStatutPaiement(StatutPaiement.REMBOURSE);
        soutien.setReponseAdmin(normaliser(commentaireAdmin));
        soutien.setDateReponseAdmin(java.time.LocalDateTime.now());
        SoutienFinancier saved = soutienRepository.save(soutien);
        notifierPartenaireDecision(saved, "Soutien refusé",
                "Votre soutien pour \"" + cibleTitre(saved) + "\" a été refusé.");
        return SoutienResponse.fromEntity(saved);
    }

    // ─── Admin : Tous les soutiens ────────────────────────────────────────────
    public List<SoutienResponse> tousLesSoutiens() {
        return soutienRepository.findAll().stream()
                .map(SoutienResponse::fromEntity)
                .collect(Collectors.toList());
    }

    private User getPartenaire(String email) {
        return userRepository.findByEmail(email)
                .filter(user -> user.getRole() == Role.PARTENAIRE)
                .orElseThrow(() -> new RuntimeException("Partenaire introuvable"));
    }

    private SoutienFinancier chargerSoutienEditable(Long soutienId, String emailPartenaire) {
        User partenaire = getPartenaire(emailPartenaire);
        SoutienFinancier soutien = soutienRepository.findById(soutienId)
                .orElseThrow(() -> new RuntimeException("Soutien introuvable : " + soutienId));

        if (soutien.getDonateur() == null
                || soutien.getDonateur().getId() == null
                || !soutien.getDonateur().getId().equals(partenaire.getId())) {
            throw new AccessDeniedException("Vous ne pouvez modifier que vos propres soutiens.");
        }

        if (soutien.getStatutPaiement() != StatutPaiement.EN_ATTENTE) {
            throw new AccessDeniedException("Ce soutien ne peut plus être modifié.");
        }

        return soutien;
    }

    private PartenaireProfilResponse profilParDefaut(User partenaire) {
        PartenaireProfil profil = new PartenaireProfil();
        profil.setUtilisateur(partenaire);
        profil.setNomOrganisation(partenaire.getPrenom() + " " + partenaire.getNom());
        profil.setTypePartenaire(TypePartenaire.AUTRE);
        profil.setPersonneContact(partenaire.getPrenom() + " " + partenaire.getNom());
        profil.setEmailContact(partenaire.getEmail());
        return PartenaireProfilResponse.fromEntity(profil);
    }

    private String normaliser(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void notifierAdminsNouveauSoutien(SoutienFinancier soutien) {
        String titreCible = cibleTitre(soutien);
        for (User admin : userRepository.findByRoleAndActifTrue(Role.ADMIN)) {
            notificationService.creer(
                    admin,
                    "Nouveau soutien partenaire",
                    soutien.getDonateur().getPrenom() + " propose " + soutien.getMontant() + " € pour \"" + titreCible + "\".",
                    "SOUTIEN",
                    "/admin/soutiens?soutien=" + soutien.getId());
        }
    }

    private void notifierPartenaireDecision(SoutienFinancier soutien, String titre, String message) {
        notificationService.creer(
                soutien.getDonateur(),
                titre,
                message,
                "SOUTIEN",
                "/partenaire?tab=soutiens&soutien=" + soutien.getId());
    }

    private String cibleTitre(SoutienFinancier soutien) {
        if (soutien.getProjet() != null) return soutien.getProjet().getTitre();
        if (soutien.getActivite() != null) return soutien.getActivite().getTitre();
        return "votre proposition";
    }
}
