package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.SearchResult;
import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.Annonce;
import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.PartenaireProfil;
import com.bxjeunes.bx_connect.entity.Projet;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import com.bxjeunes.bx_connect.entity.StatutGroupe;
import com.bxjeunes.bx_connect.entity.StatutModeration;
import com.bxjeunes.bx_connect.entity.StatutProjet;
import com.bxjeunes.bx_connect.entity.StatutMembre;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.entity.VisibiliteProjet;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.AnnonceRepository;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.PartenaireProfilRepository;
import com.bxjeunes.bx_connect.repository.ProjetRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Stream;

@Service
@Transactional(readOnly = true)
public class SearchService {

    private static final int DEFAULT_LIMIT = 30;
    private static final int MAX_LIMIT = 60;
    private static final int MIN_QUERY_LENGTH = 2;
    private static final List<StatutProjet> STATUTS_DIFFUSABLES =
            List.of(StatutProjet.APPROUVE, StatutProjet.EN_COURS, StatutProjet.TERMINE);

    private final UserRepository userRepository;
    private final ActiviteRepository activiteRepository;
    private final GroupeRepository groupeRepository;
    private final ProjetRepository projetRepository;
    private final PartenaireProfilRepository partenaireProfilRepository;
    private final AnnonceRepository annonceRepository;
    private final MembreGroupeRepository membreGroupeRepository;

    public SearchService(UserRepository userRepository,
                         ActiviteRepository activiteRepository,
                         GroupeRepository groupeRepository,
                         ProjetRepository projetRepository,
                         PartenaireProfilRepository partenaireProfilRepository,
                         AnnonceRepository annonceRepository,
                         MembreGroupeRepository membreGroupeRepository) {
        this.userRepository = userRepository;
        this.activiteRepository = activiteRepository;
        this.groupeRepository = groupeRepository;
        this.projetRepository = projetRepository;
        this.partenaireProfilRepository = partenaireProfilRepository;
        this.annonceRepository = annonceRepository;
        this.membreGroupeRepository = membreGroupeRepository;
    }

    public List<SearchResult> search(String email, String query, List<String> types, Integer requestedLimit) {
        User actor = userRepository.findByEmail(email)
                .orElseThrow(() -> new AccessDeniedException("Utilisateur introuvable."));

        String q = normalizeQuery(query);
        if (q.length() < MIN_QUERY_LENGTH) {
            return List.of();
        }

        int limit = normalizeLimit(requestedLimit);
        Set<String> requestedTypes = normalizeTypes(types);
        SearchContext context = buildContext(actor);

        return Stream.of(
                        searchActivities(actor, q, requestedTypes),
                        searchGroups(actor, q, requestedTypes),
                        searchProjects(actor, q, requestedTypes, context),
                        searchPartners(q, requestedTypes),
                        searchOpportunities(q, requestedTypes),
                        searchMembers(actor, q, requestedTypes)
                )
                .flatMap(stream -> stream)
                .sorted(Comparator
                        .comparingDouble(SearchResult::getScore).reversed()
                        .thenComparing(SearchResult::getDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(SearchResult::getTitre, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .limit(limit)
                .toList();
    }

    private Stream<SearchResult> searchActivities(User actor, String q, Set<String> requestedTypes) {
        if (!accepts(requestedTypes, "ACTIVITE")) {
            return Stream.empty();
        }

        Stream<Activite> activities;
        if (actor.getRole() == Role.ADMIN || actor.getRole() == Role.SUPER_ADMIN) {
            activities = activiteRepository.findAll().stream().filter(activity -> activityMatches(activity, q));
        } else if (actor.getRole() == Role.REFERENT) {
            activities = Stream.concat(
                            activiteRepository.rechercherMultiChamps(StatutActivite.PUBLIEE, q).stream(),
                            activiteRepository.findByCreateurId(actor.getId()).stream().filter(activity -> activityMatches(activity, q)))
                    .distinct();
        } else {
            activities = activiteRepository.rechercherMultiChamps(StatutActivite.PUBLIEE, q).stream();
        }

        return activities.map(activity -> result(
                "ACTIVITE",
                activity.getId(),
                activity.getTitre(),
                firstNonBlank(activity.getCommune(), activity.getLieu(), activity.getDescription()),
                "/activites/" + activity.getId(),
                activity.getStatut() != null ? activity.getStatut().name() : null,
                activity.getDateDebut(),
                score(q, activity.getTitre(), activity.getDescription(), activity.getLieu(), activity.getCommune())
        ));
    }

    private Stream<SearchResult> searchGroups(User actor, String q, Set<String> requestedTypes) {
        if (!accepts(requestedTypes, "GROUPE")) {
            return Stream.empty();
        }

        Stream<Groupe> groups;
        if (actor.getRole() == Role.ADMIN || actor.getRole() == Role.SUPER_ADMIN) {
            groups = groupeRepository.findAll().stream().filter(group -> groupMatches(group, q));
        } else if (actor.getRole() == Role.REFERENT) {
            groups = Stream.concat(
                            groupeRepository.findByStatut(StatutGroupe.VALIDE).stream(),
                            groupeRepository.findByReferentId(actor.getId()).stream())
                    .distinct()
                    .filter(group -> groupMatches(group, q));
        } else {
            groups = groupeRepository.findByStatut(StatutGroupe.VALIDE).stream()
                    .filter(group -> groupMatches(group, q));
        }

        return groups.map(group -> result(
                "GROUPE",
                group.getId(),
                group.getNom(),
                firstNonBlank(group.getTheme(), group.getCategorie(), group.getCommune(), group.getDescription()),
                "/groupes/" + group.getId(),
                group.getStatut() != null ? group.getStatut().name() : null,
                group.getDateCreation(),
                score(q, group.getNom(), group.getDescription(), group.getTheme(), group.getCategorie())
        ));
    }

    private Stream<SearchResult> searchProjects(User actor, String q, Set<String> requestedTypes, SearchContext context) {
        if (!accepts(requestedTypes, "PROJET")) {
            return Stream.empty();
        }

        return projetRepository.findAll().stream()
                .filter(project -> projectMatches(project, q))
                .filter(project -> canViewProject(actor, project, context))
                .map(project -> result(
                        "PROJET",
                        project.getId(),
                        project.getTitre(),
                        firstNonBlank(project.getGroupe() != null ? project.getGroupe().getNom() : null, project.getDescription()),
                        "/projets/" + project.getId(),
                        project.getStatut() != null ? project.getStatut().name() : null,
                        project.getDateCreation(),
                        score(q, project.getTitre(), project.getDescription(),
                                project.getGroupe() != null ? project.getGroupe().getNom() : null)
                ));
    }

    private Stream<SearchResult> searchPartners(String q, Set<String> requestedTypes) {
        if (!accepts(requestedTypes, "PARTENAIRE")) {
            return Stream.empty();
        }

        return partenaireProfilRepository.findPublicActiveProfiles().stream()
                .filter(profile -> matches(q, profile.getNomOrganisation(), profile.getDescription(),
                        profile.getTypePartenaire() != null ? profile.getTypePartenaire().name() : null))
                .map(profile -> result(
                        "PARTENAIRE",
                        profile.getId(),
                        profile.getNomOrganisation(),
                        profile.getDescription(),
                        "/",
                        profile.getTypePartenaire() != null ? profile.getTypePartenaire().name() : null,
                        profile.getDateCreation(),
                        score(q, profile.getNomOrganisation(), profile.getDescription(),
                                profile.getTypePartenaire() != null ? profile.getTypePartenaire().name() : null)
                ));
    }

    private Stream<SearchResult> searchOpportunities(String q, Set<String> requestedTypes) {
        if (!accepts(requestedTypes, "OPPORTUNITE")) {
            return Stream.empty();
        }

        return annonceRepository.findByCategorieOpportuniteIsNotNullOrderByDateCreationDesc().stream()
                .filter(annonce -> annonce.getStatutModeration() == StatutModeration.PUBLIEE)
                .filter(annonce -> matches(q, annonce.getTitre(), annonce.getDescriptionCourte(), annonce.getContenu(),
                        annonce.getCategorieOpportunite() != null ? annonce.getCategorieOpportunite().name() : null))
                .map(annonce -> result(
                        "OPPORTUNITE",
                        annonce.getId(),
                        annonce.getTitre(),
                        firstNonBlank(annonce.getDescriptionCourte(), annonce.getContenu()),
                        "/annonces",
                        annonce.getCategorieOpportunite() != null ? annonce.getCategorieOpportunite().name() : null,
                        annonce.getDateCreation(),
                        score(q, annonce.getTitre(), annonce.getDescriptionCourte(), annonce.getContenu(),
                                annonce.getCategorieOpportunite() != null ? annonce.getCategorieOpportunite().name() : null)
                ));
    }

    private Stream<SearchResult> searchMembers(User actor, String q, Set<String> requestedTypes) {
        if (!accepts(requestedTypes, "MEMBRE")) {
            return Stream.empty();
        }

        Stream<User> users;
        if (actor.getRole() == Role.ADMIN || actor.getRole() == Role.SUPER_ADMIN) {
            users = userRepository.searchActiveUsersByRoles(q, List.of(Role.MEMBRE)).stream();
        } else if (actor.getRole() == Role.REFERENT) {
            users = userRepository.searchMembersOfReferentGroups(q, actor.getId()).stream();
        } else {
            return Stream.empty();
        }

        String targetUrl = switch (actor.getRole()) {
            case REFERENT -> "/referent/membres";
            case SUPER_ADMIN -> "/super-admin/utilisateurs";
            default -> "/admin/utilisateurs";
        };
        return users.map(user -> result(
                "MEMBRE",
                user.getId(),
                fullName(user),
                "Membre BX-Connect",
                targetUrl,
                user.getRole() != null ? user.getRole().name() : null,
                user.getDateInscription(),
                score(q, user.getPrenom(), user.getNom(), user.getEmail())
        ));
    }

    private SearchContext buildContext(User actor) {
        Set<Long> activeGroupIds = new HashSet<>();
        Set<Long> referentGroupIds = new HashSet<>();

        if (actor.getRole() == Role.MEMBRE) {
            membreGroupeRepository.findByUserId(actor.getId()).stream()
                    .filter(adhesion -> adhesion.getStatut() == StatutMembre.ACCEPTE)
                    .map(adhesion -> adhesion.getGroupe() != null ? adhesion.getGroupe().getId() : null)
                    .filter(id -> id != null)
                    .forEach(activeGroupIds::add);
        }

        if (actor.getRole() == Role.REFERENT) {
            groupeRepository.findByReferentId(actor.getId()).stream()
                    .map(Groupe::getId)
                    .forEach(referentGroupIds::add);
        }

        return new SearchContext(activeGroupIds, referentGroupIds);
    }

    private boolean canViewProject(User actor, Projet project, SearchContext context) {
        if (actor.getRole() == Role.ADMIN || actor.getRole() == Role.SUPER_ADMIN) {
            return true;
        }
        if (project.getPorteur() != null && project.getPorteur().getId() != null
                && project.getPorteur().getId().equals(actor.getId())) {
            return true;
        }

        boolean referentGroup = project.getGroupe() != null
                && context.referentGroupIds().contains(project.getGroupe().getId());
        boolean memberGroup = project.getGroupe() != null
                && context.activeGroupIds().contains(project.getGroupe().getId());

        if (project.getVisibilite() == VisibiliteProjet.GROUPE) {
            return memberGroup || referentGroup;
        }
        if (!STATUTS_DIFFUSABLES.contains(project.getStatut())) {
            return referentGroup;
        }

        return switch (project.getVisibilite()) {
            case COMMUNAUTE -> actor.getRole() == Role.MEMBRE || actor.getRole() == Role.REFERENT;
            case PARTENAIRES -> actor.getRole() == Role.MEMBRE
                    || actor.getRole() == Role.REFERENT
                    || actor.getRole() == Role.PARTENAIRE;
            case PUBLIC -> true;
            case GROUPE -> memberGroup || referentGroup;
        };
    }

    private boolean activityMatches(Activite activity, String q) {
        return matches(q, activity.getTitre(), activity.getDescription(), activity.getLieu(), activity.getCommune());
    }

    private boolean groupMatches(Groupe group, String q) {
        return matches(q, group.getNom(), group.getDescription(), group.getTheme(), group.getCategorie(), group.getCommune());
    }

    private boolean projectMatches(Projet project, String q) {
        return matches(q, project.getTitre(), project.getDescription(), project.getObjectifs(),
                project.getGroupe() != null ? project.getGroupe().getNom() : null);
    }

    private SearchResult result(String type, Long id, String title, String subtitle,
                                String url, String badge, LocalDateTime date, double score) {
        return new SearchResult(type, id, trim(title, 120), trim(subtitle, 180), url, badge, date, score);
    }

    private boolean accepts(Set<String> requestedTypes, String type) {
        return requestedTypes.isEmpty() || requestedTypes.contains(type);
    }

    private Set<String> normalizeTypes(List<String> types) {
        if (types == null || types.isEmpty()) {
            return Set.of();
        }
        Set<String> normalized = new HashSet<>();
        for (String type : types) {
            if (type == null || type.isBlank()) {
                continue;
            }
            String value = type.trim().toUpperCase(Locale.ROOT);
            if ("OPPORTUNITES".equals(value) || "OPPORTUNITIES".equals(value)) {
                value = "OPPORTUNITE";
            } else if (value.endsWith("S")) {
                value = value.substring(0, value.length() - 1);
            }
            normalized.add(value);
        }
        return normalized;
    }

    private String normalizeQuery(String query) {
        return query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
    }

    private int normalizeLimit(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(requestedLimit, MAX_LIMIT);
    }

    private boolean matches(String query, String... values) {
        for (String value : values) {
            if (value != null && value.toLowerCase(Locale.ROOT).contains(query)) {
                return true;
            }
        }
        return false;
    }

    private double score(String query, String title, String... values) {
        String normalizedTitle = title == null ? "" : title.toLowerCase(Locale.ROOT);
        if (normalizedTitle.equals(query)) {
            return 100;
        }
        if (normalizedTitle.startsWith(query)) {
            return 90;
        }
        if (normalizedTitle.contains(query)) {
            return 80;
        }
        for (String value : values) {
            if (value != null && value.toLowerCase(Locale.ROOT).contains(query)) {
                return 55;
            }
        }
        return 10;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String trim(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength - 3).trim() + "...";
    }

    private String fullName(User user) {
        return (firstNonBlank(user.getPrenom(), "") + " " + firstNonBlank(user.getNom(), "")).trim();
    }

    private record SearchContext(Set<Long> activeGroupIds, Set<Long> referentGroupIds) {}
}
