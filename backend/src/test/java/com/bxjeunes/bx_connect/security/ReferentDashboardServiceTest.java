package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.entity.Projet;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutProjet;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import com.bxjeunes.bx_connect.repository.ProjetRepository;
import com.bxjeunes.bx_connect.repository.SoutienFinancierRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.ReferentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReferentDashboardServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private ActiviteRepository activiteRepository;
    @Mock private ProjetRepository projetRepository;
    @Mock private InscriptionRepository inscriptionRepository;
    @Mock private SoutienFinancierRepository soutienRepository;

    private ReferentService referentService;

    @BeforeEach
    void setUp() {
        referentService = new ReferentService(
                userRepository,
                activiteRepository,
                projetRepository,
                inscriptionRepository,
                soutienRepository);
    }

    @Test
    @DisplayName("Le dashboard referent expose uniquement les projets soumis de ses groupes")
    void dashboard_filtre_les_projets_par_groupes_du_referent() {
        String email = "referent@bxconnect.be";
        User referent = new User();
        referent.setId(7L);
        referent.setPrenom("Rita");
        referent.setNom("Referente");
        referent.setEmail(email);
        referent.setRole(Role.REFERENT);

        Projet soumis = projet(11L, "Projet soumis", StatutProjet.SOUMIS);
        Projet brouillon = projet(12L, "Projet brouillon", StatutProjet.BROUILLON);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(referent));
        when(activiteRepository.findByCreateurId(referent.getId())).thenReturn(List.of());
        when(projetRepository.findByGroupeReferentEmail(email))
                .thenReturn(List.of(soumis, brouillon));

        var dashboard = referentService.dashboard(email);

        assertThat(dashboard.get("projetsSoumis")).isEqualTo(1);
        assertThat((List<?>) dashboard.get("projetsSoumisListe"))
                .extracting("id")
                .containsExactly(11L);
        verify(projetRepository, never()).findByStatut(StatutProjet.SOUMIS);
    }

    private Projet projet(Long id, String titre, StatutProjet statut) {
        Projet projet = new Projet();
        projet.setId(id);
        projet.setTitre(titre);
        projet.setStatut(statut);
        return projet;
    }
}
