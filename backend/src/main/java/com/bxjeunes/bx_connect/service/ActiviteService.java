package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.ActiviteRequest;
import com.bxjeunes.bx_connect.dto.ActiviteResponse;
import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ActiviteService {

    private final ActiviteRepository activiteRepository;
    private final UserRepository userRepository;

    public ActiviteService(ActiviteRepository activiteRepository, UserRepository userRepository) {
        this.activiteRepository = activiteRepository;
        this.userRepository = userRepository;
    }

    // ─── Créer une activité ──────────────────────────────────────────────────

    public ActiviteResponse creer(ActiviteRequest request, String emailCreateur) {
        User createur = userRepository.findByEmail(emailCreateur)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + emailCreateur));

        Activite activite = new Activite();
        activite.setTitre(request.getTitre());
        activite.setDescription(request.getDescription());
        activite.setDateDebut(request.getDateDebut());
        activite.setDateFin(request.getDateFin());
        activite.setLieu(request.getLieu());
        activite.setGratuite(request.isGratuite());
        activite.setPrix(request.getPrix());
        activite.setCapaciteMax(request.getCapaciteMax());
        activite.setCategorie(request.getCategorie());
        activite.setTheme(request.getTheme());
        activite.setStatut(StatutActivite.BROUILLON);
        activite.setCreateur(createur);

        return ActiviteResponse.fromEntity(activiteRepository.save(activite));
    }

    // ─── Lister toutes les activités publiées (public) ──────────────────────

    public List<ActiviteResponse> listerPubliees() {
        return activiteRepository.findByStatut(StatutActivite.PUBLIEE)
                .stream()
                .map(ActiviteResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Lister toutes les activités (admin/référent) ────────────────────────

    public List<ActiviteResponse> listerToutes() {
        return activiteRepository.findAll()
                .stream()
                .map(ActiviteResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Consulter le détail d'une activité ─────────────────────────────────

    public ActiviteResponse getById(Long id) {
        Activite activite = activiteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + id));
        return ActiviteResponse.fromEntity(activite);
    }

    // ─── Modifier une activité ───────────────────────────────────────────────

    public ActiviteResponse modifier(Long id, ActiviteRequest request) {
        Activite activite = activiteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + id));

        activite.setTitre(request.getTitre());
        activite.setDescription(request.getDescription());
        activite.setDateDebut(request.getDateDebut());
        activite.setDateFin(request.getDateFin());
        activite.setLieu(request.getLieu());
        activite.setGratuite(request.isGratuite());
        activite.setPrix(request.getPrix());
        activite.setCapaciteMax(request.getCapaciteMax());
        activite.setCategorie(request.getCategorie());
        activite.setTheme(request.getTheme());

        return ActiviteResponse.fromEntity(activiteRepository.save(activite));
    }

    // ─── Changer le statut (publier, annuler, terminer) ─────────────────────

    public ActiviteResponse changerStatut(Long id, StatutActivite nouveauStatut) {
        Activite activite = activiteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + id));
        activite.setStatut(nouveauStatut);
        return ActiviteResponse.fromEntity(activiteRepository.save(activite));
    }

    // ─── Supprimer une activité ──────────────────────────────────────────────

    public void supprimer(Long id) {
        if (!activiteRepository.existsById(id)) {
            throw new RuntimeException("Activité introuvable : " + id);
        }
        activiteRepository.deleteById(id);
    }

    // ─── Recherche par mot-clé (V06 / M16 du CDC) ───────────────────────────

    public List<ActiviteResponse> rechercher(String motCle) {
        return activiteRepository
                .findByStatutAndTitreContainingIgnoreCase(StatutActivite.PUBLIEE, motCle)
                .stream()
                .map(ActiviteResponse::fromEntity)
                .collect(Collectors.toList());
    }
}