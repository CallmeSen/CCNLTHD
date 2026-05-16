package com.investadvisor.gateway.filter;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
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

@DisplayName("AuthenticationFilter Unit Tests")
class AuthenticationFilterTest {

    private AuthenticationFilter filter;
    private GatewayFilterChain mockChain;

    private static final String TEST_SECRET =
            "TestSecretKeyForJwtMustBeAtLeast256BitsLongForHMACSHA256AlgorithmTest!";

    @BeforeEach
    void setUp() {
        filter = new AuthenticationFilter();
        ReflectionTestUtils.setField(filter, "jwtSecret", TEST_SECRET);
        mockChain = mock(GatewayFilterChain.class);
        when(mockChain.filter(any())).thenReturn(Mono.empty());
    }

    // ── Public paths (bypass filter) ──────────────────────────────────────────

    @Test
    @DisplayName("POST /api/auth/register: public path → bypass filter, chain.filter() được gọi")
    void publicPath_register_bypassesFilter() {
        var exchange = exchangeWithPath("/api/auth/register");

        applyFilter(exchange);

        verify(mockChain).filter(exchange);
        assertThat(exchange.getResponse().getStatusCode()).isNull();
    }

    @Test
    @DisplayName("POST /api/auth/login: public path → bypass filter")
    void publicPath_login_bypassesFilter() {
        var exchange = exchangeWithPath("/api/auth/login");

        applyFilter(exchange);

        verify(mockChain).filter(exchange);
    }

    @Test
    @DisplayName("GET /actuator/health: public path → bypass filter")
    void publicPath_actuator_bypassesFilter() {
        var exchange = exchangeWithPath("/actuator/health");

        applyFilter(exchange);

        verify(mockChain).filter(exchange);
    }

    // ── Missing / malformed Authorization header ──────────────────────────────

    @Test
    @DisplayName("Protected path, không có Authorization header → 401")
    void protectedPath_noHeader_returns401() {
        var exchange = exchangeWithPath("/api/portfolios");

        applyFilter(exchange);

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(mockChain, never()).filter(any());
    }

    @Test
    @DisplayName("Authorization header không có 'Bearer ' prefix → 401")
    void protectedPath_missingBearerPrefix_returns401() {
        var exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/portfolios")
                        .header(HttpHeaders.AUTHORIZATION, "Basic dXNlcjpwYXNz")
                        .build());

        applyFilter(exchange);

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ── Token validation ──────────────────────────────────────────────────────

    @Test
    @DisplayName("Token hợp lệ → chain.filter() với X-User-Id header được inject")
    void validToken_chainsRequestWithUserIdHeader() {
        UUID userId = UUID.randomUUID();
        String token = buildToken(userId.toString(), "user@test.com", "USER", 86400_000);

        var request = MockServerHttpRequest.get("/api/portfolios")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .build();
        var exchange = MockServerWebExchange.from(request);

        applyFilter(exchange);

        verify(mockChain).filter(argThat(ex ->
                ex.getRequest().getHeaders().containsKey("X-User-Id") &&
                ex.getRequest().getHeaders().containsKey("X-User-Email") &&
                ex.getRequest().getHeaders().containsKey("X-User-Role")
        ));
    }

    @Test
    @DisplayName("Token hợp lệ → X-User-Id header chứa đúng userId từ claims")
    void validToken_injectsCorrectUserId() {
        UUID userId = UUID.fromString("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
        String token = buildToken(userId.toString(), "user@test.com", "USER", 86400_000);

        var request = MockServerHttpRequest.get("/api/users/profile")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .build();
        var exchange = MockServerWebExchange.from(request);

        applyFilter(exchange);

        verify(mockChain).filter(argThat(ex -> {
            String injectedUserId = ex.getRequest().getHeaders().getFirst("X-User-Id");
            return userId.toString().equals(injectedUserId);
        }));
    }

    @Test
    @DisplayName("AI session SSE accepts token query param because EventSource cannot send Authorization")
    void aiSessionEvent_acceptsTokenQueryParam() {
        UUID userId = UUID.fromString("bbbbbbbb-cccc-dddd-eeee-ffffffffffff");
        String token = buildToken(userId.toString(), "user@test.com", "USER", 86400_000);

        var request = MockServerHttpRequest
                .get("/api/ai/sessions/session-1/events?token=" + token)
                .build();
        var exchange = MockServerWebExchange.from(request);

        applyFilter(exchange);

        verify(mockChain).filter(argThat(ex -> {
            String injectedUserId = ex.getRequest().getHeaders().getFirst("X-User-Id");
            return userId.toString().equals(injectedUserId);
        }));
    }

    @Test
    @DisplayName("Token hết hạn → 401 Unauthorized")
    void expiredToken_returns401() {
        String token = buildToken(UUID.randomUUID().toString(), "user@test.com", "USER", -1000);

        var exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/portfolios")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .build());

        applyFilter(exchange);

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(mockChain, never()).filter(any());
    }

    @Test
    @DisplayName("Token bị tamper (sai signature) → 401 Unauthorized")
    void tamperedToken_returns401() {
        String token = buildToken(UUID.randomUUID().toString(), "user@test.com", "USER", 86400_000);
        String tampered = token.substring(0, token.length() - 6) + "TAMPER";

        var exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/portfolios")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tampered)
                        .build());

        applyFilter(exchange);

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Token ký bằng secret key khác → 401 Unauthorized")
    void tokenSignedWithWrongKey_returns401() {
        String wrongSecret = "WrongSecretKeyForJwtMustBeAtLeast256BitsLongXXXXXXXXXXXXXXXXXXXXXX!";
        SecretKey wrongKey = Keys.hmacShaKeyFor(wrongSecret.getBytes(StandardCharsets.UTF_8));
        String token = Jwts.builder()
                .subject("user@test.com")
                .claims(Map.of("userId", UUID.randomUUID().toString(), "role", "USER"))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 86400_000))
                .signWith(wrongKey)
                .compact();

        var exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/portfolios")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .build());

        applyFilter(exchange);

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ── Cross-user header injection prevention ────────────────────────────────

    @Test
    @DisplayName("Client cố tình thêm X-User-Id header → gateway override bằng giá trị từ token")
    void clientInjectsXUserIdHeader_gatewayOverridesWithTokenValue() {
        UUID realUserId = UUID.fromString("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
        String token = buildToken(realUserId.toString(), "user@test.com", "USER", 86400_000);

        var request = MockServerHttpRequest.get("/api/portfolios")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .header("X-User-Id", "fake-user-id-injection-attempt")
                .build();
        var exchange = MockServerWebExchange.from(request);

        applyFilter(exchange);

        verify(mockChain).filter(argThat(ex -> {
            String injectedId = ex.getRequest().getHeaders().getFirst("X-User-Id");
            return realUserId.toString().equals(injectedId);
        }));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private MockServerWebExchange exchangeWithPath(String path) {
        return MockServerWebExchange.from(MockServerHttpRequest.get(path).build());
    }

    private String buildToken(String userId, String email, String role, long expirationMs) {
        SecretKey key = Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .subject(email)
                .claims(Map.of("userId", userId, "email", email, "role", role))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    private void applyFilter(MockServerWebExchange exchange) {
        var gatewayFilter = filter.apply(new AuthenticationFilter.Config());
        StepVerifier.create(gatewayFilter.filter(exchange, mockChain))
                .verifyComplete();
    }
}
