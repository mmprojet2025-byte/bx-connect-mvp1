package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.PartenaireProfilRequest;
import com.bxjeunes.bx_connect.dto.PartenaireProfilResponse;
import com.bxjeunes.bx_connect.entity.PartenaireProfil;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.TypePartenaire;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.*;
import com.bxjeunes.bx_connect.service.AuditLogService;
import com.bxjeunes.bx_connect.service.PartenaireService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartenaireProfilServiceTest {

    @Mock private SoutienFinancierRepository soutienRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProjetRepository projetRepository;
    @Mock private ActiviteRepository activiteRepository;
    @Mock private PartenaireProfilRepository profilRepository;
    @Mock private AuditLogService auditLogService;

    @InjectMocks private PartenaireService partenaireService;

    private User partenaire;

    @BeforeEach
    void setUp() {
        partenaire = new User();
        partenaire.setId(25L);
        partenaire.setPrenom("Rebecca");
        partenaire.setNom("Aguiar");
        partenaire.setEmail("rebecca@commune.test");
        partenaire.setRole(Role.PARTENAIRE);
    }

    @Test
    void retourne_un_profil_par_defaut_si_aucune_fiche_n_existe() {
        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(profilRepository.findByUtilisateurId(partenaire.getId())).thenReturn(Optional.empty());

        PartenaireProfilResponse response =
                partenaireService.getProfilInstitutionnel(partenaire.getEmail());

        assertThat(response.getNomOrganisation()).isEqualTo("Rebecca Aguiar");
        assertThat(response.getTypePartenaire()).isEqualTo(TypePartenaire.AUTRE);
        assertThat(response.getEmailContact()).isEqualTo(partenaire.getEmail());
    }

    @Test
    void enregistre_la_fiche_institutionnelle_du_partenaire() {
        PartenaireProfilRequest request = new PartenaireProfilRequest();
        request.setNomOrganisation("Commune de Bruxelles");
        request.setTypePartenaire(TypePartenaire.COMMUNE);
        request.setPersonneContact("Rebecca Aguiar");
        request.setEmailContact("contact@bruxelles.test");

        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(profilRepository.findByUtilisateurId(partenaire.getId())).thenReturn(Optional.empty());
        when(profilRepository.save(any())).thenAnswer(invocation -> {
            PartenaireProfil profil = invocation.getArgument(0);
            profil.setId(12L);
            return profil;
        });

        PartenaireProfilResponse response =
                partenaireService.enregistrerProfilInstitutionnel(request, partenaire.getEmail());

        assertThat(response.getNomOrganisation()).isEqualTo("Commune de Bruxelles");
        assertThat(response.getTypePartenaire()).isEqualTo(TypePartenaire.COMMUNE);
        assertThat(response.getPersonneContact()).isEqualTo("Rebecca Aguiar");
        verify(auditLogService).logAction(
                org.mockito.ArgumentMatchers.same(partenaire),
                org.mockito.ArgumentMatchers.eq("PARTNER_PROFILE_UPDATED"),
                org.mockito.ArgumentMatchers.eq("PARTNER_PROFILE"),
                org.mockito.ArgumentMatchers.eq(12L),
                org.mockito.ArgumentMatchers.eq("Commune de Bruxelles"),
                org.mockito.ArgumentMatchers.eq("rebecca@commune.test"),
                org.mockito.ArgumentMatchers.eq("Profil partenaire modifie."),
                org.mockito.ArgumentMatchers.contains("\"partenaireId\":25"));
    }

    @Test
    void statistiques_exposent_l_impact_reel_du_partenaire() {
        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(soutienRepository.countByDonateurId(partenaire.getId())).thenReturn(4L);
        when(soutienRepository.totalMontantDonateur(partenaire.getId())).thenReturn(new BigDecimal("1250.00"));
        when(soutienRepository.findByDonateurIdAndStatutPaiement(any(), any())).thenReturn(java.util.List.of());
        when(soutienRepository.countProjetsSoutenusParDonateur(partenaire.getId())).thenReturn(2L);
        when(soutienRepository.countActivitesSoutenuesParDonateur(partenaire.getId())).thenReturn(1L);

        var stats = partenaireService.statistiques(partenaire.getEmail());

        assertThat(stats.get("totalSoutiens")).isEqualTo(4L);
        assertThat(stats.get("totalMontant")).isEqualTo(new BigDecimal("1250.00"));
        assertThat(stats.get("projetsSoutenus")).isEqualTo(2L);
        assertThat(stats.get("activitesSoutenues")).isEqualTo(1L);
    }

    @Test
    void expose_les_partenaires_publics_actifs() {
        PartenaireProfil profil = new PartenaireProfil();
        profil.setId(12L);
        profil.setUtilisateur(partenaire);
        profil.setNomOrganisation("Commune de Bruxelles");
        profil.setTypePartenaire(TypePartenaire.COMMUNE);
        profil.setLogoUrl("https://example.test/logo.png");
        profil.setDescription("Partenaire institutionnel local.");
        profil.setSiteWeb("https://bruxelles.test");

        when(profilRepository.findPublicActiveProfiles()).thenReturn(List.of(profil));

        var publics = partenaireService.partenairesPublics();

        assertThat(publics).hasSize(1);
        assertThat(publics.get(0).getNomOrganisation()).isEqualTo("Commune de Bruxelles");
        assertThat(publics.get(0).getTypePartenaire()).isEqualTo(TypePartenaire.COMMUNE);
        assertThat(publics.get(0).getLogoUrl()).isEqualTo("https://example.test/logo.png");
        assertThat(publics.get(0).getSiteWeb()).isEqualTo("https://bruxelles.test");
    }
}
