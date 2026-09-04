package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.RegisterRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.Test;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RegisterRequestValidationTest {

    @Test
    void date_naissance_absente_est_refusee_par_le_contrat_http() {
        RegisterRequest request = validRequest();
        request.setDateNaissance(null);

        try (LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean()) {
            validator.afterPropertiesSet();
            assertThat(validator.validate(request)).anyMatch(violation ->
                    "dateNaissance".equals(violation.getPropertyPath().toString()));
        }
    }

    @Test
    void date_naissance_future_est_refusee_par_le_contrat_http() {
        RegisterRequest request = validRequest();
        request.setDateNaissance(LocalDate.now().plusDays(1));

        try (LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean()) {
            validator.afterPropertiesSet();
            assertThat(validator.validate(request)).anyMatch(violation ->
                    "dateNaissance".equals(violation.getPropertyPath().toString()));
        }
    }

    @Test
    void date_naissance_non_iso_est_refusee_a_la_deserialisation() {
        String json = "{\"dateNaissance\":\"03/09/2000\"}";
        JsonMapper mapper = JsonMapper.builder().findAndAddModules().build();

        assertThatThrownBy(() -> mapper.readValue(json, RegisterRequest.class))
                .isInstanceOf(JsonProcessingException.class);
    }

    private RegisterRequest validRequest() {
        RegisterRequest request = new RegisterRequest();
        request.setPrenom("Test");
        request.setNom("User");
        request.setEmail("test@example.org");
        request.setDateNaissance(LocalDate.of(1995, 6, 15));
        request.setMotDePasse("Password123!");
        request.setTermsAccepted(true);
        request.setPrivacyAccepted(true);
        request.setLegalVersion("v1.1 — 03/09/2026");
        return request;
    }
}
