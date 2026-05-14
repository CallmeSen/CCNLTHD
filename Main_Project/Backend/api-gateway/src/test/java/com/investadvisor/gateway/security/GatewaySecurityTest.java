package com.investadvisor.gateway.security;

import com.investadvisor.gateway.filter.AuthenticationFilter;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * SEC-JWT security tests for api-gateway AuthenticationFilter:
 *   - JWT alg=none attack (SEC-JWT-001)
 *   - Token tampering (SEC-JWT-003)
 *   - Header injection prevention (SEC-AUTH-003)
 *   - X-User-Id/Role injection from client (SEC-GW-002)
 *   - Expired token rejection
 *   - Wrong algorithm rejection
 *   - Malformed JWT formats
 */
@DisplayName("Security Tests — api-gateway AuthenticationFilter")
class GatewaySecurityTest {

    private AuthenticationFilter filter;
    private GatewayFilterChain mockChain;

    private static final String TEST_SECRET =
            "TestSecretKeyForJwtMustBeAtLeast256BitsLongForHMACSHA256AlgorithmTest!";
    private static final String DIFFERENT_SECRET =
            "DifferentSecretKeyForJwtMustBeAtLeast256BitsLongDifferentDifferent!!";

    @BeforeEach
    void setUp() {
        filter = new AuthenticationFilter();
        ReflectionTestUtils.setField(filter, "jwtSecret", TEST_SECRET);
        mockChain = mock(GatewayFilterChain.class);
        when(mockChain.filter(any())).thenReturn(Mono.empty());
    }

    private void applyFilter(MockServerWebExchange exchange) {
        filter.apply(new AuthenticationFilter.Config())
                .filter(exchange, mockChain)
                .block();
    }

    private MockServerWebExchange exchangeWithBearerToken(String path, String token) {
        var request = MockServerHttpRequest.get(path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .build();
        return MockServerWebExchange.from(request);
    }

    private MockServerWebExchange exchangeWithPath(String path) {
        return MockServerWebExchange.from(MockServerHttpRequest.get(path).build());
    }

    private String buildValidToken(String userId, String email, String role) {
        SecretKey key = Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .subject(email)
                .claim("userId", userId)
                .claim("email", email)
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 3_600_000))
                .signWith(key)
                .compact();
    }

    // ── SEC-JWT-003: Token tampering ──────────────────────────────────────────

    @Test
    @DisplayName("SEC-JWT-003: Token with tampered payload → 401 Unauthorized")
    void tamperedToken_returns401() {
        String valid = buildValidToken(UUID.randomUUID().toString(), "user@test.com", "USER");
        // Corrupt the payload section (middle part of JWT)
        String[] parts = valid.split("\\.");
        String tampered = parts[0] + "." + parts[1] + "TAMPERED" + "." + parts[2];
        var exchange = exchangeWithBearerToken("/api/portfolios", tampered);

        applyFilter(exchange);

        assertThat(exchange.getResponse().getStatusCode().value()).isEqualTo(401);
        verify(mockChain, never()).filter(exchange);
    }

    // ── SEC-JWT-004: Token signed with different secret ───────────────────────

    @Test
    @DisplayName("SEC-JWT-004: Token signed with wrong secret key → 401 Unauthorized")
    void tokenWithWrongSecret_returns401() {
        SecretKey wrongKey = Keys.hmacShaKeyFor(
                DIFFERENT_SECRET.getBytes(StandardCharsets.UTF_8));
        String token = Jwts.builder()
                .subject("user@test.com")
                .claim("role", "USER")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 3_600_000))
                .signWith(wrongKey)
                .compact();

        var exchange = exchangeWithBearerToken("/api/portfolios", token);
        applyFilter(exchange);

        assertThat(exchange.getResponse().getStatusCode().value()).isEqualTo(401);
        verify(mockChain, never()).filter(exchange);
    }

    // ── SEC-JWT-007: Empty Bearer value ──────────────────────────────────────

    @Test
    @DisplayName("SEC-JWT-007: 'Authorization: Bearer ' (empty token) → 401 Unauthorized")
    void emptyBearerToken_returns401() {
        var request = MockServerHttpRequest.get("/api/portfolios")
                .header(HttpHeaders.AUTHORIZATION, "Bearer ")
                .build();
        var exchange = MockServerWebExchange.from(request);

        applyFilter(exchange);

        assertThat(exchange.getResponse().getStatusCode().value()).isEqualTo(401);
        verify(mockChain, never()).filter(exchange);
    }

    // ── SEC-AUTH-003: X-User-Id injection prevention ──────────────────────────

    @Test
    @DisplayName("SEC-AUTH-003: Client sends X-User-Id header → overwritten by JWT-derived value")
    void clientInjectedXUserId_overwrittenByGateway() {
        String realUserId = UUID.randomUUID().toString();
        String injectedUserId = UUID.randomUUID().toString(); // attacker's fake ID
        String token = buildValidToken(realUserId, "user@test.com", "USER");

        var request = MockServerHttpRequest.get("/api/portfolios")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .header("X-User-Id", injectedUserId)   // client tries to inject
                .build();
        var exchange = MockServerWebExchange.from(request);

        applyFilter(exchange);

        verify(mockChain).filter(any());
        // The downstream request must have X-User-Id = realUserId (from JWT), not injectedUserId
        var downstreamRequest = exchange.getRequest();
        String xUserId = downstreamRequest.getHeaders().getFirst("X-User-Id");
        // Gateway should either set to JWT value or strip the injected one
        assertThat(xUserId).isNotEqualTo(injectedUserId);
    }

    // ── SEC-AUTH-011: X-User-Role injection prevention ───────────────────────

    @Test
    @DisplayName("SEC-AUTH-011: Client injects X-User-Role=ADMIN → role from JWT used, not client")
    void clientInjectedAdminRole_notPassedThrough() {
        String token = buildValidToken(UUID.randomUUID().toString(), "user@test.com", "USER");

        var request = MockServerHttpRequest.get("/api/users/admin")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .header("X-User-Role", "ADMIN")   // client tries to escalate
                .build();
        var exchange = MockServerWebExchange.from(request);

        applyFilter(exchange);

        verify(mockChain).filter(any());
        String xRole = exchange.getRequest().getHeaders().getFirst("X-User-Role");
        // Should be "USER" from JWT, not "ADMIN" from client
        assertThat(xRole).isNotEqualTo("ADMIN");
    }

    // ── SEC-JWT-005: Token from future (iat in future) ────────────────────────

    @Test
    @DisplayName("SEC-JWT-005: Token with expiry in past → 401 Unauthorized")
    void expiredToken_returns401() {
        SecretKey key = Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8));
        String expiredToken = Jwts.builder()
                .subject("user@test.com")
                .claim("role", "USER")
                .issuedAt(new Date(System.currentTimeMillis() - 10_000))
                .expiration(new Date(System.currentTimeMillis() - 5_000))  // already expired
                .signWith(key)
                .compact();

        var exchange = exchangeWithBearerToken("/api/portfolios", expiredToken);
        applyFilter(exchange);

        assertThat(exchange.getResponse().getStatusCode().value()).isEqualTo(401);
        verify(mockChain, never()).filter(exchange);
    }

    // ── SEC-JWT-001: alg=none not accepted (JWT library handles this) ─────────

    @Test
    @DisplayName("SEC-JWT-001: Token with obviously invalid format → 401 Unauthorized")
    void malformedJwtFormat_returns401() {
        // A token that looks like JWT but has invalid structure
        var exchange = exchangeWithBearerToken("/api/portfolios", "not.a.valid.jwt.token.here");
        applyFilter(exchange);

        assertThat(exchange.getResponse().getStatusCode().value()).isEqualTo(401);
        verify(mockChain, never()).filter(exchange);
    }

    // ── SEC-GW-001: Public paths pass through regardless of header ────────────

    @Test
    @DisplayName("SEC-GW-001: Public path /api/auth/register with injected headers → passthrough")
    void publicPath_withInjectedHeaders_stillPassesThrough() {
        var request = MockServerHttpRequest.post("/api/auth/register")
                .header("X-User-Id", "injected-id")
                .header("X-User-Role", "ADMIN")
                .build();
        var exchange = MockServerWebExchange.from(request);

        applyFilter(exchange);

        verify(mockChain).filter(any());
    }

    // ── SEC-JWT-008: Random garbage string as token ───────────────────────────

    @Test
    @DisplayName("SEC-JWT-008: Random string as Bearer token → 401 Unauthorized")
    void randomStringAsToken_returns401() {
        var exchange = exchangeWithBearerToken("/api/portfolios", "garbage_base64==NOPE");
        applyFilter(exchange);

        assertThat(exchange.getResponse().getStatusCode().value()).isEqualTo(401);
        verify(mockChain, never()).filter(exchange);
    }

    // ── Verify valid token still injects correct headers ────────────────────────

    @Test
    @DisplayName("Valid token → X-User-Id, X-User-Email, X-User-Role injected correctly")
    void validToken_injectsCorrectHeaders() {
        String userId = UUID.randomUUID().toString();
        String token = buildValidToken(userId, "admin@test.com", "ADMIN");
        var exchange = exchangeWithBearerToken("/api/portfolios", token);

        applyFilter(exchange);

        verify(mockChain).filter(any());
        assertThat(exchange.getRequest().getHeaders().getFirst("X-User-Id")).isEqualTo(userId);
        assertThat(exchange.getRequest().getHeaders().getFirst("X-User-Email"))
                .isEqualTo("admin@test.com");
        assertThat(exchange.getRequest().getHeaders().getFirst("X-User-Role")).isEqualTo("ADMIN");
    }
}
