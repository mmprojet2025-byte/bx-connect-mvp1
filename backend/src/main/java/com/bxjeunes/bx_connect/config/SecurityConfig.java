package com.bxjeunes.bx_connect.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    @Value("${springdoc.api-docs.enabled:false}")
    private boolean openApiEnabled;

    // ─── Routes publiques ─────────────────────────────────────────────────────
    private static final String[] PUBLIC_URLS = {
        // Auth
        "/api/auth/**",

        // Partenaire — lecture publique (P03, P04)
        "/api/partenaire/activites-ouvertes",
        "/api/partenaire/publics",

        // Annonces globales (public)
        "/api/annonces/globales",

        // Paiements — callbacks PayPal
        "/api/paiements/confirmer",
        "/api/paiements/annuler",

        // Stripe — config publique + webhook
        "/api/stripe/config",
        "/api/stripe/webhook",

        // Swagger / OpenAPI (autorise uniquement en dev/local via springdoc.api-docs.enabled=true)
    };

    private static final String[] SWAGGER_URLS = {
        "/swagger-ui/**",
        "/swagger-ui.html",
        "/v3/api-docs/**",
    };

    private static final String[] PUBLIC_UTILITY_URLS = {

        // Monitoring public minimal
        "/actuator/health",
        "/actuator/info",

        // Upload — accès aux fichiers statiques
        "/uploads/**"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> {
                auth.requestMatchers(HttpMethod.GET,
                        "/api/activites",
                        "/api/activites/*",
                        "/api/activites/recherche",
                        "/api/activites/filtrer",
                        "/api/activites/options-filtres",
                        "/api/projets",
                        "/api/projets/*",
                        "/api/projets/*/commentaires"
                    ).permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/groupes", "/api/groupes/*").permitAll()
                    .requestMatchers(PUBLIC_URLS).permitAll()
                    .requestMatchers(PUBLIC_UTILITY_URLS).permitAll();

                if (openApiEnabled) {
                    auth.requestMatchers(SWAGGER_URLS).permitAll();
                }

                auth.anyRequest().authenticated();
            })
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // ✅ Accepte tous les ports locaux (5173, 5174, 8081...)
        config.setAllowedOriginPatterns(List.of(
            "http://localhost:*",
            "http://127.0.0.1:*"
        ));

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
