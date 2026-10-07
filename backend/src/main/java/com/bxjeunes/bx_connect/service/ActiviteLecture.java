package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.entity.*;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/** Shared read policy. Build a fresh reader for every request; never cache memberships. */
public final class ActiviteLecture {
    private ActiviteLecture() {}

    public static Lecteur lecteur(User user, List<MembreGroupe> adhesions) {
        Set<Long> groupes = user != null && user.isActif() && user.getRole() == Role.MEMBRE
                ? adhesions.stream().filter(m -> m.getStatut() == StatutMembre.ACCEPTE)
                    .filter(m -> m.getUser() != null && Objects.equals(m.getUser().getId(), user.getId()))
                    .map(m -> m.getGroupe().getId()).collect(Collectors.toSet())
                : Set.of();
        return new Lecteur(user, groupes);
    }

    public static boolean sansAppartenance(Activite a, boolean authentifie) {
        return a != null && (a.getVisibilite() == VisibiliteActivite.PUBLIC
                || (authentifie && a.getVisibilite() == VisibiliteActivite.MEMBRES));
    }

    public static boolean notificationActivite(Notification n) {
        return (n.getLienAction() != null && n.getLienAction().startsWith("/activites/"))
                || (n.getType() != null && (n.getType().startsWith("ACTIVITE_") || n.getType().startsWith("INSCRIPTION_")));
    }

    public static boolean notificationVisible(Notification n, Lecteur lecteur,
            ActiviteRepository activities) {
        String lien = n.getLienAction();
        if (lien != null && lien.startsWith("/activites/")) {
            try {
                Long id = Long.valueOf(lien.substring("/activites/".length()));
                return activities.findById(id).map(lecteur::historique).orElse(false);
            } catch (NumberFormatException ex) {
                return false;
            }
        }
        // Old activity messages have no resolvable relationship. Hide, never delete them.
        return !notificationActivite(n);
    }

    public static boolean gestion(Activite a, User user) {
        if (a == null || user == null || !user.isActif()) return false;
        if (user.getRole() == Role.ADMIN) return true;
        if (user.getRole() != Role.REFERENT) return false;
        if (a.getGroupe() != null) {
            Groupe g = a.getGroupe();
            return a.getReferentAssigne() != null
                    && Objects.equals(a.getReferentAssigne().getId(), user.getId())
                    && g.isActif() && g.getStatut() == StatutGroupe.VALIDE
                    && g.getReferent() != null && g.getReferent().isActif()
                    && g.getReferent().getRole() == Role.REFERENT
                    && Objects.equals(g.getReferent().getId(), user.getId());
        }
        // Creator compatibility only for unassigned, non-private historical records.
        return a.getVisibilite() != VisibiliteActivite.PRIVE_GROUPE
                && a.getReferentAssigne() == null && a.getCreateur() != null
                && Objects.equals(a.getCreateur().getId(), user.getId());
    }

    public record Lecteur(User user, Set<Long> groupesAcceptes) {
        public boolean contenu(Activite a) {
            if (a == null) return false;
            // Historical MEMBRES means authenticated, never membership in an activity's group.
            if (sansAppartenance(a, user != null && user.isActif())) return true;
            return a.getVisibilite() == VisibiliteActivite.PRIVE_GROUPE
                    && (gestion(a, user) || (a.getGroupe() != null && groupesAcceptes.contains(a.getGroupe().getId())));
        }

        public boolean catalogue(Activite a) {
            return a != null && a.getStatut() == StatutActivite.PUBLIEE && contenu(a);
        }

        public boolean detail(Activite a) {
            return gestion(a, user) || catalogue(a);
        }

        public boolean historique(Activite a) {
            return a != null && (gestion(a, user)
                    || (a.getStatut() != StatutActivite.BROUILLON && contenu(a)));
        }

        /** Authorization belongs inside SQL, before LIMIT and the count query. */
        public Specification<Activite> catalogueSql() {
            return (a, query, cb) -> {
                var visible = cb.equal(a.get("visibilite"), VisibiliteActivite.PUBLIC);
                if (user != null && user.isActif()) {
                    visible = cb.or(visible, cb.equal(a.get("visibilite"), VisibiliteActivite.MEMBRES));
                    var prive = cb.disjunction();
                    if (user.getRole() == Role.ADMIN) {
                        prive = cb.conjunction();
                    } else if (user.getRole() == Role.REFERENT) {
                        var groupe = a.join("groupe", JoinType.LEFT);
                        var referent = groupe.join("referent", JoinType.LEFT);
                        prive = cb.and(
                                cb.equal(a.get("referentAssigne").get("id"), user.getId()),
                                cb.equal(referent.get("id"), user.getId()),
                                cb.isTrue(referent.get("actif")), cb.equal(referent.get("role"), Role.REFERENT),
                                cb.isTrue(groupe.get("actif")), cb.equal(groupe.get("statut"), StatutGroupe.VALIDE));
                    } else if (user.getRole() == Role.MEMBRE && !groupesAcceptes.isEmpty()) {
                        prive = a.get("groupe").get("id").in(groupesAcceptes);
                    }
                    visible = cb.or(visible, cb.and(cb.equal(a.get("visibilite"), VisibiliteActivite.PRIVE_GROUPE), prive));
                }
                return cb.and(cb.equal(a.get("statut"), StatutActivite.PUBLIEE), visible);
            };
        }
    }
}
