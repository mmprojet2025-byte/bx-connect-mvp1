package com.bxjeunes.bx_connect.service;

import org.springframework.transaction.annotation.Transactional;
import com.bxjeunes.bx_connect.dto.ActiviteResponse;
import com.bxjeunes.bx_connect.dto.ProjetResponse;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ReferentService {

    @org.springframework.beans.factory.annotation.Autowired
    private ActivityImageService activityImages;

    private final UserRepository userRepository;
    private final ActiviteRepository activiteRepository;
    private final ProjetRepository projetRepository;
    private final InscriptionRepository inscriptionRepository;
    private final SoutienFinancierRepository soutienRepository;

    public ReferentService(UserRepository userRepository,
                           ActiviteRepository activiteRepository,
                           ProjetRepository projetRepository,
                           InscriptionRepository inscriptionRepository,
                           SoutienFinancierRepository soutienRepository) {
        this.userRepository      = userRepository;
        this.activiteRepository  = activiteRepository;
        this.projetRepository    = projetRepository;
        this.inscriptionRepository = inscriptionRepository;
        this.soutienRepository   = soutienRepository;
    }

    private ActiviteResponse activityResponse(Activite a) {
        var response = ActiviteResponse.fromEntity(a, (int) participantsActifs(a.getId()));
        if (activityImages != null) response.setImageUrl(activityImages.url(a.getImageStorageKey()));
        boolean draftWithoutHistory = a.getStatut() == StatutActivite.BROUILLON
                && inscriptionRepository.findByActiviteId(a.getId()).isEmpty()
                && soutienRepository.findByActiviteId(a.getId()).isEmpty();
        response.setTarifModifiable(draftWithoutHistory); response.setSupprimable(draftWithoutHistory);
        response.compterReservations((int) inscriptionRepository.countByActiviteIdAndStatutIn(a.getId(), List.of(StatutInscription.EN_ATTENTE_PAIEMENT)));
        return response;
    }

    private long participantsActifs(Long activiteId) {
        return inscriptionRepository.countByActiviteIdAndStatutIn(
                activiteId, List.of(StatutInscription.CONFIRMEE, StatutInscription.PAYEE));
    }

    // ─── Dashboard référent ───────────────────────────────────────────────────
    public Map<String, Object> dashboard(String email) {
        User referent = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Référent introuvable"));

        List<ActiviteResponse> mesActivites = activiteRepository
                .findByCreateurIdOrReferentAssigneId(referent.getId(), referent.getId())
                .stream().filter(a -> ActiviteLecture.gestion(a, referent))
                .map(this::activityResponse)
                .collect(Collectors.toList());

        long totalInscriptions = mesActivites.stream()
                .mapToLong(ActiviteResponse::getNombreInscrits)
                .sum();

        List<ProjetResponse> projetsSoumis = projetRepository
                .findByGroupeReferentEmail(email)
                .stream()
                .filter(projet -> projet.getStatut() == StatutProjet.SOUMIS)
                .map(ProjetResponse::fromEntity)
                .collect(Collectors.toList());

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("referentPrenom",    referent.getPrenom());
        dashboard.put("referentNom",       referent.getNom());
        dashboard.put("totalActivites",    mesActivites.size());
        dashboard.put("totalInscriptions", totalInscriptions);
        dashboard.put("projetsSoumis",     projetsSoumis.size());
        dashboard.put("mesActivites",      mesActivites);
        dashboard.put("projetsSoumisListe", projetsSoumis);
        return dashboard;
    }

    // ─── R01 : Activités créées par le référent ───────────────────────────────
    public List<ActiviteResponse> mesActivites(String email) {
        User referent = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Référent introuvable"));
        return activiteRepository.findByCreateurIdOrReferentAssigneId(referent.getId(), referent.getId())
                .stream().filter(a -> ActiviteLecture.gestion(a, referent))
                .map(this::activityResponse)
                .collect(Collectors.toList());
    }

    // ─── R11 : Taux de remplissage des activités ──────────────────────────────
    public List<Map<String, Object>> tauxRemplissage(String email) {
        User referent = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Référent introuvable"));

        return activiteRepository.findByCreateurIdOrReferentAssigneId(referent.getId(), referent.getId()).stream()
                .filter(a -> ActiviteLecture.gestion(a, referent))
                .map(a -> {
                    long inscrits = participantsActifs(a.getId());
                    int capacite  = a.getCapaciteMax();
                    double taux   = capacite > 0 ? (inscrits * 100.0 / capacite) : 0;

                    Map<String, Object> m = new HashMap<>();
                    m.put("activiteId",    a.getId());
                    m.put("activiteTitre", a.getTitre());
                    m.put("capaciteMax",   capacite);
                    m.put("inscrits",      inscrits);
                    m.put("tauxRemplissage", Math.min(taux, 100.0));
                    m.put("statut",        a.getStatut());
                    return m;
                })
                .collect(Collectors.toList());
    }

    // ─── R07 : Exporter participants d'une activité ───────────────────────────
    public List<Map<String, Object>> exporterParticipants(Long activiteId, String email) {
        // Vérifier que l'activité appartient au référent
        User referent = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Référent introuvable"));
        Activite activite = activiteRepository.findById(activiteId)
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + activiteId));

        if (!ActiviteLecture.gestion(activite, referent)) {
            throw new AccessDeniedException("Vous ne pouvez exporter que les participants de vos propres activites.");
        }

        return inscriptionRepository.findByActiviteId(activiteId).stream()
                .map(ins -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("inscriptionId", ins.getId());
                    m.put("statut",        ins.getStatut());
                    m.put("dateInscription", ins.getDateInscription());
                    if (ins.getMembre() != null) {
                        m.put("membrePrenom", ins.getMembre().getPrenom());
                        m.put("membreNom",    ins.getMembre().getNom());
                        m.put("membreEmail",  ins.getMembre().getEmail());
                    }
                    return m;
                })
                .collect(Collectors.toList());
    }

    // ─── Legacy V2.3 : neutralise l'ancien workflow referent ────────────────
    public ProjetResponse validerProjet(Long projetId) {
        throw new AccessDeniedException(
                "Ancien workflow referent desactive. Utiliser /api/projets/referent/{id}/valider.");
    }

    // ─── Legacy V2.3 : neutralise l'ancien workflow referent ────────────────
    public ProjetResponse refuserProjet(Long projetId) {
        throw new AccessDeniedException(
                "Ancien workflow referent desactive. Utiliser /api/projets/referent/{id}/refuser.");
    }

    // ─── R14 : Projets soumis en attente de validation ───────────────────────
    public List<ProjetResponse> projetsSoumis() {
        return projetRepository.findByStatut(StatutProjet.SOUMIS)
                .stream()
                .map(ProjetResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── R17 : Soutiens financiers reçus ─────────────────────────────────────
    public List<Map<String, Object>> soutiensRecus(String email) {
        User referent = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Référent introuvable"));

        // Soutiens sur les activités du référent
        return activiteRepository.findByCreateurIdOrReferentAssigneId(referent.getId(), referent.getId()).stream()
                .filter(a -> ActiviteLecture.gestion(a, referent))
                .flatMap(a -> soutienRepository.findByActiviteId(a.getId()).stream()
                        .map(s -> {
                            Map<String, Object> m = new HashMap<>();
                            m.put("soutienId",      s.getId());
                            m.put("montant",        s.getMontant());
                            m.put("statut",         s.getStatutPaiement());
                            m.put("activiteTitre",  a.getTitre());
                            m.put("dateCreation",   s.getDateCreation());
                            if (s.getDonateur() != null) {
                                m.put("partenaireNom", s.getDonateur().getPrenom()
                                        + " " + s.getDonateur().getNom());
                            }
                            return m;
                        }))
                .collect(Collectors.toList());
    }
}
