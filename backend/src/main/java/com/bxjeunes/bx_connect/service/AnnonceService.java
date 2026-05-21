package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import org.springframework.stereotype.Service;

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

        String type = request.getOrDefault("type", "GLOBALE").toString();
        annonce.setType(type);

        // Si annonce de groupe
        if (request.containsKey("groupeId") && request.get("groupeId") != null) {
            Long groupeId = Long.valueOf(request.get("groupeId").toString());
            Groupe groupe = groupeRepository.findById(groupeId)
                    .orElseThrow(() -> new RuntimeException("Groupe introuvable"));
            annonce.setGroupe(groupe);
            annonce.setType("GROUPE");
        }

        if (request.containsKey("epinglee")) {
            annonce.setEpinglee(Boolean.parseBoolean(request.get("epinglee").toString()));
        }

        return toMap(annonceRepository.save(annonce));
    }

    // ─── Annonces visibles pour un utilisateur connecté ──────────────────────
    public List<Map<String, Object>> annoncesVisibles(String emailUser) {
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        // Trouver le groupe du membre
        List<MembreGroupe> memberships = membreGroupeRepository.findByUserId(user.getId());

        if (memberships.isEmpty()) {
            // Pas de groupe → seulement les annonces globales
            return annonceRepository.findByTypeOrderByEpingleeDescDateCreationDesc("GLOBALE")
                    .stream().map(this::toMap).collect(Collectors.toList());
        }

        // Annonces globales + annonces de son groupe
        Long groupeId = memberships.get(0).getGroupe().getId();
        return annonceRepository.findAnnoncesVisibles(groupeId)
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    // ─── Annonces globales (public) ───────────────────────────────────────────
    public List<Map<String, Object>> annoncesGlobales() {
        return annonceRepository.findByTypeOrderByEpingleeDescDateCreationDesc("GLOBALE")
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    // ─── Annonces d'un groupe ─────────────────────────────────────────────────
    public List<Map<String, Object>> annoncesGroupe(Long groupeId) {
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
    public void supprimer(Long annonceId) {
        annonceRepository.deleteById(annonceId);
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
        }
        if (a.getGroupe() != null) {
            m.put("groupeId",  a.getGroupe().getId());
            m.put("groupeNom", a.getGroupe().getNom());
        }
        return m;
    }
}