package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.ProjetRequest;
import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.MembreGroupe;
import com.bxjeunes.bx_connect.entity.Projet;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutMembre;
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
    private User referent;
    private Groupe groupe;

    @BeforeEach
    void setUp() {
        admin = user(1L, "admin@test.be", Role.ADMIN);
        membre = user(2L, "membre@test.be", Role.MEMBRE);
        referent = user(3L, "referent@test.be", Role.REFERENT);

        groupe = new Groupe();
        groupe.setId(10L);
        groupe.setNom("Groupe Creatif");
        groupe.setReferent(referent);
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

    private ProjetRequest request() {
        ProjetRequest request = new ProjetRequest();
        request.setTitre("Projet institutionnel");
        request.setDescription("Description");
        return request;
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
