package com.bxjeunes.bx_connect.integration;

import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Testcontainers
class SupportDeclarationsMySqlTest {
    @Container static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("support_test").withUsername("test").withPassword("disposable_test");
    @DynamicPropertySource static void database(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url", mysql::getJdbcUrl);
        p.add("spring.datasource.username", mysql::getUsername);
        p.add("spring.datasource.password", mysql::getPassword);
        p.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        p.add("spring.flyway.enabled", () -> "true");
    }
    @Autowired SoutienFinancierRepository supports;
    @Autowired UserRepository users;
    @Autowired ProjetRepository projects;
    @Autowired ActiviteRepository activities;

    @Test void listsAndPaginationExcludePaymentsAndInvalidDeclarationTargets() {
        User user = new User(); user.setEmail("partner@test.invalid"); user.setNom("Test");
        user.setPrenom("Test"); user.setMotDePasse("unused"); user.setRole(Role.PARTENAIRE);
        users.saveAndFlush(user);
        Projet project = new Projet(); project.setTitre("Projet"); project.setPorteur(user);
        projects.saveAndFlush(project);
        Activite activity = new Activite(); activity.setTitre("Activité"); activity.setCreateur(user);
        activity.setDateDebut(LocalDateTime.now()); activity.setDateFin(LocalDateTime.now().plusHours(1));
        activities.saveAndFlush(activity);
        var pending = save(user, project, null, "DECLARATION", StatutPaiement.EN_ATTENTE);
        var accepted = save(user, project, null, "DECLARATION", StatutPaiement.PAYE);
        save(user, project, null, "STRIPE", StatutPaiement.EN_ATTENTE);
        save(user, null, activity, "STRIPE", StatutPaiement.PAYE);
        save(user, project, null, "PAYPAL", StatutPaiement.EN_ATTENTE);
        save(user, project, activity, "DECLARATION", StatutPaiement.EN_ATTENTE);
        save(user, null, null, "DECLARATION", StatutPaiement.EN_ATTENTE);
        assertThat(supports.findAdminDeclarations(null)).containsExactlyInAnyOrder(pending, accepted);
        var page = supports.findAdminDeclarations(null, PageRequest.of(0, 1));
        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getTotalPages()).isEqualTo(2);
        assertThat(supports.findAdminDeclarations(StatutPaiement.EN_ATTENTE, PageRequest.of(0, 10))
                .getContent()).containsExactly(pending);
        assertThat(supports.findAll()).hasSize(7);
    }

    private SoutienFinancier save(User user, Projet project, Activite activity, String source, StatutPaiement status) {
        var support = new SoutienFinancier(); support.setDonateur(user); support.setProjet(project);
        support.setActivite(activity); support.setMontant(BigDecimal.TEN);
        support.setTypeSource(source); support.setStatutPaiement(status);
        return supports.saveAndFlush(support);
    }
}
