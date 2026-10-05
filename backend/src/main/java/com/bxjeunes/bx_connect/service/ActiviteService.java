package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.exception.ActivityRuleException;

import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.dto.ActiviteFiltreRequest;
import com.bxjeunes.bx_connect.dto.ActiviteRequest;
import com.bxjeunes.bx_connect.dto.ActiviteResponse;
import com.bxjeunes.bx_connect.dto.PagedResponse;
import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.StatutGroupe;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.entity.Inscription;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import com.bxjeunes.bx_connect.entity.VisibiliteActivite;
import com.bxjeunes.bx_connect.entity.StatutInscription;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.util.PaginationUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ActiviteService {

    private static final Logger log = LoggerFactory.getLogger(ActiviteService.class);
    @org.springframework.beans.factory.annotation.Autowired
    private ActivityImageService activityImages;
    @org.springframework.beans.factory.annotation.Autowired
    private com.bxjeunes.bx_connect.repository.SoutienFinancierRepository paiements;

    private static final String TARGET_ACTIVITY = "ACTIVITY";

    private final ActiviteRepository activiteRepository;
    private final UserRepository userRepository;
    private final InscriptionRepository inscriptionRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final GroupeRepository groupeRepository;
    private final MembreGroupeRepository membreGroupeRepository;

    public ActiviteService(ActiviteRepository activiteRepository,
                           UserRepository userRepository,
                           InscriptionRepository inscriptionRepository,
                           NotificationService notificationService,
                           AuditLogService auditLogService,
                           GroupeRepository groupeRepository,
                           MembreGroupeRepository membreGroupeRepository) {
        this.activiteRepository = activiteRepository;
        this.userRepository = userRepository;
        this.inscriptionRepository = inscriptionRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
        this.groupeRepository = groupeRepository;
        this.membreGroupeRepository = membreGroupeRepository;
    }

    // ─── Créer une activité ───────────────────────────────────────────────────
    @Transactional
    public ActiviteResponse creer(ActiviteRequest request, String emailCreateur) {
        validerDonneesActivite(request);
        User createur = userRepository.findByEmail(emailCreateur)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + emailCreateur));

        if (createur.getRole() != Role.ADMIN && createur.getRole() != Role.REFERENT) {
            throw new AccessDeniedException("Seuls ADMIN et REFERENT peuvent créer une activité.");
        }
        Activite activite = new Activite();
        appliquerAffectation(activite, request, createur, true);
        activite.setTitre(request.getTitre());
        activite.setDescription(request.getDescription());
        activite.setDateDebut(request.getDateDebut());
        activite.setDateFin(request.getDateFin());
        if (request.isDateLimiteFournie()) activite.setDateLimiteInscription(request.getDateLimiteInscription());
        if (activite.getDateLimiteInscription() != null && activite.getDateLimiteInscription().isAfter(activite.getDateDebut()))
            throw new ActivityRuleException("La date limite ne peut pas dépasser le début de l'activité.");
        if (request.getImageStorageKey() != null && !Objects.equals(request.getImageStorageKey(), activite.getImageStorageKey())) {
            activityImages.validate(request.getImageStorageKey());
            activite.setImageStorageKey(request.getImageStorageKey());
        }
        appliquerLocalisation(activite, request);
        activite.setGratuite(request.isGratuite());
        activite.setPrix(request.isGratuite() ? null : request.getPrix());
        activite.setCapaciteMax(request.getCapaciteMax());
        activite.setCategorie(request.getCategorie());
        activite.setTheme(request.getTheme());
        activite.setStatut(StatutActivite.BROUILLON);
        activite.setCreateur(createur);

        Activite activiteSauvee = activiteRepository.save(activite);
        auditerStatut(
                createur,
                "ACTIVITY_CREATED",
                activiteSauvee,
                null,
                nomStatut(activiteSauvee.getStatut()),
                "Activite creee.");
        return toResponse(activiteSauvee);
    }

    // ─── Lister activités publiées (public) ───────────────────────────────────
    public List<ActiviteResponse> listerPubliees(String emailUtilisateur) {
        var lecteur = lecteur(emailUtilisateur);
        return activiteRepository.findByStatut(StatutActivite.PUBLIEE)
                .stream()
                .filter(lecteur::catalogue)
                .map(activite -> toResponse(activite, emailUtilisateur))
                .collect(Collectors.toList());
    }

    public PagedResponse<ActiviteResponse> listerPublieesPage(String emailUtilisateur, int page, int size) {
        var pageable = PaginationUtils.pageRequest(page, size, Sort.by(Sort.Direction.DESC, "dateCreation"));
        var activites = activiteRepository.findAll(lecteur(emailUtilisateur).catalogueSql(), pageable);
        return PagedResponse.fromPage(activites.map(activite -> toResponse(activite, emailUtilisateur)));
    }

    // ─── Lister toutes les activités (admin/référent) ─────────────────────────
    public List<ActiviteResponse> listerToutes() {
        return activiteRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public PagedResponse<ActiviteResponse> listerToutesPage(int page, int size) {
        return PagedResponse.fromPage(activiteRepository
                .findAll(PaginationUtils.pageRequest(page, size, Sort.by(Sort.Direction.DESC, "dateCreation")))
                .map(this::toResponse));
    }

    // ─── Détail d'une activité (V04) ──────────────────────────────────────────
    public ActiviteResponse getById(Long id, String emailUtilisateur) {
        Activite activite = activiteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + id));

        if (!lecteur(emailUtilisateur).detail(activite)) {
            throw new RuntimeException("Activité introuvable : " + id);
        }
        return toResponse(activite, emailUtilisateur);
    }

    // ─── Recherche par mot-clé (V06 / M16) ───────────────────────────────────
    public List<ActiviteResponse> rechercher(String motCle, String emailUtilisateur) {
        var lecteur = lecteur(emailUtilisateur);
        return activiteRepository
                .rechercherMultiChamps(StatutActivite.PUBLIEE, motCle)
                .stream()
                .filter(lecteur::catalogue)
                .map(activite -> toResponse(activite, emailUtilisateur))
                .collect(Collectors.toList());
    }

    // ─── Filtres avancés (V03) ────────────────────────────────────────────────
    public List<ActiviteResponse> filtrer(ActiviteFiltreRequest filtre, String emailUtilisateur) {
        var lecteur = lecteur(emailUtilisateur);
        List<Activite> resultats = activiteRepository.filtrerCombines(
                StatutActivite.PUBLIEE, critereTexte(filtre.getQ()), critereTexte(filtre.getCategorie()),
                critereTexte(filtre.getTheme()), critereTexte(filtre.getLieu()),
                filtre.getDateDebut(), filtre.getDateFin(), filtre.getGratuite());

        return resultats.stream()
                .filter(lecteur::catalogue)
                .map(activite -> toResponse(activite, emailUtilisateur))
                .collect(Collectors.toList());
    }

    private String critereTexte(String valeur) {
        return valeur == null || valeur.isBlank() ? null : valeur.trim();
    }

    // ─── Options de filtres (catégories, thèmes, lieux disponibles) ──────────
    public Map<String, List<String>> getOptionsFiltre(String emailUtilisateur) {
        var lecteur = lecteur(emailUtilisateur);
        var visibles = activiteRepository.findByStatut(StatutActivite.PUBLIEE).stream()
                .filter(lecteur::catalogue).toList();
        return Map.of(
                "categories", visibles.stream().map(Activite::getCategorie).filter(Objects::nonNull).distinct().toList(),
                "themes", visibles.stream().map(Activite::getTheme).filter(Objects::nonNull).distinct().toList(),
                "lieux", visibles.stream().map(Activite::getLieu).filter(Objects::nonNull).distinct().toList());
    }

    private ActiviteLecture.Lecteur lecteur(String email) {
        User user = email == null ? null : userRepository.findByEmail(email).orElse(null);
        return ActiviteLecture.lecteur(user, user != null && user.getRole() == Role.MEMBRE
                ? membreGroupeRepository.findByUserId(user.getId()) : List.of());
    }

    // ─── Activités du référent ────────────────────────────────────────────────
    public List<ActiviteResponse> mesActivites(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + email));
        return activiteRepository.findByCreateurIdOrReferentAssigneId(user.getId(), user.getId())
                .stream()
                .filter(a -> ActiviteLecture.gestion(a, user))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── Modifier une activité ────────────────────────────────────────────────
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ActiviteResponse modifier(Long id, ActiviteRequest request, String emailUser) {
        Activite activite = activiteRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + id));
        User acteur = verifierDroitGestion(activite, emailUser);
        validerDonneesActivite(request);
        if (activite.getStatut() == StatutActivite.ANNULEE || activite.getStatut() == StatutActivite.TERMINEE)
            throw new ActivityRuleException("Cette activité ne peut plus être modifiée.");
        validerTarificationInchangee(activite, request);
        if (inscriptionRepository.countByActiviteIdAndStatutIn(id, List.of(StatutInscription.EN_ATTENTE_PAIEMENT)) > 0
                && (!Objects.equals(activite.getDateDebut(), request.getDateDebut())
                || (request.isDateLimiteFournie() && !Objects.equals(activite.getDateLimiteInscription(), request.getDateLimiteInscription()))))
            throw new ActivityRuleException("Un paiement est en cours. Les échéances ne peuvent pas être modifiées.");
        long placesOccupees = inscriptionRepository.countByActiviteIdAndStatutIn(
                id, List.of(StatutInscription.CONFIRMEE, StatutInscription.PAYEE, StatutInscription.EN_ATTENTE_PAIEMENT));
        if (request.getCapaciteMax() < placesOccupees) {
            throw new ActivityRuleException("La capacité ne peut pas être inférieure au nombre d'inscriptions actives.");
        }

        appliquerAffectation(activite, request, acteur, false);
        activite.setTitre(request.getTitre());
        activite.setDescription(request.getDescription());
        activite.setDateDebut(request.getDateDebut());
        activite.setDateFin(request.getDateFin());
        if (request.isDateLimiteFournie()) activite.setDateLimiteInscription(request.getDateLimiteInscription());
        if (activite.getDateLimiteInscription() != null && activite.getDateLimiteInscription().isAfter(activite.getDateDebut()))
            throw new ActivityRuleException("La date limite ne peut pas dépasser le début de l'activité.");
        if (request.getImageStorageKey() != null && !Objects.equals(request.getImageStorageKey(), activite.getImageStorageKey())) {
            activityImages.validate(request.getImageStorageKey());
            activite.setImageStorageKey(request.getImageStorageKey());
        }
        appliquerLocalisation(activite, request);
        activite.setGratuite(request.isGratuite());
        activite.setPrix(request.isGratuite() ? null : request.getPrix());
        activite.setCapaciteMax(request.getCapaciteMax());
        activite.setCategorie(request.getCategorie());
        activite.setTheme(request.getTheme());

        Activite activiteSauvee = activiteRepository.save(activite);
        auditerAction(acteur, "ACTIVITY_UPDATED", activiteSauvee, "Activite modifiee.");
        return toResponse(activiteSauvee);
    }

    // ─── Changer le statut ────────────────────────────────────────────────────
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ActiviteResponse changerStatut(Long id, StatutActivite nouveauStatut,
                                         VisibiliteActivite visibilite, String emailUser) {
        Activite activite = activiteRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + id));
        User acteur = verifierDroitGestion(activite, emailUser);
        StatutActivite ancienStatut = activite.getStatut();
        validerTransition(activite, nouveauStatut);
        if (nouveauStatut != ancienStatut && nouveauStatut != StatutActivite.PUBLIEE
                && inscriptionRepository.countByActiviteIdAndStatutIn(id, List.of(StatutInscription.EN_ATTENTE_PAIEMENT)) > 0)
            throw new ActivityRuleException("Un paiement est en cours. Attendez sa confirmation ou son expiration.");
        if (ancienStatut == StatutActivite.BROUILLON && nouveauStatut == StatutActivite.PUBLIEE) {
            if (visibilite == null) {
                throw new ActivityRuleException("La visibilite est obligatoire pour publier.");
            }
            validerPublication(activite, visibilite);
            activite.setVisibilite(visibilite);
        } else if (visibilite != null && visibilite != activite.getVisibilite()) {
            throw new ActivityRuleException("La visibilite se choisit lors de la publication du brouillon.");
        }
        if (ancienStatut == StatutActivite.PUBLIEE && nouveauStatut == StatutActivite.ANNULEE) {
            LocalDateTime maintenant = LocalDateTime.now();
            for (Inscription inscription : inscriptionRepository.findByActiviteId(id)) {
                if (inscription.getStatut() == StatutInscription.ANNULEE) continue;
                inscription.setStatut(StatutInscription.ANNULEE);
                inscription.setDateAnnulation(maintenant);
                inscriptionRepository.save(inscription);
                notificationService.creer(inscription.getMembre(), "Activité annulée",
                        "L'activité « " + activite.getTitre() + " » a été annulée. Votre inscription est annulée.",
                        "ACTIVITE_ANNULEE", "/activites/" + activite.getId());
            }
        }
        activite.setStatut(nouveauStatut);
        Activite activiteSauvee = activiteRepository.save(activite);

        auditerStatut(
                acteur,
                ancienStatut != StatutActivite.PUBLIEE && nouveauStatut == StatutActivite.PUBLIEE
                        ? "ACTIVITY_PUBLISHED"
                        : "ACTIVITY_STATUS_CHANGED",
                activiteSauvee,
                nomStatut(ancienStatut),
                nomStatut(nouveauStatut),
                "Statut activite modifie.");

        return toResponse(activiteSauvee);
    }

    // ─── Supprimer une activité ───────────────────────────────────────────────
    @Transactional
    public void supprimer(Long id, String emailUser) {
        Activite activite = activiteRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new RuntimeException("Activité introuvable : " + id));
        User acteur = verifierDroitGestion(activite, emailUser);
        if (activite.getStatut() != StatutActivite.BROUILLON
                || !inscriptionRepository.findByActiviteId(id).isEmpty()
                || (paiements != null && !paiements.findByActiviteId(id).isEmpty()))
            throw new ActivityRuleException("Cette activité possède un historique. Utilisez l'annulation.");
        activiteRepository.delete(activite);
        auditerAction(acteur, "ACTIVITY_DELETED", activite, "Activite supprimee.");
    }

    private User verifierDroitGestion(Activite activite, String emailUser) {
        User user = userRepository.findByEmail(emailUser)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + emailUser));
        if (user.getRole() == Role.ADMIN) {
            return user;
        }
        if (user.getRole() == Role.REFERENT) {
            if (activite.getGroupe() != null && activite.getReferentAssigne() != null
                    && Objects.equals(activite.getReferentAssigne().getId(), user.getId())) {
                verifierAffectationActuelle(activite);
                return user;
            }
            // Compatibility: only unassigned historical activities retain creator ownership.
            // New general activities can only be created by ADMIN.
            if (sansAffectation(activite) && activite.getCreateur() != null
                    && Objects.equals(activite.getCreateur().getId(), user.getId())) {
                return user;
            }
        }
        throw new AccessDeniedException("Vous ne pouvez gerer que vos propres activites.");
    }

    private boolean sansAffectation(Activite activite) {
        return activite.getGroupe() == null && activite.getReferentAssigne() == null;
    }

    private Groupe groupeEligible(Long id) {
        Groupe groupe = groupeRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new IllegalArgumentException("Groupe introuvable : " + id));
        User referent = groupe.getReferent();
        if (groupe.getStatut() != StatutGroupe.VALIDE || !groupe.isActif()) {
            throw new ActivityRuleException("Le groupe doit être validé et actif.");
        }
        if (referent == null || referent.getId() == null
                || !referent.isActif() || referent.getRole() != Role.REFERENT) {
            throw new ActivityRuleException("Le groupe doit avoir un référent actif de rôle REFERENT.");
        }
        return groupe;
    }

    private void verifierAffectationActuelle(Activite activite) {
        Groupe groupe = groupeEligible(activite.getGroupe().getId());
        if (activite.getReferentAssigne() == null
                || !Objects.equals(groupe.getReferent().getId(), activite.getReferentAssigne().getId())) {
            throw new AccessDeniedException("L'affectation ne correspond plus au référent actuel du groupe.");
        }
    }

    private void appliquerAffectation(Activite activite, ActiviteRequest request, User acteur, boolean creation) {
        Long ancienGroupe = activite.getGroupe() == null ? null : activite.getGroupe().getId();
        Long groupeId = creation || request.isGroupeFourni() ? request.getGroupeId() : ancienGroupe;
        Long ancienReferent = activite.getReferentAssigne() == null ? null : activite.getReferentAssigne().getId();
        VisibiliteActivite visibilite = request.getVisibilite() == null
                ? activite.getVisibilite() : request.getVisibilite();
        if ((request.getNature() == ActiviteRequest.Nature.GENERALE && groupeId != null)
                || (request.getNature() == ActiviteRequest.Nature.GROUPE && groupeId == null)) {
            throw new ActivityRuleException("L'intention générale/groupe ne correspond pas au groupe fourni.");
        }
        boolean changementGroupe = !Objects.equals(ancienGroupe, groupeId);
        if (!creation && activite.getStatut() != StatutActivite.BROUILLON
                && (changementGroupe || visibilite != activite.getVisibilite())) {
            throw new ActivityRuleException("Le groupe, le type et la visibilité sont figés après publication.");
        }
        if (!creation && acteur.getRole() == Role.REFERENT && changementGroupe) {
            throw new AccessDeniedException("Un référent ne peut pas changer le groupe d'une activité.");
        }
        // Historical unassigned records keep their visibility and finances, never converted implicitly.
        if (!creation && sansAffectation(activite) && groupeId == null
                && visibilite == activite.getVisibilite()
                && request.getReferentAssigneId() == null) {
            return;
        }
        if (groupeId == null) {
            if (acteur.getRole() != Role.ADMIN || request.getReferentAssigneId() != null
                    || visibilite != VisibiliteActivite.PUBLIC) {
                throw new ActivityRuleException("Une générale exige ADMIN, PUBLIC et aucun référent assigné.");
            }
            activite.setGroupe(null);
            activite.setReferentAssigne(null);
        } else {
            Groupe groupe = groupeEligible(groupeId);
            User referent = groupe.getReferent();
            if (visibilite != VisibiliteActivite.PUBLIC && visibilite != VisibiliteActivite.PRIVE_GROUPE) {
                throw new ActivityRuleException("Une activité de groupe exige PUBLIC ou PRIVE_GROUPE.");
            }
            if (acteur.getRole() == Role.REFERENT && !Objects.equals(acteur.getId(), referent.getId())) {
                throw new AccessDeniedException("Vous ne pouvez créer ou gérer que les activités de votre groupe.");
            }
            if (request.isReferentFourni() && !Objects.equals(request.getReferentAssigneId(), referent.getId())) {
                throw new ActivityRuleException("Le référent assigné doit être le référent réel du groupe.");
            }
            // No reassignment endpoint in this lot, including when the group's referent changed.
            if (!creation && !changementGroupe && !Objects.equals(ancienReferent, referent.getId())) {
                throw new AccessDeniedException("L'affectation ne correspond plus au référent actuel du groupe.");
            }
            activite.setGroupe(groupe);
            activite.setReferentAssigne(referent);
        }
        activite.setVisibilite(visibilite);
    }

    private void validerPublication(Activite activite, VisibiliteActivite visibilite) {
        if (activite.getGroupe() != null) {
            verifierAffectationActuelle(activite);
            if (visibilite != VisibiliteActivite.PUBLIC && visibilite != VisibiliteActivite.PRIVE_GROUPE) {
                throw new ActivityRuleException("Une activité de groupe exige PUBLIC ou PRIVE_GROUPE.");
            }
        } else if (activite.getReferentAssigne() != null
                || (visibilite != VisibiliteActivite.PUBLIC
                    && !(visibilite == VisibiliteActivite.MEMBRES
                         && activite.getVisibilite() == VisibiliteActivite.MEMBRES))) {
            throw new ActivityRuleException("Une générale exige PUBLIC; MEMBRES est conservé uniquement pour l'historique.");
        }
        if (activite.getTitre() == null || activite.getTitre().isBlank()
                || activite.getDescription() == null || activite.getDescription().isBlank()
                || activite.getLieu() == null || activite.getLieu().isBlank()
                || activite.getDateFin() == null || !activite.getDateFin().isAfter(activite.getDateDebut())) {
            throw new ActivityRuleException("Titre, description, lieu et dates cohérentes sont requis avant publication.");
        }
    }

    private void validerDonneesActivite(ActiviteRequest request) {
        if (request.getTitre() == null || request.getTitre().isBlank()
                || request.getDescription() == null || request.getDescription().isBlank()
                || request.getLieu() == null || request.getLieu().isBlank()) {
            throw new ActivityRuleException("Le titre, la description et le lieu sont obligatoires.");
        }
        if (request.getDateDebut() == null || request.getDateFin() == null) {
            throw new ActivityRuleException("Les dates de début et de fin sont obligatoires.");
        }
        if (!request.getDateFin().isAfter(request.getDateDebut())) {
            throw new ActivityRuleException("La date de fin doit être strictement après la date de début.");
        }
        if (request.getCapaciteMax() <= 0) {
            throw new ActivityRuleException("La capacité maximale doit être strictement positive.");
        }
        if (request.getPrix() != null && (request.getPrix().scale() > 2 || request.getPrix().precision() > 10))
            throw new ActivityRuleException("Le prix doit être exprimé en euros avec deux décimales maximum.");
        if (request.getPrix() != null && request.getPrix().compareTo(BigDecimal.ZERO) < 0) {
            throw new ActivityRuleException("Le prix ne peut pas être négatif.");
        }
        if (request.isGratuite() && request.getPrix() != null) {
            throw new ActivityRuleException("Une activité gratuite ne peut pas avoir de prix.");
        }
        if (!request.isGratuite() && (request.getPrix() == null
                || request.getPrix().compareTo(BigDecimal.ZERO) <= 0)) {
            throw new ActivityRuleException("Une activité payante doit avoir un prix strictement positif.");
        }
    }

    private void validerTarificationInchangee(Activite activite, ActiviteRequest request) {
        boolean changed = activite.isGratuite() != request.isGratuite() || !memePrix(activite.getPrix(), request.getPrix());
        if (!changed) return;
        if (activite.getStatut() == StatutActivite.BROUILLON
                && inscriptionRepository.findByActiviteId(activite.getId()).isEmpty()
                && (paiements == null || paiements.findByActiviteId(activite.getId()).isEmpty())) return;
        if (activite.isGratuite() != request.isGratuite()) {
            throw new ActivityRuleException("Le caractère gratuit ou payant d'une activité existante ne peut pas être modifié.");
        }
        if (!activite.isGratuite() && !memePrix(activite.getPrix(), request.getPrix())) {
            throw new ActivityRuleException("Le prix d'une activité payante existante ne peut pas être modifié.");
        }
    }

    private boolean memePrix(BigDecimal actuel, BigDecimal demande) {
        return actuel == null ? demande == null : demande != null && actuel.compareTo(demande) == 0;
    }

    private void validerTransition(Activite activite, StatutActivite nouveauStatut) {
        if (nouveauStatut == null) {
            throw new ActivityRuleException("Le nouveau statut est obligatoire.");
        }
        StatutActivite actuel = activite.getStatut();
        if (actuel == nouveauStatut) return;
        boolean autorisee = switch (actuel) {
            case BROUILLON -> nouveauStatut == StatutActivite.PUBLIEE || nouveauStatut == StatutActivite.ANNULEE;
            case PUBLIEE -> nouveauStatut == StatutActivite.ANNULEE || nouveauStatut == StatutActivite.TERMINEE;
            case ANNULEE, TERMINEE -> false;
        };
        if (!autorisee) {
            throw new RuntimeException("Transition de statut non autorisée : " + actuel + " vers " + nouveauStatut + ".");
        }
        if (nouveauStatut == StatutActivite.PUBLIEE) {
            if (!activite.isGratuite() && (activite.getPrix() == null || activite.getPrix().signum() <= 0)) {
                throw new ActivityRuleException("Une activité payante exige un prix positif.");
            }
            if (activite.getDateDebut() == null || !activite.getDateDebut().isAfter(LocalDateTime.now())) {
                throw new ActivityRuleException("Une activité passée ne peut pas être publiée.");
            }
            if (activite.getCapaciteMax() <= 0) {
                throw new ActivityRuleException("La capacité maximale doit être strictement positive avant publication.");
            }
        }
    }

    private void appliquerLocalisation(Activite activite, ActiviteRequest request) {
        activite.setLieu(request.getLieu());
        activite.setAdresse(request.getAdresse());
        activite.setCommune(request.getCommune());
        activite.setLatitude(request.getLatitude());
        activite.setLongitude(request.getLongitude());
    }

    private void auditerAction(User acteur, String action, Activite activite, String details) {
        try {
            auditLogService.logAction(
                    acteur,
                    action,
                    TARGET_ACTIVITY,
                    activite.getId(),
                    activite.getTitre(),
                    null,
                    details,
                    metadataJson(activite));
        } catch (RuntimeException ex) {
            log.warn("Audit activite impossible pour l'action {} sur l'activite {}", action, activite.getId(), ex);
        }
    }

    private void auditerStatut(
            User acteur,
            String action,
            Activite activite,
            String ancienStatut,
            String nouveauStatut,
            String details) {
        try {
            auditLogService.logStatusChange(
                    acteur,
                    action,
                    TARGET_ACTIVITY,
                    activite.getId(),
                    activite.getTitre(),
                    ancienStatut,
                    nouveauStatut,
                    details,
                    metadataJson(activite));
        } catch (RuntimeException ex) {
            log.warn("Audit activite impossible pour l'action {} sur l'activite {}", action, activite.getId(), ex);
        }
    }

    private String nomStatut(StatutActivite statut) {
        return statut == null ? null : statut.name();
    }

    private String metadataJson(Activite activite) {
        List<String> entries = new ArrayList<>();
        ajouterJson(entries, "dateDebut", activite.getDateDebut());
        ajouterJson(entries, "commune", activite.getCommune());
        ajouterJson(entries, "latitude", activite.getLatitude());
        ajouterJson(entries, "longitude", activite.getLongitude());
        return "{" + String.join(",", entries) + "}";
    }

    private void ajouterJson(List<String> entries, String key, Object value) {
        if (value != null) {
            entries.add("\"" + key + "\":\"" + escapeJson(value.toString()) + "\"");
        }
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private ActiviteResponse toResponse(Activite activite) {
        int nombreInscrits = (int) inscriptionRepository.countByActiviteIdAndStatutIn(
                activite.getId(),
                List.of(StatutInscription.CONFIRMEE, StatutInscription.PAYEE)
        );
        ActiviteResponse response = ActiviteResponse.fromEntity(activite, nombreInscrits);
        if (activityImages != null) response.setImageUrl(activityImages.url(activite.getImageStorageKey()));
        response.compterReservations((int) inscriptionRepository.countByActiviteIdAndStatutIn(activite.getId(), List.of(StatutInscription.EN_ATTENTE_PAIEMENT)));
        boolean editablePrice = activite.getStatut() == StatutActivite.BROUILLON
                && inscriptionRepository.findByActiviteId(activite.getId()).isEmpty()
                && (paiements == null || paiements.findByActiviteId(activite.getId()).isEmpty());
        response.setTarifModifiable(editablePrice);
        response.setSupprimable(editablePrice);
        return response;
    }

    private ActiviteResponse toResponse(Activite activite, String emailUtilisateur) {
        ActiviteResponse response = toResponse(activite);
        enrichirEtatInscription(response, activite, emailUtilisateur);
        return response;
    }

    private void enrichirEtatInscription(ActiviteResponse response, Activite activite, String emailUtilisateur) {
        User utilisateur = null;
        if (emailUtilisateur != null) {
            utilisateur = userRepository.findByEmail(emailUtilisateur).orElse(null);
        }

        Inscription inscriptionActive = null;
        if (utilisateur != null && utilisateur.getRole() == Role.MEMBRE) {
            inscriptionActive = inscriptionRepository
                    .findByMembreIdAndActiviteIdOrderByDateInscriptionDesc(utilisateur.getId(), activite.getId())
                    .stream()
                    .filter(inscription -> inscription.getStatut() != StatutInscription.ANNULEE)
                    .findFirst()
                    .orElse(null);
        }

        if (inscriptionActive != null) {
            response.setInscrit(true);
            response.setInscriptionId(inscriptionActive.getId());
            response.setStatutInscription(inscriptionActive.getStatut());
            response.setPeutSInscrire(false);
            response.setRaisonIndisponible("DEJA_INSCRIT");
            return;
        }

        String raison = raisonInscriptionIndisponible(activite, utilisateur);
        response.setInscrit(false);
        response.setPeutSInscrire(raison == null);
        response.setRaisonIndisponible(raison);
    }

    private String raisonInscriptionIndisponible(Activite activite, User utilisateur) {
        if (utilisateur != null && utilisateur.getRole() != Role.MEMBRE) {
            return "ROLE_NON_MEMBRE";
        }
        if (activite.getStatut() == StatutActivite.ANNULEE) {
            return "ANNULEE";
        }
        if (activite.getStatut() == StatutActivite.TERMINEE) {
            return "TERMINEE";
        }
        if (activite.getStatut() != StatutActivite.PUBLIEE) {
            return "NON_PUBLIEE";
        }
        if (activite.getDateLimiteInscription() != null && !activite.getDateLimiteInscription().isAfter(LocalDateTime.now())) {
            return "DATE_LIMITE";
        }
        LocalDateTime now = LocalDateTime.now();
        if (activite.getDateDebut() == null || !activite.getDateDebut().isAfter(now)) {
            return "PASSEE";
        }
        if (activite.getCapaciteMax() > 0 && responseComplete(activite)) {
            return "COMPLETE";
        }
        return null;
    }

    private boolean responseComplete(Activite activite) {
        long nbInscrits = inscriptionRepository.countByActiviteIdAndStatutIn(
                activite.getId(),
                List.of(StatutInscription.CONFIRMEE, StatutInscription.PAYEE, StatutInscription.EN_ATTENTE_PAIEMENT)
        );
        return nbInscrits >= activite.getCapaciteMax();
    }
}
