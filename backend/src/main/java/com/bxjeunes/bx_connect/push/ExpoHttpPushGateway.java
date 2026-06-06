package com.bxjeunes.bx_connect.push;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class ExpoHttpPushGateway implements ExpoPushGateway {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String expoPushUrl;
    private final String accessToken;

    public ExpoHttpPushGateway(ObjectMapper objectMapper,
                               @Value("${bx.push.expo-url:https://exp.host/--/api/v2/push/send}")
                               String expoPushUrl,
                               @Value("${bx.push.access-token:}") String accessToken) {
        this.objectMapper = objectMapper;
        this.expoPushUrl = expoPushUrl;
        this.accessToken = accessToken;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    @Override
    public ExpoPushResult send(String expoPushToken,
                               String title,
                               String body,
                               String type,
                               String actionUrl) {
        try {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("type", type);
            if (actionUrl != null && !actionUrl.isBlank()) {
                data.put("actionUrl", actionUrl);
            }

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("to", expoPushToken);
            payload.put("title", title);
            payload.put("body", body);
            payload.put("sound", "default");
            payload.put("data", data);

            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(expoPushUrl))
                    .timeout(Duration.ofSeconds(10))
                    .header("Accept", "application/json")
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)));

            if (accessToken != null && !accessToken.isBlank()) {
                requestBuilder.header("Authorization", "Bearer " + accessToken);
            }

            HttpResponse<String> response = httpClient.send(
                    requestBuilder.build(),
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return ExpoPushResult.failure(
                        "HTTP_" + response.statusCode(),
                        "Expo Push a retourne le statut HTTP " + response.statusCode()
                );
            }

            JsonNode ticket = objectMapper.readTree(response.body()).path("data");
            if ("ok".equalsIgnoreCase(ticket.path("status").asText())) {
                return ExpoPushResult.delivered();
            }

            String errorCode = ticket.path("details").path("error").asText("EXPO_ERROR");
            String errorMessage = ticket.path("message").asText("Expo Push a refuse la notification.");
            return ExpoPushResult.failure(errorCode, errorMessage);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return ExpoPushResult.failure("INTERRUPTED", "Envoi push interrompu.");
        } catch (Exception exception) {
            return ExpoPushResult.failure("EXPO_UNAVAILABLE", exception.getMessage());
        }
    }
}
