package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.entity.Annonce;
import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.AnnonceRepository;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.AnnonceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnnonceSecurityTest {

    @Mock private AnnonceRepository annonceRepository;
    @Mock private UserRepository userRepository;
    @Mock private GroupeRepository groupeRepository;
    @Mock private MembreGroupeRepository membreGroupeRepository;

    @InjectMocks private AnnonceService annonceService;

    private User admin;
    private User referentA;
    private User referentB;
    private Groupe groupeA;

    @BeforeEach
    void setUp() {
        admin = user(1L, "admin@test.be", Role.ADMIN);
        referentA = user(2L, "referent-a@test.be", Role.REFERENT);
        referentB = user(3L, "referent-b@test.be", Role.REFERENT);

        groupeA = new Groupe();
        groupeA.setId(10L);
        groupeA.setNom("Groupe A");
        groupeA.setReferent(referentA);
    }

    @Test
    @DisplayName("Un referent ne cree pas d'annonce globale")
    void referent_ne_cree_pas_annonce_globale() {
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));

        assertThatThrownBy(() ->
                annonceService.creerAnnonce(requeteAnnonce(null), referentA.getEmail()))
                .isInstanceOf(AccessDeniedException.class);

        verify(annonceRepository, never()).save(any(Annonce.class));
    }

    @Test
    @DisplayName("Un referent ne publie pas dans le groupe d'un autre referent")
    void referent_ne_publie_pas_autre_groupe() {
        when(userRepository.findByEmail(referentB.getEmail())).thenReturn(Optional.of(referentB));
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupeA));

        assertThatThrownBy(() ->
                annonceService.creerAnnonce(requeteAnnonce(10L), referentB.getEmail()))
                .isInstanceOf(AccessDeniedException.class);

        verify(annonceRepository, never()).save(any(Annonce.class));
    }

    @Test
    @DisplayName("Un referent publie une annonce de son groupe")
    void referent_publie_dans_propre_groupe() {
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupeA));
        when(annonceRepository.save(any(Annonce.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> resultat =
                annonceService.creerAnnonce(requeteAnnonce(10L), referentA.getEmail());

        assertThat(resultat.get("type")).isEqualTo("GROUPE");
        assertThat(resultat.get("groupeId")).isEqualTo(10L);
        assertThat(resultat.get("epinglee")).isEqualTo(false);
    }

    @Test
    @DisplayName("Un referent ne supprime pas l'annonce d'un autre auteur")
    void referent_ne_supprime_pas_annonce_autre_auteur() {
        Annonce annonce = annonce(referentA, groupeA);
        when(userRepository.findByEmail(referentB.getEmail())).thenReturn(Optional.of(referentB));
        when(annonceRepository.findById(30L)).thenReturn(Optional.of(annonce));

        assertThatThrownBy(() -> annonceService.supprimer(30L, referentB.getEmail()))
                .isInstanceOf(AccessDeniedException.class);

        verify(annonceRepository, never()).delete(any(Annonce.class));
    }

    @Test
    @DisplayName("Un referent supprime sa propre annonce de groupe")
    void referent_supprime_propre_annonce_groupe() {
        Annonce annonce = annonce(referentA, groupeA);
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(annonceRepository.findById(30L)).thenReturn(Optional.of(annonce));

        annonceService.supprimer(30L, referentA.getEmail());

        verify(annonceRepository).delete(annonce);
    }

    @Test
    @DisplayName("Seul ADMIN peut creer une annonce globale")
    void admin_peut_creer_annonce_globale() {
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(annonceRepository.save(any(Annonce.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> resultat =
                annonceService.creerAnnonce(requeteAnnonce(null), admin.getEmail());

        assertThat(resultat.get("type")).isEqualTo("GLOBALE");
        assertThat(resultat).doesNotContainKey("groupeId");
    }

    private Map<String, Object> requeteAnnonce(Long groupeId) {
        Map<String, Object> request = new HashMap<>();
        request.put("titre", "Information");
        request.put("contenu", "Contenu");
        request.put("type", groupeId == null ? "GLOBALE" : "GROUPE");
        if (groupeId != null) {
            request.put("groupeId", groupeId);
        }
        return request;
    }

    private Annonce annonce(User auteur, Groupe groupe) {
        Annonce annonce = new Annonce();
        annonce.setId(30L);
        annonce.setTitre("Annonce");
        annonce.setContenu("Contenu");
        annonce.setType("GROUPE");
        annonce.setAuteur(auteur);
        annonce.setGroupe(groupe);
        return annonce;
    }

    private User user(Long id, String email, Role role) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setPrenom("Test");
        user.setNom("User");
        user.setRole(role);
        return user;
    }
}
