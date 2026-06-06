package com.bxjeunes.bx_connect.config;

import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.PartenaireProfilRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConditionalOnProperty(name = "bx.demo.partners.enabled", havingValue = "true")
public class PartenaireDemoDataBootstrap implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PartenaireProfilRepository profilRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${bx.demo.partners.password:DemoPartner123!}")
    private String demoPassword;

    public PartenaireDemoDataBootstrap(UserRepository userRepository,
                                       PartenaireProfilRepository profilRepository,
                                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.profilRepository = profilRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<DemoPartenaire> partenaires = List.of(
                new DemoPartenaire("Commune", "Bruxelles", "partenaire.commune@bx-connect.local",
                        "Commune de Bruxelles", TypePartenaire.COMMUNE, "Rebecca Aguiar",
                        "Partenaire public engagé dans les initiatives locales pour la jeunesse."),
                new DemoPartenaire("BIJ", "Bruxelles", "partenaire.bij@bx-connect.local",
                        "BIJ Bruxelles", TypePartenaire.BIJ, "Équipe BIJ",
                        "Bureau d'information jeunesse soutenant l'orientation et les projets citoyens."),
                new DemoPartenaire("D'Broej", "Bruxelles", "partenaire.dbroej@bx-connect.local",
                        "D'Broej", TypePartenaire.ASSOCIATION, "Coordination D'Broej",
                        "Association bruxelloise active dans l'accompagnement et l'émancipation des jeunes."),
                new DemoPartenaire("Entreprise", "Impact", "partenaire.sponsor@bx-connect.local",
                        "Entreprise Impact", TypePartenaire.SPONSOR, "Responsable partenariats",
                        "Entreprise sponsor contribuant au financement d'initiatives à impact social."),
                new DemoPartenaire("Fondation", "Solidaire", "partenaire.fondation@bx-connect.local",
                        "Fondation Solidaire", TypePartenaire.FONDATION, "Équipe Fondation",
                        "Fondation partenaire soutenant les projets éducatifs et communautaires.")
        );

        partenaires.forEach(this::creerSiAbsent);
    }

    private void creerSiAbsent(DemoPartenaire demo) {
        User user = userRepository.findByEmail(demo.email())
                .orElseGet(() -> userRepository.save(User.builder()
                        .prenom(demo.prenom())
                        .nom(demo.nom())
                        .email(demo.email())
                        .motDePasse(passwordEncoder.encode(demoPassword))
                        .role(Role.PARTENAIRE)
                        .languePreference(Langue.FR)
                        .actif(true)
                        .build()));

        if (user.getRole() != Role.PARTENAIRE || profilRepository.existsByUtilisateurId(user.getId())) {
            return;
        }

        PartenaireProfil profil = new PartenaireProfil();
        profil.setUtilisateur(user);
        profil.setNomOrganisation(demo.organisation());
        profil.setTypePartenaire(demo.type());
        profil.setPersonneContact(demo.contact());
        profil.setEmailContact(demo.email());
        profil.setDescription(demo.description());
        profilRepository.save(profil);
    }

    private record DemoPartenaire(
            String prenom,
            String nom,
            String email,
            String organisation,
            TypePartenaire type,
            String contact,
            String description) {
    }
}
