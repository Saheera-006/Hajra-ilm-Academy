
package com.hajara.academy.config;

import com.hajara.academy.security.RateLimitFilter;
import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            @Value("${app.rate-limit.per-minute:120}") int generalLimit,
            @Value("${app.rate-limit.auth-per-minute:10}") int authLimit,
            @Value("${app.security.cross-site-cookies:false}") boolean crossSiteCookies)
            throws Exception {

        CsrfTokenRequestAttributeHandler csrfHandler =
                new CsrfTokenRequestAttributeHandler();

        csrfHandler.setCsrfRequestAttributeName(null);

        // CSRF token cookie for the React frontend.
        CookieCsrfTokenRepository csrfRepository =
                CookieCsrfTokenRepository.withHttpOnlyFalse();

        csrfRepository.setCookieCustomizer(cookie -> {
            cookie.path("/");

            if (crossSiteCookies) {
                cookie.sameSite("None");
                cookie.secure(true);
            } else {
                cookie.sameSite("Lax");
            }
        });

        http
            .cors(Customizer.withDefaults())

            .csrf(csrf -> csrf
                .csrfTokenRepository(csrfRepository)
                .csrfTokenRequestHandler(csrfHandler))

            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable)

            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp.policyDirectives(
                    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"))
                .frameOptions(frame -> frame.deny())
                .referrerPolicy(ref -> ref.policy(
                    ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000))
                .addHeaderWriter(new StaticHeadersWriter(
                    "Permissions-Policy",
                    "camera=(), microphone=(), geolocation=(), payment=()")))

            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/error").permitAll()

                .requestMatchers(HttpMethod.OPTIONS, "/api/**")
                    .permitAll()

                .requestMatchers(
                    HttpMethod.GET,
                    "/api/public/**",
                    "/api/portal/courses",
                    "/api/portal/me",
                    "/api/portal/csrf",
                    "/api/portal/site-content",
                    "/api/portal/batches/current"
                ).permitAll()

                .requestMatchers("/api/portal/auth/**")
                    .permitAll()

                .requestMatchers("/api/portal/admin/**")
                    .hasRole("ADMIN")

                .requestMatchers(
                    "/api/portal/my-profile",
                    "/api/portal/my-profile/**",
                    "/api/portal/announcements",
                    "/api/portal/my-notifications"
                ).hasRole("STUDENT")

                .requestMatchers("/api/portal/**")
                    .authenticated()

                .anyRequest().denyAll())

            .sessionManagement(sm -> sm
                .sessionFixation(fix -> fix.changeSessionId()))

            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(
                    new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))

            .addFilterBefore(
                new RateLimitFilter(generalLimit, authLimit),
                UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins}") String origins) {

        List<String> allowed = Arrays.stream(origins.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();

        if (allowed.isEmpty() || allowed.contains("*")) {
            throw new IllegalStateException(
                "CORS_ALLOWED_ORIGINS must list explicit origins.");
        }

        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(allowed);
        config.setAllowedMethods(
            List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(
            List.of("Content-Type", "X-XSRF-TOKEN"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/api/**", config);

        return source;
    }
}
