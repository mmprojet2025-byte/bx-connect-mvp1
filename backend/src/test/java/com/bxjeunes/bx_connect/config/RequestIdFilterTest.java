package com.bxjeunes.bx_connect.config;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.MediaType;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.stereotype.Controller;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RequestIdFilterTest {

    @Test
    void genereUnRequestIdSiAbsent() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/actuator/health");
        MockHttpServletResponse response = new MockHttpServletResponse();

        new RequestIdFilter().doFilter(request, response, new MockFilterChain());

        String requestId = response.getHeader(RequestIdFilter.HEADER_NAME);
        assertThat(requestId).isNotBlank();
        assertThatCode(() -> UUID.fromString(requestId)).doesNotThrowAnyException();
    }

    @Test
    void reutiliseUnRequestIdValide() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/test");
        MockHttpServletResponse response = new MockHttpServletResponse();
        request.addHeader(RequestIdFilter.HEADER_NAME, "client-id_123:abc.def-456");

        new RequestIdFilter().doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader(RequestIdFilter.HEADER_NAME)).isEqualTo("client-id_123:abc.def-456");
    }

    @Test
    void remplaceUnRequestIdInvalide() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/test");
        MockHttpServletResponse response = new MockHttpServletResponse();
        request.addHeader(RequestIdFilter.HEADER_NAME, "bad\nheader-value-with-dangerous-characters");

        new RequestIdFilter().doFilter(request, response, new MockFilterChain());

        String requestId = response.getHeader(RequestIdFilter.HEADER_NAME);
        assertThat(requestId).isNotBlank();
        assertThat(requestId).isNotEqualTo("bad\nheader-value-with-dangerous-characters");
        assertThatCode(() -> UUID.fromString(requestId)).doesNotThrowAnyException();
    }

    @Test
    void remplaceUnRequestIdTropLong() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/test");
        MockHttpServletResponse response = new MockHttpServletResponse();
        request.addHeader(RequestIdFilter.HEADER_NAME, "a".repeat(65));

        new RequestIdFilter().doFilter(request, response, new MockFilterChain());

        String requestId = response.getHeader(RequestIdFilter.HEADER_NAME);
        assertThat(requestId).isNotBlank();
        assertThat(requestId).hasSizeLessThanOrEqualTo(64);
        assertThat(requestId).isNotEqualTo("a".repeat(65));
        assertThatCode(() -> UUID.fromString(requestId)).doesNotThrowAnyException();
    }

    @Test
    void nettoieLeMdcApresLaRequete() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/test");
        MockHttpServletResponse response = new MockHttpServletResponse();

        new RequestIdFilter().doFilter(request, response, new MockFilterChain());

        assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isNull();
    }

    @Test
    void nettoieLeMdcMemeSiLaRequeteEchoue() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/test");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertThatThrownBy(() -> new RequestIdFilter().doFilter(request, response,
                (servletRequest, servletResponse) -> {
                    throw new ServletException("boom");
                }))
                .isInstanceOf(ServletException.class);

        assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isNull();
        assertThat(response.getHeader(RequestIdFilter.HEADER_NAME)).isNotBlank();
    }

    @Test
    void ajouteLeHeaderRequestIdDansLaReponse() throws Exception {
        MockMvc mockMvc = mockMvc();

        mockMvc.perform(get("/ok").header(RequestIdFilter.HEADER_NAME, "frontend-123"))
                .andExpect(status().isOk())
                .andExpect(header().string(RequestIdFilter.HEADER_NAME, "frontend-123"));
    }

    @Test
    void erreur500ContientRequestIdSansDetailSensible() throws Exception {
        MockMvc mockMvc = mockMvc();

        mockMvc.perform(get("/boom").header(RequestIdFilter.HEADER_NAME, "incident-123"))
                .andExpect(status().isInternalServerError())
                .andExpect(header().string(RequestIdFilter.HEADER_NAME, "incident-123"))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.message").value("Une erreur inattendue est survenue."))
                .andExpect(jsonPath("$.requestId").value("incident-123"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("/Users/"))))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("secret"))));
    }

    private MockMvc mockMvc() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        return MockMvcBuilders
                .standaloneSetup(new MonitoringTestController())
                .setControllerAdvice(new GlobalExceptionHandler(environment))
                .addFilters(new RequestIdFilter())
                .build();
    }

    @Controller
    private static class MonitoringTestController {
        @GetMapping(value = "/ok", produces = MediaType.TEXT_PLAIN_VALUE)
        @ResponseBody
        String ok() {
            return "ok";
        }

        @GetMapping("/boom")
        @ResponseBody
        String boom() throws Exception {
            throw new Exception("sensitive /Users/mardo/secret.txt");
        }
    }
}
