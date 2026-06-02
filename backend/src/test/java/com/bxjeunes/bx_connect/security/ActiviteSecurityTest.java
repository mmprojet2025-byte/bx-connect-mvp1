package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import com.bxjeunes.bx_connect.repository.ProjetRepository;
import com.bxjeunes.bx_connect.repository.SoutienFinancierRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.ActiviteService;
import com.bxjeunes.bx_connect.service.InscriptionService;
import com.bxjeunes.bx_connect.service.ReferentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActiviteSecurityTest {

    @Mock private ActiviteRepository activiteRepository;
    @Mock private UserRepository userRepository;
    @Mock private InscriptionRepository inscriptionRepository;
    @Mock private ProjetRepository projetRepository;
    @Mock private SoutienFinancierRepository soutienRepository;

    @InjectMocks private ActiviteService activiteService;
    @InjectMocks private InscriptionService inscriptionService;
    @InjectMocks private ReferentService referentService;

    private User admin;
    private User referentA;
    private User referentB;
    private Activite activiteBrouillon;
    private Activite activiteReferentB;

    @BeforeEach
    void setUp() {
        admin = user(1L, "admin@test.be", Role.ADMIN);
        referentA = user(2L, "referent-a@test.be", Role.REFERENT);
        referentB = user(3L, "referent-b@test.be", Role.REFERENT);

        activiteBrouillon = activite(10L, "Brouillon", StatutActivite.BROUILLON, admin);
        activiteReferentB = activite(20L, "Activite B", StatutActivite.PUBLIEE, referentB);
    }

    @Test
    @DisplayName("Une activite non publiee est invisible publiquement")
    void activite_non_publiee_invisible_publiquement() {
        when(activiteRepository.findById(10L)).thenReturn(Optional.of(activiteBrouillon));

        assertThatThrownBy(() -> activiteService.getById(10L, null))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("introuvable");
    }

    @Test
    @DisplayName("Un referent ne peut pas consulter le detail d'une activite d'autrui")
    void referent_ne_consulte_pas_activite_autrui() {
        when(activiteRepository.findById(20L)).thenReturn(Optional.of(activiteReferentB));
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));

        assertThatThrownBy(() -> activiteService.getById(20L, referentA.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Un referent ne peut pas consulter les inscriptions d'une activite d'autrui")
    void referent_ne_consulte_pas_inscriptions_activite_autrui() {
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(activiteRepository.findById(20L)).thenReturn(Optional.of(activiteReferentB));

        assertThatThrownBy(() -> inscriptionService.inscriptionsParActivite(20L, referentA.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        verify(inscriptionRepository, never()).findByActiviteId(20L);
    }

    @Test
    @DisplayName("Un referent ne peut pas exporter les participants d'une activite d'autrui")
    void referent_ne_exporte_pas_participants_activite_autrui() {
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(activiteRepository.findById(20L)).thenReturn(Optional.of(activiteReferentB));

        assertThatThrownBy(() -> referentService.exporterParticipants(20L, referentA.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        verify(inscriptionRepository, never()).findByActiviteId(20L);
    }

    @Test
    @DisplayName("ADMIN peut consulter les inscriptions d'une activite")
    void admin_peut_consulter_inscriptions_activite() {
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(activiteRepository.findById(20L)).thenReturn(Optional.of(activiteReferentB));
        when(inscriptionRepository.findByActiviteId(20L)).thenReturn(List.of());

        inscriptionService.inscriptionsParActivite(20L, admin.getEmail());

        verify(inscriptionRepository).findByActiviteId(20L);
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

    private Activite activite(Long id, String titre, StatutActivite statut, User createur) {
        Activite activite = new Activite();
        activite.setId(id);
        activite.setTitre(titre);
        activite.setDescription("Description");
        activite.setDateDebut(LocalDateTime.now().plusDays(1));
        activite.setDateFin(LocalDateTime.now().plusDays(1).plusHours(2));
        activite.setLieu("Bruxelles");
        activite.setGratuite(true);
        activite.setCapaciteMax(10);
        activite.setStatut(statut);
        activite.setCreateur(createur);
        return activite;
    }
}
