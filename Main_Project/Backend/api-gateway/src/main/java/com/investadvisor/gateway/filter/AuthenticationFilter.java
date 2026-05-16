package com.investadvisor.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * JWT Authentication Filter for Spring Cloud Gateway (reactive).
 * Validates Bearer tokens and forwards user identity headers to downstream services.
 */
@Slf4j
@Component
public class AuthenticationFilter extends AbstractGatewayFilterFactory<AuthenticationFilter.Config> {

    /** Endpoints that do not require authentication */
    private static final List<String> OPEN_API_PATHS = List.of(
            "/api/auth/register",
            "/api/auth/login",
            "/actuator"
    );

    @Value("${jwt.secret}")
    private String jwtSecret;

    public AuthenticationFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            if (isOpenPath(exchange)) {
                return chain.filter(exchange);
            }

            String token = resolveToken(exchange);
            if (token == null || token.isBlank()) {
                return onError(exchange, "Missing or invalid Authorization header", HttpStatus.UNAUTHORIZED);
            }

            try {
                Claims claims = parseToken(token);
                // Forward user identity to downstream services as headers
                String userId = claims.get("userId", String.class);
                ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                        .header("X-User-Id", userId != null ? userId : claims.getSubject())
                        .header("X-User-Email", claims.get("email", String.class))
                        .header("X-User-Role", claims.get("role", String.class))
                        .build();
                return chain.filter(exchange.mutate().request(mutatedRequest).build());
            } catch (Exception e) {
                log.warn("JWT validation failed: {}", e.getMessage());
                return onError(exchange, "Invalid or expired token", HttpStatus.UNAUTHORIZED);
            }
        };
    }

    private String resolveToken(ServerWebExchange exchange) {
        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }

        if (isAiSessionEventPath(exchange)) {
            return exchange.getRequest().getQueryParams().getFirst("token");
        }

        return null;
    }

    private Claims parseToken(String token) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private boolean isOpenPath(ServerWebExchange exchange) {
        String path = exchange.getRequest().getURI().getPath();
        return OPEN_API_PATHS.stream().anyMatch(path::startsWith);
    }

    private boolean isAiSessionEventPath(ServerWebExchange exchange) {
        String path = exchange.getRequest().getURI().getPath();
        return (path.startsWith("/api/ai/sessions/")
                || path.startsWith("/ai/sessions/")
                || path.startsWith("/sessions/"))
                && path.endsWith("/events");
    }

    private Mono<Void> onError(ServerWebExchange exchange, String message, HttpStatus status) {
        log.debug("Auth error [{}]: {}", status, message);
        exchange.getResponse().setStatusCode(status);
        return exchange.getResponse().setComplete();
    }

    public static class Config {
        // Reserved for future per-route configuration
    }
}
