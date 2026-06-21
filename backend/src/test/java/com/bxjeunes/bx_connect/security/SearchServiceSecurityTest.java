package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.entity.Annonce;
import com.bxjeunes.bx_connect.entity.CategorieOpportunite;
import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.Projet;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutModeration;
import com.bxjeunes.bx_connect.entity.StatutProjet;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.entity.VisibiliteProjet;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.AnnonceRepository;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.PartenaireProfilRepository;
import com.bxjeunes.bx_connect.repository.ProjetRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.SearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchServiceSecurityTest {

    @Mock private UserRepository userRepository;
    @Mock private ActiviteRepository activiteRepository;
    @Mock private GroupeRepository groupeRepository;
    @Mock private ProjetRepository projetRepository;
    @Mock private PartenaireProfilRepository partenaireProfilRepository;
    @Mock private AnnonceRepository annonceRepository;
    @Mock private MembreGroupeRepository membreGroupeRepository;

    private SearchService searchService;

    @BeforeEach
    void setUp() {
        searchService = new SearchService(
                userRepository,
                activiteRepository,
                groupeRepository,
                projetRepository,
                partenaireProfilRepository,
                annonceRepository,
                membreGroupeRepository);

        lenient().when(activiteRepository.rechercherMultiChamps(any(), any())).thenReturn(List.of());
        lenient().when(groupeRepository.findAll()).thenReturn(List.of());
        lenient().when(groupeRepository.findByStatut(any())).thenReturn(List.of());
        lenient().when(groupeRepository.findByReferentId(any())).thenReturn(List.of());
        lenient().when(projetRepository.findAll()).thenReturn(List.of());
        lenient().when(partenaireProfilRepository.findPublicActiveProfiles()).thenReturn(List.of());
        lenient().when(annonceRepository.findByCategorieOpportuniteIsNotNullOrderByDateCreationDesc()).thenReturn(List.of());
        lenient().when(membreGroupeRepository.findByUserId(any())).thenReturn(List.of());
    }

    @Test
    @DisplayName("ADMIN peut rechercher les membres actifs")
    void admin_peut_rechercher_membres() {
        User admin = user(1L, "admin@test.be", Role.ADMIN);
        User membre = user(2L, "membre@test.be", Role.MEMBRE);
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(userRepository.searchActiveUsersByRoles(eq("membre"), anyList())).thenReturn(List.of(membre));

        var results = searchService.search(admin.getEmail(), "membre", List.of("MEMBRE"), 10);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getType()).isEqualTo("MEMBRE");
        assertThat(results.get(0).getUrl()).isEqualTo("/admin/utilisateurs");
    }

    @Test
    @DisplayName("SUPER_ADMIN recherche les membres vers la route super admin")
    void super_admin_recherche_membres_route_super_admin() {
        User superAdmin = user(7L, "super@test.be", Role.SUPER_ADMIN);
        User membre = user(2L, "membre@test.be", Role.MEMBRE);
        when(userRepository.findByEmail(superAdmin.getEmail())).thenReturn(Optional.of(superAdmin));
        when(userRepository.searchActiveUsersByRoles(eq("membre"), anyList())).thenReturn(List.of(membre));

        var results = searchService.search(superAdmin.getEmail(), "membre", List.of("MEMBRE"), 10);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getUrl()).isEqualTo("/super-admin/utilisateurs");
    }

    @Test
    @DisplayName("MEMBRE ne peut pas rechercher les membres")
    void membre_ne_peut_pas_rechercher_membres() {
        User membre = user(2L, "membre@test.be", Role.MEMBRE);
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));

        var results = searchService.search(membre.getEmail(), "membre", List.of("MEMBRE"), 10);

        assertThat(results).isEmpty();
        verify(userRepository, never()).searchActiveUsersByRoles(any(), anyList());
    }

    @Test
    @DisplayName("REFERENT recherche seulement les membres de ses groupes")
    void referent_recherche_membres_de_ses_groupes() {
        User referent = user(3L, "referent@test.be", Role.REFERENT);
        User membre = user(4L, "membre@test.be", Role.MEMBRE);
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        when(userRepository.searchMembersOfReferentGroups("membre", referent.getId())).thenReturn(List.of(membre));

        var results = searchService.search(referent.getEmail(), "membre", List.of("MEMBRE"), 10);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getUrl()).isEqualTo("/referent/membres");
    }

    @Test
    @DisplayName("Opportunite EN_ATTENTE non exposee dans la recherche globale")
    void opportunite_en_attente_non_exposee() {
        User membre = user(2L, "membre@test.be", Role.MEMBRE);
        Annonce pending = opportunity(11L, "Stage STIB", StatutModeration.EN_ATTENTE);
        Annonce published = opportunity(12L, "Formation STIB", StatutModeration.PUBLIEE);
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(annonceRepository.findByCategorieOpportuniteIsNotNullOrderByDateCreationDesc())
                .thenReturn(List.of(pending, published));

        var results = searchService.search(membre.getEmail(), "stib", List.of("OPPORTUNITE"), 10);

        assertThat(results).extracting("id").containsExactly(12L);
    }

    @Test
    @DisplayName("PARTENAIRE ne voit pas un projet de groupe prive")
    void partenaire_ne_voit_pas_projet_groupe_prive() {
        User partenaire = user(5L, "partner@test.be", Role.PARTENAIRE);
        Projet projet = new Projet();
        projet.setId(20L);
        projet.setTitre("Projet prive STIB");
        projet.setStatut(StatutProjet.APPROUVE);
        projet.setVisibilite(VisibiliteProjet.GROUPE);
        projet.setPorteur(user(6L, "porteur@test.be", Role.MEMBRE));
        projet.setGroupe(new Groupe());

        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(projetRepository.findAll()).thenReturn(List.of(projet));

        var results = searchService.search(partenaire.getEmail(), "stib", List.of("PROJET"), 10);

        assertThat(results).isEmpty();
    }

    private User user(Long id, String email, Role role) {
        User user = new User();
        user.setId(id);
        user.setPrenom(role.name().substring(0, 1) + "Prenom");
        user.setNom("Nom");
        user.setEmail(email);
        user.setRole(role);
        user.setActif(true);
        user.setDateInscription(LocalDateTime.now());
        return user;
    }

    private Annonce opportunity(Long id, String title, StatutModeration moderation) {
        Annonce annonce = new Annonce();
        annonce.setId(id);
        annonce.setTitre(title);
        annonce.setContenu("Contenu");
        annonce.setType("GLOBALE");
        annonce.setCategorieOpportunite(CategorieOpportunite.STAGE);
        annonce.setStatutModeration(moderation);
        annonce.setDateCreation(LocalDateTime.now());
        annonce.setAuteur(user(30L + id, "auteur" + id + "@test.be", Role.PARTENAIRE));
        return annonce;
    }
}
