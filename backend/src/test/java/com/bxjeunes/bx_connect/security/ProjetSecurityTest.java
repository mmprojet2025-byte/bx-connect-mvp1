package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.CommentaireRequest;
import com.bxjeunes.bx_connect.dto.ProjetRequest;
import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.MembreGroupe;
import com.bxjeunes.bx_connect.entity.ParticipationProjet;
import com.bxjeunes.bx_connect.entity.Projet;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutMembre;
import com.bxjeunes.bx_connect.entity.StatutProjet;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.CommentaireProjetRepository;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.ParticipationProjetRepository;
import com.bxjeunes.bx_connect.repository.ProjetRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.ProjetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjetSecurityTest {

    @Mock private ProjetRepository projetRepository;
    @Mock private ParticipationProjetRepository participationRepository;
    @Mock private CommentaireProjetRepository commentaireRepository;
    @Mock private UserRepository userRepository;
    @Mock private GroupeRepository groupeRepository;
    @Mock private MembreGroupeRepository membreGroupeRepository;

    @InjectMocks
    private ProjetService projetService;

    private User admin;
    private User membre;
    private User superAdmin;
    private User referent;
    private User referentAutreGroupe;
    private Groupe groupe;
    private Groupe autreGroupe;

    @BeforeEach
    void setUp() {
        admin = user(1L, "admin@test.be", Role.ADMIN);
        membre = user(2L, "membre@test.be", Role.MEMBRE);
        referent = user(3L, "referent@test.be", Role.REFERENT);
        superAdmin = user(4L, "super@test.be", Role.SUPER_ADMIN);
        referentAutreGroupe = user(5L, "referent2@test.be", Role.REFERENT);

        groupe = new Groupe();
        groupe.setId(10L);
        groupe.setNom("Groupe Creatif");
        groupe.setReferent(referent);

        autreGroupe = new Groupe();
        autreGroupe.setId(20L);
        autreGroupe.setNom("Groupe Solidaire");
        autreGroupe.setReferent(referentAutreGroupe);
    }

    @Test
    @DisplayName("ADMIN peut creer un projet institutionnel sans groupe actif")
    void admin_peut_creer_projet_institutionnel() {
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(projetRepository.save(any(Projet.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(projetService.proposerProjet(request(), admin.getEmail()).getGroupeNom()).isNull();
    }

    @Test
    @DisplayName("MEMBRE sans groupe actif ne peut pas proposer un projet")
    void membre_sans_groupe_ne_peut_pas_proposer_projet() {
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(membre.getId(), StatutMembre.ACCEPTE))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> projetService.proposerProjet(request(), membre.getEmail()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("accepte dans un groupe");
    }

    @Test
    @DisplayName("MEMBRE accepte cree un projet rattache a son groupe actif")
    void membre_accepte_cree_projet_groupe() {
        MembreGroupe adhesion = new MembreGroupe();
        adhesion.setUser(membre);
        adhesion.setGroupe(groupe);
        adhesion.setStatut(StatutMembre.ACCEPTE);

        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(membre.getId(), StatutMembre.ACCEPTE))
                .thenReturn(Optional.of(adhesion));
        when(projetRepository.save(any(Projet.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(projetService.proposerProjet(request(), membre.getEmail()).getGroupeNom())
                .isEqualTo("Groupe Creatif");
    }

    @Test
    @DisplayName("REFERENT ne voit que les projets de ses groupes")
    void referent_ne_voit_que_projets_groupes() {
        Projet projet = new Projet();
        projet.setId(99L);
        projet.setTitre("Projet groupe");
        projet.setPorteur(membre);
        projet.setGroupe(groupe);

        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        when(projetRepository.findByGroupeReferentEmail(referent.getEmail())).thenReturn(List.of(projet));

        assertThat(projetService.projetsGroupesReferent(referent.getEmail())).hasSize(1);
    }

    @Test
    @DisplayName("Projet brouillon invisible publiquement")
    void projet_brouillon_invisible_publiquement() {
        assertProjetNonPublicInvisible(StatutProjet.BROUILLON);
    }

    @Test
    @DisplayName("Projet rejete invisible publiquement")
    void projet_rejete_invisible_publiquement() {
        assertProjetNonPublicInvisible(StatutProjet.REJETE);
    }

    @Test
    @DisplayName("Projet archive invisible publiquement")
    void projet_archive_invisible_publiquement() {
        assertProjetNonPublicInvisible(StatutProjet.ARCHIVE);
    }

    @Test
    @DisplayName("MEMBRE groupe A interdit sur projet du groupe B")
    void membre_groupe_a_interdit_sur_projet_groupe_b() {
        Projet projet = projet(42L, StatutProjet.SOUMIS, autreGroupe, user(6L, "porteur@test.be", Role.MEMBRE));

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(membre.getId(), StatutMembre.ACCEPTE))
                .thenReturn(Optional.of(adhesion(membre, groupe)));

        assertThatThrownBy(() -> projetService.getProjet(42L, membre.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("REFERENT groupe A interdit sur projet du groupe B")
    void referent_groupe_a_interdit_sur_projet_groupe_b() {
        Projet projet = projet(42L, StatutProjet.SOUMIS, autreGroupe, membre);

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));

        assertThatThrownBy(() -> projetService.getProjet(42L, referent.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("ADMIN autorise sur projet non public")
    void admin_autorise_sur_projet_non_public() {
        Projet projet = projet(42L, StatutProjet.BROUILLON, null, membre);

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));

        assertThat(projetService.getProjet(42L, admin.getEmail()).getId()).isEqualTo(42L);
    }

    @Test
    @DisplayName("SUPER_ADMIN limite aux projets publics")
    void super_admin_limite_aux_projets_publics() {
        Projet projetPublic = projet(42L, StatutProjet.APPROUVE, null, membre);
        Projet projetPrive = projet(43L, StatutProjet.SOUMIS, groupe, membre);

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projetPublic));
        when(projetRepository.findById(43L)).thenReturn(Optional.of(projetPrive));
        when(userRepository.findByEmail(superAdmin.getEmail())).thenReturn(Optional.of(superAdmin));

        assertThat(projetService.getProjet(42L, superAdmin.getEmail()).getId()).isEqualTo(42L);
        assertThatThrownBy(() -> projetService.getProjet(43L, superAdmin.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Commentaires soumis aux memes regles d'acces")
    void commentaires_soumis_aux_memes_regles() {
        Projet projetAutreGroupe = projet(42L, StatutProjet.SOUMIS, autreGroupe, user(6L, "porteur@test.be", Role.MEMBRE));
        CommentaireRequest commentaireRequest = new CommentaireRequest();
        commentaireRequest.setContenu("Commentaire");

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projetAutreGroupe));
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(membre.getId(), StatutMembre.ACCEPTE))
                .thenReturn(Optional.of(adhesion(membre, groupe)));

        assertThatThrownBy(() -> projetService.getCommentaires(42L, membre.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> projetService.commenterProjet(42L, commentaireRequest, membre.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("MEMBRE peut rejoindre uniquement un projet de son groupe actif")
    void membre_peut_rejoindre_projet_groupe_actif() {
        Projet projet = projet(42L, StatutProjet.SOUMIS, groupe, user(6L, "porteur@test.be", Role.MEMBRE));

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(membre.getId(), StatutMembre.ACCEPTE))
                .thenReturn(Optional.of(adhesion(membre, groupe)));
        when(participationRepository.existsByUserIdAndProjetId(membre.getId(), 42L)).thenReturn(false);
        when(participationRepository.save(any(ParticipationProjet.class))).thenAnswer(inv -> inv.getArgument(0));

        projetService.rejoindrProjet(42L, membre.getEmail());
    }

    @Test
    @DisplayName("rejoindreProjet refuse les roles non MEMBRE au service")
    void rejoindre_projet_refuse_roles_non_membre_service() {
        Projet projet = projet(42L, StatutProjet.APPROUVE, groupe, membre);

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> projetService.rejoindrProjet(42L, admin.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    private ProjetRequest request() {
        ProjetRequest request = new ProjetRequest();
        request.setTitre("Projet institutionnel");
        request.setDescription("Description");
        return request;
    }

    private void assertProjetNonPublicInvisible(StatutProjet statut) {
        Projet projet = projet(42L, statut, groupe, membre);
        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));

        assertThatThrownBy(() -> projetService.getProjet(42L))
                .isInstanceOf(AccessDeniedException.class);
    }

    private Projet projet(Long id, StatutProjet statut, Groupe groupe, User porteur) {
        Projet projet = new Projet();
        projet.setId(id);
        projet.setTitre("Projet test");
        projet.setDescription("Description");
        projet.setStatut(statut);
        projet.setGroupe(groupe);
        projet.setPorteur(porteur);
        return projet;
    }

    private MembreGroupe adhesion(User user, Groupe groupe) {
        MembreGroupe adhesion = new MembreGroupe();
        adhesion.setUser(user);
        adhesion.setGroupe(groupe);
        adhesion.setStatut(StatutMembre.ACCEPTE);
        return adhesion;
    }

    private User user(Long id, String email, Role role) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setPrenom("Test");
        user.setNom("User");
        user.setRole(role);
        user.setActif(true);
        user.setMotDePasse("secret");
        return user;
    }
}
