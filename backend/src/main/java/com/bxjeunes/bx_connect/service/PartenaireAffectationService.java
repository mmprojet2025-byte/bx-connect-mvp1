package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.PartenaireAffectationRequest;
import com.bxjeunes.bx_connect.dto.PartenaireGroupeResponse;
import com.bxjeunes.bx_connect.dto.PartenaireReferentResponse;
import com.bxjeunes.bx_connect.dto.ReferentPartenaireResponse;
import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.PartenaireGroupe;
import com.bxjeunes.bx_connect.entity.PartenaireProfil;
import com.bxjeunes.bx_connect.entity.PartenaireReferent;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutAffectationPartenaire;
import com.bxjeunes.bx_connect.entity.TypeLienPartenaire;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.PartenaireGroupeRepository;
import com.bxjeunes.bx_connect.repository.PartenaireProfilRepository;
import com.bxjeunes.bx_connect.repository.PartenaireReferentRepository;
import com.bxjeunes.bx_connect.repository.SoutienFinancierRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PartenaireAffectationService {

    private static final Logger log = LoggerFactory.getLogger(PartenaireAffectationService.class);
    private static final String TARGET_PARTNER_REFERENT = "PARTNER_REFERENT_ASSIGNMENT";
    private static final String TARGET_PARTNER_GROUP = "PARTNER_GROUP_ASSIGNMENT";

    private final PartenaireReferentRepository partenaireReferentRepository;
    private final PartenaireGroupeRepository partenaireGroupeRepository;
    private final PartenaireProfilRepository partenaireProfilRepository;
    private final UserRepository userRepository;
    private final GroupeRepository groupeRepository;
    private final SoutienFinancierRepository soutienFinancierRepository;
    private final AuditLogService auditLogService;

    public PartenaireAffectationService(
            PartenaireReferentRepository partenaireReferentRepository,
            PartenaireGroupeRepository partenaireGroupeRepository,
            PartenaireProfilRepository partenaireProfilRepository,
            UserRepository userRepository,
            GroupeRepository groupeRepository,
            SoutienFinancierRepository soutienFinancierRepository,
            AuditLogService auditLogService) {
        this.partenaireReferentRepository = partenaireReferentRepository;
        this.partenaireGroupeRepository = partenaireGroupeRepository;
        this.partenaireProfilRepository = partenaireProfilRepository;
        this.userRepository = userRepository;
        this.groupeRepository = groupeRepository;
        this.soutienFinancierRepository = soutienFinancierRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public PartenaireReferentResponse affecterPartenaireAReferent(
            Long partenaireProfilId,
            Long referentId,
            PartenaireAffectationRequest request,
            String adminEmail) {
        User admin = chargerAdmin(adminEmail);
        PartenaireProfil profil = chargerProfilPartenaire(partenaireProfilId);
        User referent = chargerReferent(referentId);

        if (partenaireReferentRepository.existsByPartenaireProfilAndReferentAndStatut(
                profil, referent, StatutAffectationPartenaire.ACTIF)) {
            throw new IllegalStateException("Une affectation active existe deja entre ce partenaire et ce referent.");
        }

        PartenaireReferent affectation = new PartenaireReferent();
        affectation.setPartenaireProfil(profil);
        affectation.setReferent(referent);
        affectation.setCreatedBy(admin);
        appliquerChampsCommuns(affectation, request);

        PartenaireReferent saved = partenaireReferentRepository.save(affectation);
        auditer(admin, "PARTNER_REFERENT_ASSIGNED", TARGET_PARTNER_REFERENT, saved.getId(),
                nomOrganisation(profil), null, nomStatut(saved.getStatut()),
                "Partenaire affecte a un referent.",
                metadata("partenaireProfilId", profil.getId(), "referentId", referent.getId()));
        return PartenaireReferentResponse.fromEntity(saved);
    }

    @Transactional
    public PartenaireReferentResponse modifierAffectationReferent(
            Long affectationId,
            PartenaireAffectationRequest request,
            String adminEmail) {
        User admin = chargerAdmin(adminEmail);
        PartenaireReferent affectation = partenaireReferentRepository.findById(affectationId)
                .orElseThrow(() -> new RuntimeException("Affectation partenaire-referent introuvable."));
        String ancienStatut = nomStatut(affectation.getStatut());
        appliquerChampsCommuns(affectation, request);
        PartenaireReferent saved = partenaireReferentRepository.save(affectation);
        auditer(admin, "PARTNER_ASSIGNMENT_UPDATED", TARGET_PARTNER_REFERENT, saved.getId(),
                nomOrganisation(saved.getPartenaireProfil()), ancienStatut, nomStatut(saved.getStatut()),
                "Affectation partenaire-referent modifiee.",
                metadata("partenaireProfilId", saved.getPartenaireProfil().getId(), "referentId", saved.getReferent().getId()));
        return PartenaireReferentResponse.fromEntity(saved);
    }

    @Transactional
    public PartenaireReferentResponse desactiverAffectationReferent(Long affectationId, String adminEmail) {
        User admin = chargerAdmin(adminEmail);
        PartenaireReferent affectation = partenaireReferentRepository.findById(affectationId)
                .orElseThrow(() -> new RuntimeException("Affectation partenaire-referent introuvable."));
        String ancienStatut = nomStatut(affectation.getStatut());
        affectation.setStatut(StatutAffectationPartenaire.INACTIF);
        if (affectation.getDateFin() == null) {
            affectation.setDateFin(LocalDateTime.now());
        }
        PartenaireReferent saved = partenaireReferentRepository.save(affectation);
        auditer(admin, "PARTNER_REFERENT_DEACTIVATED", TARGET_PARTNER_REFERENT, saved.getId(),
                nomOrganisation(saved.getPartenaireProfil()), ancienStatut, nomStatut(saved.getStatut()),
                "Affectation partenaire-referent desactivee.",
                metadata("partenaireProfilId", saved.getPartenaireProfil().getId(), "referentId", saved.getReferent().getId()));
        return PartenaireReferentResponse.fromEntity(saved);
    }

    @Transactional
    public PartenaireGroupeResponse affecterPartenaireAGroupe(
            Long partenaireProfilId,
            Long groupeId,
            PartenaireAffectationRequest request,
            String adminEmail) {
        User admin = chargerAdmin(adminEmail);
        PartenaireProfil profil = chargerProfilPartenaire(partenaireProfilId);
        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable."));

        if (partenaireGroupeRepository.existsByPartenaireProfilAndGroupeAndStatut(
                profil, groupe, StatutAffectationPartenaire.ACTIF)) {
            throw new IllegalStateException("Une affectation active existe deja entre ce partenaire et ce groupe.");
        }

        PartenaireGroupe affectation = new PartenaireGroupe();
        affectation.setPartenaireProfil(profil);
        affectation.setGroupe(groupe);
        affectation.setCreatedBy(admin);
        appliquerChampsGroupe(affectation, request);

        PartenaireGroupe saved = partenaireGroupeRepository.save(affectation);
        auditer(admin, "PARTNER_GROUP_ASSIGNED", TARGET_PARTNER_GROUP, saved.getId(),
                nomOrganisation(profil), null, nomStatut(saved.getStatut()),
                "Partenaire affecte a un groupe.",
                metadata("partenaireProfilId", profil.getId(), "groupeId", groupe.getId(), "typeLien", saved.getTypeLien()));
        return PartenaireGroupeResponse.fromEntity(saved);
    }

    @Transactional
    public PartenaireGroupeResponse modifierAffectationGroupe(
            Long affectationId,
            PartenaireAffectationRequest request,
            String adminEmail) {
        User admin = chargerAdmin(adminEmail);
        PartenaireGroupe affectation = partenaireGroupeRepository.findById(affectationId)
                .orElseThrow(() -> new RuntimeException("Affectation partenaire-groupe introuvable."));
        String ancienStatut = nomStatut(affectation.getStatut());
        appliquerChampsGroupe(affectation, request);
        PartenaireGroupe saved = partenaireGroupeRepository.save(affectation);
        auditer(admin, "PARTNER_ASSIGNMENT_UPDATED", TARGET_PARTNER_GROUP, saved.getId(),
                nomOrganisation(saved.getPartenaireProfil()), ancienStatut, nomStatut(saved.getStatut()),
                "Affectation partenaire-groupe modifiee.",
                metadata("partenaireProfilId", saved.getPartenaireProfil().getId(),
                        "groupeId", saved.getGroupe().getId(), "typeLien", saved.getTypeLien()));
        return PartenaireGroupeResponse.fromEntity(saved);
    }

    @Transactional
    public PartenaireGroupeResponse desactiverAffectationGroupe(Long affectationId, String adminEmail) {
        User admin = chargerAdmin(adminEmail);
        PartenaireGroupe affectation = partenaireGroupeRepository.findById(affectationId)
                .orElseThrow(() -> new RuntimeException("Affectation partenaire-groupe introuvable."));
        String ancienStatut = nomStatut(affectation.getStatut());
        affectation.setStatut(StatutAffectationPartenaire.INACTIF);
        if (affectation.getDateFin() == null) {
            affectation.setDateFin(LocalDateTime.now());
        }
        PartenaireGroupe saved = partenaireGroupeRepository.save(affectation);
        auditer(admin, "PARTNER_GROUP_DEACTIVATED", TARGET_PARTNER_GROUP, saved.getId(),
                nomOrganisation(saved.getPartenaireProfil()), ancienStatut, nomStatut(saved.getStatut()),
                "Affectation partenaire-groupe desactivee.",
                metadata("partenaireProfilId", saved.getPartenaireProfil().getId(), "groupeId", saved.getGroupe().getId()));
        return PartenaireGroupeResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listerToutesLesAffectationsAdmin() {
        Map<String, Object> response = new HashMap<>();
        response.put("referents", partenaireReferentRepository.findAll().stream()
                .map(PartenaireReferentResponse::fromEntity)
                .toList());
        response.put("groupes", partenaireGroupeRepository.findAll().stream()
                .map(PartenaireGroupeResponse::fromEntity)
                .toList());
        return response;
    }

    @Transactional(readOnly = true)
    public List<ReferentPartenaireResponse> listerPartenairesReferent(String referentEmail) {
        User referent = chargerReferentParEmail(referentEmail);
        return partenairesDansPerimetreReferent(referent);
    }

    @Transactional(readOnly = true)
    public ReferentPartenaireResponse detailPartenaireReferent(Long partenaireProfilId, String referentEmail) {
        User referent = chargerReferentParEmail(referentEmail);
        return partenairesDansPerimetreReferent(referent).stream()
                .filter(partenaire -> partenaire.getPartenaireProfilId().equals(partenaireProfilId))
                .findFirst()
                .orElseThrow(() -> new AccessDeniedException("Partenaire hors perimetre referent."));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> impactPartenairesReferent(String referentEmail) {
        List<ReferentPartenaireResponse> partenaires = listerPartenairesReferent(referentEmail);
        long liensGroupes = partenaires.stream().mapToLong(p -> p.getGroupesLies().size()).sum();
        Map<String, Object> impact = new HashMap<>();
        impact.put("partenaires", partenaires.size());
        impact.put("liensGroupes", liensGroupes);
        impact.put("liensDirectsReferent", partenaires.stream().filter(ReferentPartenaireResponse::isLienDirectReferent).count());
        impact.put("partenairesDetails", partenaires);
        return impact;
    }

    @Transactional(readOnly = true)
    public List<PartenaireReferentResponse> listerReferentsPartenaire(String partenaireEmail) {
        User partenaire = chargerPartenaire(partenaireEmail);
        return partenaireReferentRepository.findActiveByPartenaireUserId(partenaire.getId()).stream()
                .map(PartenaireReferentResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PartenaireGroupeResponse> listerGroupesPartenaire(String partenaireEmail) {
        User partenaire = chargerPartenaire(partenaireEmail);
        return partenaireGroupeRepository.findActiveByPartenaireUserId(partenaire.getId()).stream()
                .map(PartenaireGroupeResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> impactLocalPartenaire(String partenaireEmail) {
        User partenaire = chargerPartenaire(partenaireEmail);
        Map<String, Object> impact = new HashMap<>();
        impact.put("referents", listerReferentsPartenaire(partenaireEmail));
        impact.put("groupes", listerGroupesPartenaire(partenaireEmail));
        impact.put("totalSoutiens", soutienFinancierRepository.countByDonateurId(partenaire.getId()));
        impact.put("totalMontant", soutienFinancierRepository.totalMontantDonateur(partenaire.getId()));
        impact.put("projetsSoutenus", soutienFinancierRepository.countProjetsSoutenusParDonateur(partenaire.getId()));
        impact.put("activitesSoutenues", soutienFinancierRepository.countActivitesSoutenuesParDonateur(partenaire.getId()));
        return impact;
    }

    private List<ReferentPartenaireResponse> partenairesDansPerimetreReferent(User referent) {
        Map<Long, ReferentPartenaireResponse> partenaires = new LinkedHashMap<>();

        for (PartenaireReferent lien : partenaireReferentRepository.findActiveByReferentId(referent.getId())) {
            ReferentPartenaireResponse response = partenaires.computeIfAbsent(
                    lien.getPartenaireProfil().getId(),
                    ignored -> ReferentPartenaireResponse.fromProfil(lien.getPartenaireProfil()));
            response.setLienDirectReferent(true);
            response.getReferentsLies().add(PartenaireReferentResponse.fromEntity(lien));
        }

        for (PartenaireGroupe lien : partenaireGroupeRepository.findActiveByReferentId(referent.getId())) {
            ReferentPartenaireResponse response = partenaires.computeIfAbsent(
                    lien.getPartenaireProfil().getId(),
                    ignored -> ReferentPartenaireResponse.fromProfil(lien.getPartenaireProfil()));
            response.getGroupesLies().add(PartenaireGroupeResponse.fromEntity(lien));
        }

        List<ReferentPartenaireResponse> result = new ArrayList<>(partenaires.values());
        result.sort(Comparator.comparing(ReferentPartenaireResponse::getNomOrganisation,
                Comparator.nullsLast(String::compareToIgnoreCase)));
        return result;
    }

    private void appliquerChampsCommuns(PartenaireReferent affectation, PartenaireAffectationRequest request) {
        if (request == null) {
            return;
        }
        if (request.getDateDebut() != null) {
            affectation.setDateDebut(request.getDateDebut());
        }
        affectation.setDateFin(request.getDateFin());
        affectation.setCommentaire(normaliser(request.getCommentaire()));
        if (request.getStatut() != null) {
            affectation.setStatut(request.getStatut());
        }
    }

    private void appliquerChampsGroupe(PartenaireGroupe affectation, PartenaireAffectationRequest request) {
        if (request == null) {
            return;
        }
        if (request.getDateDebut() != null) {
            affectation.setDateDebut(request.getDateDebut());
        }
        affectation.setDateFin(request.getDateFin());
        affectation.setCommentaire(normaliser(request.getCommentaire()));
        affectation.setTypeLien(request.getTypeLien() != null ? request.getTypeLien() : TypeLienPartenaire.AUTRE);
        if (request.getStatut() != null) {
            affectation.setStatut(request.getStatut());
        }
    }

    private User chargerAdmin(String email) {
        User admin = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Admin introuvable."));
        if (admin.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Acces reserve aux administrateurs.");
        }
        return admin;
    }

    private User chargerReferent(Long referentId) {
        User referent = userRepository.findById(referentId)
                .orElseThrow(() -> new RuntimeException("Referent introuvable."));
        if (referent.getRole() != Role.REFERENT || !referent.isActif()) {
            throw new AccessDeniedException("L'utilisateur choisi doit etre un referent actif.");
        }
        return referent;
    }

    private User chargerReferentParEmail(String email) {
        User referent = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Referent introuvable."));
        if (referent.getRole() != Role.REFERENT) {
            throw new AccessDeniedException("Acces reserve aux referents.");
        }
        return referent;
    }

    private User chargerPartenaire(String email) {
        User partenaire = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Partenaire introuvable."));
        if (partenaire.getRole() != Role.PARTENAIRE) {
            throw new AccessDeniedException("Acces reserve aux partenaires.");
        }
        return partenaire;
    }

    private PartenaireProfil chargerProfilPartenaire(Long partenaireProfilId) {
        PartenaireProfil profil = partenaireProfilRepository.findById(partenaireProfilId)
                .orElseThrow(() -> new RuntimeException("Profil partenaire introuvable."));
        if (profil.getUtilisateur() == null || profil.getUtilisateur().getRole() != Role.PARTENAIRE) {
            throw new AccessDeniedException("Le profil choisi n'appartient pas a un partenaire.");
        }
        return profil;
    }

    private String normaliser(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String nomStatut(StatutAffectationPartenaire statut) {
        return statut != null ? statut.name() : null;
    }

    private String nomOrganisation(PartenaireProfil profil) {
        return profil != null ? profil.getNomOrganisation() : null;
    }

    private void auditer(
            User acteur,
            String action,
            String cibleType,
            Long cibleId,
            String cibleNom,
            String ancienStatut,
            String nouveauStatut,
            String details,
            String metadataJson) {
        try {
            auditLogService.logStatusChange(acteur, action, cibleType, cibleId, cibleNom,
                    ancienStatut, nouveauStatut, details, metadataJson);
        } catch (RuntimeException ex) {
            log.warn("Echec AuditLog non bloquant pour {}", action, ex);
        }
    }

    private String metadata(Object... values) {
        StringBuilder builder = new StringBuilder("{");
        for (int i = 0; i < values.length; i += 2) {
            if (i > 0) {
                builder.append(',');
            }
            builder.append('"').append(values[i]).append('"').append(':');
            Object value = values[i + 1];
            if (value == null) {
                builder.append("null");
            } else if (value instanceof Number || value instanceof Boolean) {
                builder.append(value);
            } else {
                builder.append('"').append(String.valueOf(value).replace("\"", "\\\"")).append('"');
            }
        }
        builder.append('}');
        return builder.toString();
    }
}
