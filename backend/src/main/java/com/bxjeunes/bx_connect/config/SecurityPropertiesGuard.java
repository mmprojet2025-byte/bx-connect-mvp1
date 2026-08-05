package com.bxjeunes.bx_connect.config;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.Environment;
import org.springframework.core.env.PropertySource;
import org.springframework.context.EnvironmentAware;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class SecurityPropertiesGuard implements BeanFactoryPostProcessor, EnvironmentAware {

    private static final Pattern ENV_PLACEHOLDER = Pattern.compile("^\\$\\{([^}:]+)(?::([^}]*))?}$");

    private Environment environment;

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
        validate();
    }

    void validate() {
        if (isProductionFlagEnabled() && !hasProfile("prod")) {
            throw new IllegalStateException(
                    "BX_PRODUCTION=true exige SPRING_PROFILES_ACTIVE=prod.");
        }

        if (isRelaxedProfile()) {
            return;
        }

        requireStrongSecret("jwt.secret", 32);
        requireRealSecret("stripe.secret-key");
        requireRealSecret("stripe.webhook-secret");
        requireRealSecret("paypal.client-id");
        requireRealSecret("paypal.client-secret");
        requireProductionDatasource();
        requireProductionCors();
        requireProductionUrl("frontend.url");
        requireProductionUrl("stripe.success-url");
        requireProductionUrl("stripe.cancel-url");
        requireProductionUrl("paypal.return-url");
        requireProductionUrl("paypal.cancel-url");
        requireProductionPasswordReset();
    }

    private boolean isRelaxedProfile() {
        String[] profiles = activeOrDefaultProfiles();
        return !isProductionFlagEnabled()
                && Arrays.stream(profiles).noneMatch("prod"::equals)
                && Arrays.stream(profiles).allMatch(this::isRelaxedProfileName);
    }

    private boolean isRelaxedProfileName(String profile) {
        return profile.equals("dev") || profile.equals("local") || profile.equals("test");
    }

    private void requireStrongSecret(String propertyName, int minBytes) {
        String value = requireRealSecret(propertyName);
        if (value.getBytes(StandardCharsets.UTF_8).length < minBytes) {
            throw new IllegalStateException(propertyName + " doit contenir au moins " + minBytes + " octets hors dev.");
        }
    }

    private String requireRealSecret(String propertyName) {
        String value = resolveProperty(propertyName);
        if (value == null || value.isBlank() || value.contains("${") || isKnownDemoValue(value)) {
            throw new IllegalStateException(propertyName + " doit etre fourni via variable d'environnement hors dev.");
        }
        return value;
    }

    private String resolveProperty(String propertyName) {
        String rawValue = rawProperty(propertyName);
        if (rawValue != null) {
            Matcher matcher = ENV_PLACEHOLDER.matcher(rawValue.trim());
            if (matcher.matches()) {
                String envName = matcher.group(1);
                String defaultValue = matcher.group(2);
                String envValue = environment.getProperty(envName);
                return envValue != null ? envValue : defaultValue;
            }
        }
        try {
            return environment.getProperty(propertyName);
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private String rawProperty(String propertyName) {
        if (environment instanceof ConfigurableEnvironment configurableEnvironment) {
            for (PropertySource<?> propertySource : configurableEnvironment.getPropertySources()) {
                Object value = propertySource.getProperty(propertyName);
                if (value != null) {
                    return value.toString();
                }
            }
        }
        return null;
    }

    private boolean isKnownDemoValue(String value) {
        String normalized = value.toLowerCase();
        return normalized.equals("demo")
                || normalized.contains("change_me")
                || normalized.contains("local_secret")
                || normalized.endsWith("_demo");
    }

    private void requireProductionDatasource() {
        String url = requireRealSecret("spring.datasource.url");
        requireRealSecret("spring.datasource.username");
        requireRealSecret("spring.datasource.password");

        String normalized = url.toLowerCase();
        if (normalized.contains("localhost")
                || normalized.contains("127.0.0.1")
                || normalized.contains("createdatabaseifnotexist=true")
                || normalized.contains("usessl=false")
                || normalized.contains("allowpublickeyretrieval=true")) {
            throw new IllegalStateException(
                    "spring.datasource.url contient une configuration locale ou dangereuse hors dev.");
        }
    }

    private void requireProductionCors() {
        String rawOrigins = requireRealSecret("app.cors.allowed-origins");
        String[] origins = Arrays.stream(rawOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toArray(String[]::new);

        if (origins.length == 0) {
            throw new IllegalStateException("app.cors.allowed-origins doit contenir au moins une origine hors dev.");
        }

        for (String origin : origins) {
            String normalized = origin.toLowerCase();
            if (origin.contains("*")
                    || normalized.contains("localhost")
                    || normalized.contains("127.0.0.1")
                    || !normalized.startsWith("https://")) {
                throw new IllegalStateException(
                        "app.cors.allowed-origins contient une origine interdite hors dev : " + origin);
            }
        }
    }

    private void requireProductionUrl(String propertyName) {
        String value = requireRealSecret(propertyName);
        String normalized = value.toLowerCase();
        if (!normalized.startsWith("https://")
                || normalized.contains("localhost")
                || normalized.contains("127.0.0.1")) {
            throw new IllegalStateException(propertyName + " doit etre une URL HTTPS non locale hors dev.");
        }
    }

    private void requireProductionPasswordReset() {
        if (!Boolean.parseBoolean(environment.getProperty("app.password-reset.email-enabled", "false"))) {
            throw new IllegalStateException(
                    "app.password-reset.email-enabled doit etre true hors dev.");
        }
        requireProductionUrl("app.password-reset.frontend-url");
        requireRealSecret("app.password-reset.from-address");
        requireRealSecret("spring.mail.host");
        requireRealSecret("spring.mail.username");
        requireRealSecret("spring.mail.password");
    }

    private boolean isProductionFlagEnabled() {
        return Boolean.parseBoolean(environment.getProperty("bx.production", "false"));
    }

    private boolean hasProfile(String expectedProfile) {
        return Arrays.stream(activeOrDefaultProfiles()).anyMatch(expectedProfile::equals);
    }

    private String[] activeOrDefaultProfiles() {
        return environment.getActiveProfiles().length > 0
                ? environment.getActiveProfiles()
                : environment.getDefaultProfiles();
    }
}
