package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.membre.MembreDashboardResponse;
import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.Inscription;
import com.bxjeunes.bx_connect.entity.MembreGroupe;
import com.bxjeunes.bx_connect.entity.Projet;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutInscription;
import com.bxjeunes.bx_connect.entity.StatutMembre;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.NotificationRepository;
import com.bxjeunes.bx_connect.repository.ProjetRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.MembreDashboardService;
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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MembreDashboardServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private MembreGroupeRepository membreGroupeRepository;
    @Mock private InscriptionRepository inscriptionRepository;
    @Mock private ProjetRepository projetRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private ActiviteRepository activiteRepository;

    @InjectMocks
    private MembreDashboardService membreDashboardService;

    private User membre;
    private User referent;

    @BeforeEach
    void setUp() {
        membre = user(1L, "membre@test.be", Role.MEMBRE);
        referent = user(2L, "referent@test.be", Role.REFERENT);
    }

    @Test
    @DisplayName("Dashboard membre sans groupe retourne un etat vide exploitable")
    void dashboard_membre_sans_groupe() {
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(membreGroupeRepository.findByUserId(membre.getId())).thenReturn(List.of());
        when(inscriptionRepository.findByMembreId(membre.getId())).thenReturn(List.of());
        when(projetRepository.findByPorteurId(membre.getId())).thenReturn(List.of());
        when(notificationRepository.findByDestinataireIdOrderByDateCreationDesc(membre.getId())).thenReturn(List.of());

        MembreDashboardResponse response = membreDashboardService.dashboard(membre.getEmail());

        assertThat(response.getGroupe()).isNull();
        assertThat(response.getReferent()).isNull();
        assertThat(response.isMessagerieDisponible()).isFalse();
        assertThat(response.getImplication().getStatut()).isEqualTo("NOUVEAU_MEMBRE");
    }

    @Test
    @DisplayName("Dashboard membre accepte expose groupe, referent et messagerie disponible")
    void dashboard_membre_accepte() {
        Groupe groupe = new Groupe();
        groupe.setId(10L);
        groupe.setNom("Groupe Creatif");
        groupe.setReferent(referent);

        MembreGroupe adhesion = new MembreGroupe();
        adhesion.setUser(membre);
        adhesion.setGroupe(groupe);
        adhesion.setStatut(StatutMembre.ACCEPTE);

        Inscription inscription = new Inscription();
        inscription.setId(100L);
        inscription.setMembre(membre);
        inscription.setStatut(StatutInscription.CONFIRMEE);

        Projet projet = new Projet();
        projet.setId(200L);
        projet.setTitre("Fresque collective");
        projet.setPorteur(membre);

        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(membreGroupeRepository.findByUserId(membre.getId())).thenReturn(List.of(adhesion));
        when(membreGroupeRepository.countByGroupeIdAndStatut(10L, StatutMembre.ACCEPTE)).thenReturn(1L);
        when(activiteRepository.findByCreateurIdAndStatut(org.mockito.Mockito.eq(referent.getId()), org.mockito.Mockito.any()))
                .thenReturn(List.of());
        when(inscriptionRepository.findByMembreId(membre.getId())).thenReturn(List.of(inscription));
        when(projetRepository.findByPorteurId(membre.getId())).thenReturn(List.of(projet));
        when(notificationRepository.findByDestinataireIdOrderByDateCreationDesc(membre.getId())).thenReturn(List.of());

        MembreDashboardResponse response = membreDashboardService.dashboard(membre.getEmail());

        assertThat(response.getGroupe().getNom()).isEqualTo("Groupe Creatif");
        assertThat(response.getReferent().getEmail()).isEqualTo("referent@test.be");
        assertThat(response.isMessagerieDisponible()).isTrue();
        assertThat(response.getImplication().getStatut()).isEqualTo("MEMBRE_ACTIF");
    }

    @Test
    @DisplayName("Dashboard membre refuse les roles non MEMBRE")
    void dashboard_refuse_role_non_membre() {
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));

        assertThatThrownBy(() -> membreDashboardService.dashboard(referent.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
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
