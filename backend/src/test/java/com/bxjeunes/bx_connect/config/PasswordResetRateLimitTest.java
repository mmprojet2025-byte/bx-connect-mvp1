package com.bxjeunes.bx_connect.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordResetRateLimitTest {

    @Test
    void forgotPasswordIsLimitedAfterFiveRequests() throws Exception {
        RateLimitInterceptor interceptor = new RateLimitInterceptor();

        for (int attempt = 0; attempt < 5; attempt++) {
            assertThat(interceptor.preHandle(request("/api/auth/forgot-password"), response(), new Object()))
                    .isTrue();
        }

        MockHttpServletResponse blockedResponse = response();
        assertThat(interceptor.preHandle(
                request("/api/auth/forgot-password"), blockedResponse, new Object())).isFalse();
        assertThat(blockedResponse.getStatus()).isEqualTo(429);
        assertThat(blockedResponse.getContentAsString()).doesNotContain("token", "password", "email");
    }

    @Test
    void spoofedForwardedForDoesNotChangeTheClientQuota() throws Exception {
        RateLimitInterceptor interceptor = new RateLimitInterceptor();

        for (int attempt = 0; attempt < 5; attempt++) {
            MockHttpServletRequest request = request("/api/auth/forgot-password");
            request.addHeader("X-Forwarded-For", "198.51.100." + attempt);
            assertThat(interceptor.preHandle(request, response(), new Object())).isTrue();
        }

        MockHttpServletRequest request = request("/api/auth/forgot-password");
        request.addHeader("X-Forwarded-For", "203.0.113.250");
        MockHttpServletResponse blockedResponse = response();

        assertThat(interceptor.preHandle(request, blockedResponse, new Object())).isFalse();
        assertThat(blockedResponse.getStatus()).isEqualTo(429);
    }

    private MockHttpServletRequest request(String path) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.setRemoteAddr("192.0.2.10");
        return request;
    }

    private MockHttpServletResponse response() {
        return new MockHttpServletResponse();
    }
}
