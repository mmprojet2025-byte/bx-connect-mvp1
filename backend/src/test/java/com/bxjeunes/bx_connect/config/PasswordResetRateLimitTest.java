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

    private MockHttpServletRequest request(String path) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.setRemoteAddr("192.0.2.10");
        return request;
    }

    private MockHttpServletResponse response() {
        return new MockHttpServletResponse();
    }
}
