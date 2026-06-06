package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.SoutienRequest;
import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.Projet;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import com.bxjeunes.bx_connect.entity.StatutProjet;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.entity.VisibiliteProjet;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.PartenaireProfilRepository;
import com.bxjeunes.bx_connect.repository.ProjetRepository;
import com.bxjeunes.bx_connect.repository.SoutienFinancierRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.PartenaireService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartenaireProjetSecurityTest {

    @Mock private SoutienFinancierRepository soutienRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProjetRepository projetRepository;
    @Mock private ActiviteRepository activiteRepository;
    @Mock private PartenaireProfilRepository partenaireProfilRepository;

    @InjectMocks
    private PartenaireService partenaireService;

    private User partenaire;

    @BeforeEach
    void setUp() {
        partenaire = new User();
        partenaire.setId(50L);
        partenaire.setEmail("partenaire@test.be");
        partenaire.setRole(Role.PARTENAIRE);
    }

    @Test
    @DisplayName("Liste partenaire limitee aux projets PARTENAIRES et PUBLIC ouverts")
    void liste_partenaire_limitee_aux_projets_ouverts() {
        Projet projet = projet(1L, StatutProjet.APPROUVE, VisibiliteProjet.PARTENAIRES);
        when(projetRepository.findByStatutInAndVisibiliteIn(
                List.of(StatutProjet.APPROUVE, StatutProjet.EN_COURS),
                List.of(VisibiliteProjet.PARTENAIRES, VisibiliteProjet.PUBLIC)))
                .thenReturn(List.of(projet));
        when(soutienRepository.totalSoutiensProjet(1L)).thenReturn(BigDecimal.ZERO);

        assertThat(partenaireService.projetsSoutienOuverts()).hasSize(1);
    }

    @Test
    @DisplayName("Partenaire ne peut pas soutenir un projet GROUPE")
    void partenaire_ne_soutient_pas_projet_groupe() {
        Projet projet = projet(1L, StatutProjet.APPROUVE, VisibiliteProjet.GROUPE);
        SoutienRequest request = new SoutienRequest();
        request.setProjetId(1L);
        request.setMontant(BigDecimal.TEN);

        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(projetRepository.findById(1L)).thenReturn(Optional.of(projet));

        assertThatThrownBy(() -> partenaireService.soutenirProjet(request, partenaire.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Partenaire peut soutenir un projet PUBLIC approuve")
    void partenaire_soutient_projet_public_approuve() {
        Projet projet = projet(1L, StatutProjet.APPROUVE, VisibiliteProjet.PUBLIC);
        SoutienRequest request = new SoutienRequest();
        request.setProjetId(1L);
        request.setMontant(BigDecimal.TEN);

        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(projetRepository.findById(1L)).thenReturn(Optional.of(projet));
        when(soutienRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(partenaireService.soutenirProjet(request, partenaire.getEmail()).getMontant())
                .isEqualByComparingTo(BigDecimal.TEN);
    }

    @Test
    @DisplayName("Partenaire ne peut pas soutenir une activite non publiee")
    void partenaire_ne_soutient_pas_activite_non_publiee() {
        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));

        for (StatutActivite statut : List.of(
                StatutActivite.BROUILLON,
                StatutActivite.ANNULEE,
                StatutActivite.TERMINEE)) {
            Activite activite = activite(10L, statut);
            SoutienRequest request = new SoutienRequest();
            request.setActiviteId(10L);
            request.setMontant(BigDecimal.TEN);
            when(activiteRepository.findById(10L)).thenReturn(Optional.of(activite));

            assertThatThrownBy(() -> partenaireService.soutenirActivite(request, partenaire.getEmail()))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("n'est pas ouverte");
        }
    }

    @Test
    @DisplayName("Partenaire peut soutenir une activite publiee")
    void partenaire_soutient_activite_publiee() {
        SoutienRequest request = new SoutienRequest();
        request.setActiviteId(10L);
        request.setMontant(BigDecimal.TEN);

        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(activiteRepository.findById(10L))
                .thenReturn(Optional.of(activite(10L, StatutActivite.PUBLIEE)));
        when(soutienRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(partenaireService.soutenirActivite(request, partenaire.getEmail()).getMontant())
                .isEqualByComparingTo(BigDecimal.TEN);
    }

    private Projet projet(Long id, StatutProjet statut, VisibiliteProjet visibilite) {
        User porteur = new User();
        porteur.setId(1L);
        porteur.setPrenom("Admin");
        porteur.setNom("Test");

        Projet projet = new Projet();
        projet.setId(id);
        projet.setTitre("Projet");
        projet.setStatut(statut);
        projet.setVisibilite(visibilite);
        projet.setPorteur(porteur);
        return projet;
    }

    private Activite activite(Long id, StatutActivite statut) {
        Activite activite = new Activite();
        activite.setId(id);
        activite.setTitre("Activité");
        activite.setStatut(statut);
        activite.setCreateur(partenaire);
        return activite;
    }
}
