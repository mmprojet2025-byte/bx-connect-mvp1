package com.bxjeunes.bx_connect.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final Map<String, Deque<Long>> attempts = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {
        RateLimitRule rule = ruleFor(request);
        if (rule == null) {
            return true;
        }

        String key = clientIp(request) + ":" + request.getMethod() + ":" + request.getRequestURI();
        long now = System.currentTimeMillis();
        Deque<Long> timestamps = attempts.computeIfAbsent(key, ignored -> new ArrayDeque<>());

        synchronized (timestamps) {
            removeExpired(timestamps, now, rule.window().toMillis());
            if (timestamps.size() >= rule.maxAttempts()) {
                writeTooManyRequests(response);
                return false;
            }
            timestamps.addLast(now);
        }

        cleanup(now);
        return true;
    }

    private RateLimitRule ruleFor(HttpServletRequest request) {
        String method = request.getMethod();
        String path = request.getRequestURI();

        if (HttpMethod.POST.matches(method) && "/api/auth/login".equals(path)) {
            return new RateLimitRule(10, Duration.ofMinutes(1));
        }
        if (HttpMethod.POST.matches(method) && "/api/auth/register".equals(path)) {
            return new RateLimitRule(5, Duration.ofMinutes(10));
        }
        if (HttpMethod.POST.matches(method) && "/api/auth/forgot-password".equals(path)) {
            return new RateLimitRule(5, Duration.ofMinutes(15));
        }
        if (HttpMethod.POST.matches(method) && "/api/auth/reset-password".equals(path)) {
            return new RateLimitRule(10, Duration.ofMinutes(15));
        }
        if (HttpMethod.POST.matches(method) && "/api/upload".equals(path)) {
            return new RateLimitRule(20, Duration.ofMinutes(10));
        }
        if (HttpMethod.POST.matches(method) && "/api/stripe/checkout".equals(path)) {
            return new RateLimitRule(10, Duration.ofMinutes(5));
        }
        if (HttpMethod.POST.matches(method) && "/api/paiements/creer".equals(path)) {
            return new RateLimitRule(10, Duration.ofMinutes(5));
        }

        return null;
    }

    private void removeExpired(Deque<Long> timestamps, long now, long windowMs) {
        while (!timestamps.isEmpty() && now - timestamps.peekFirst() > windowMs) {
            timestamps.removeFirst();
        }
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void writeTooManyRequests(HttpServletResponse response) throws IOException {
        response.setStatus(429);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\":\"Too Many Requests\",\"message\":\"Trop de tentatives. Veuillez patienter.\"}");
    }

    private void cleanup(long now) {
        if (attempts.size() < 1000) {
            return;
        }
        Iterator<Map.Entry<String, Deque<Long>>> iterator = attempts.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, Deque<Long>> entry = iterator.next();
            Deque<Long> timestamps = entry.getValue();
            synchronized (timestamps) {
                removeExpired(timestamps, now, Duration.ofMinutes(10).toMillis());
                if (timestamps.isEmpty()) {
                    attempts.remove(entry.getKey(), timestamps);
                }
            }
        }
    }

    private record RateLimitRule(int maxAttempts, Duration window) {}
}
