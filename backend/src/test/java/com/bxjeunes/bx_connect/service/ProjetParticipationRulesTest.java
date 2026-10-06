package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.ProjetRequest;
import com.bxjeunes.bx_connect.dto.ProjetResponse;
import com.bxjeunes.bx_connect.entity.Projet;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.time.ZoneId;
import static org.assertj.core.api.Assertions.*;

class ProjetParticipationRulesTest {
    @Test void savesAndExposesDetailsWithoutInventingLegacyValues() {
        Projet p = new Projet(); ProjetRequest r = new ProjetRequest();
        ProjetParticipationRules.apply(p, r, "http://localhost:8080/uploads");
        assertThat(ProjetResponse.fromEntity(p).getCapacite()).isNull();
        r.setCapacite(12); r.setDateExecution(LocalDate.of(2030, 5, 5));
        r.setDateLimiteParticipation(LocalDate.of(2030, 5, 4));
        r.setImageUrl("http://localhost:8080/uploads/projets/12345678-1234-1234-1234-123456789012.png");
        ProjetParticipationRules.apply(p, r, "http://localhost:8080/uploads");
        ProjetResponse response = ProjetResponse.fromEntity(p);
        assertThat(response.getCapacite()).isEqualTo(12);
        assertThat(response.getDateExecution()).isEqualTo(r.getDateExecution());
        assertThat(response.getDateLimiteParticipation()).isEqualTo(r.getDateLimiteParticipation());
        assertThat(response.getImageUrl()).isEqualTo(r.getImageUrl());
    }
    @Test void rejectsInvalidCapacityAndDeadline() {
        Projet p = new Projet(); ProjetRequest r = new ProjetRequest(); r.setCapacite(0);
        assertThatThrownBy(() -> ProjetParticipationRules.apply(p, r, "http://localhost:8080/uploads")).hasMessageContaining("capacité");
        r.setCapacite(2); r.setDateExecution(LocalDate.of(2030, 1, 1)); r.setDateLimiteParticipation(LocalDate.of(2030, 1, 2));
        assertThatThrownBy(() -> ProjetParticipationRules.apply(p, r, "http://localhost:8080/uploads")).hasMessageContaining("date limite");
    }
    @Test void deadlineIsInclusiveInBrusselsAndExecutionAlsoClosesParticipation() {
        Projet p = new Projet(); LocalDate today = LocalDate.now(ZoneId.of("Europe/Brussels"));
        p.setDateLimiteParticipation(today);
        assertThatCode(() -> ProjetParticipationRules.checkOpen(p)).doesNotThrowAnyException();
        p.setDateLimiteParticipation(today.minusDays(1));
        assertThatThrownBy(() -> ProjetParticipationRules.checkOpen(p)).hasMessageContaining("clôturées");
        p.setDateLimiteParticipation(null); p.setDateExecution(today.minusDays(1));
        assertThatThrownBy(() -> ProjetParticipationRules.checkOpen(p)).hasMessageContaining("clôturées");
    }
    @Test void fullCapacityIsRefusedButNullRemainsUnlimited() {
        Projet p = new Projet(); ProjetParticipationRules.checkCapacity(p, 100);
        p.setCapacite(2); ProjetParticipationRules.checkCapacity(p, 1);
        assertThatThrownBy(() -> ProjetParticipationRules.checkCapacity(p, 2)).hasMessageContaining("complet");
    }
    @Test void rejectsUnsafeImages() {
        for (String image : new String[]{"javascript:alert(1)", "data:image/png;base64,abc", "/uploads/projets/../../x.png"}) {
            ProjetRequest r = new ProjetRequest(); r.setImageUrl(image);
            assertThatThrownBy(() -> ProjetParticipationRules.apply(new Projet(), r, "http://localhost:8080/uploads")).isInstanceOf(IllegalArgumentException.class);
        }
    }
}
