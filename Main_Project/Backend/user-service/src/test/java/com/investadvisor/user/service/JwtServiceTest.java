package com.investadvisor.user.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("JwtService Unit Tests")
class JwtServiceTest {

    private JwtService jwtService;

    private static final String TEST_SECRET =
            "TestSecretKeyForJwtMustBeAtLeast256BitsLongForHMACSHA256AlgorithmTest!";
    private static final long EXPIRATION_MS = 86_400_000L; // 24h

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret", TEST_SECRET);
        ReflectionTestUtils.setField(jwtService, "expirationMs", EXPIRATION_MS);
    }

    @Test
    @DisplayName("generateToken: phải trả về token không rỗng với subject = email")
    void generateToken_shouldReturnNonBlankTokenWithCorrectSubject() {
        UserDetails user = mockUser("user@example.com");

        String token = jwtService.generateToken(user, Map.of("role", "USER"));

        assertThat(token).isNotBlank();
        assertThat(jwtService.extractUsername(token)).isEqualTo("user@example.com");
    }

    @Test
    @DisplayName("generateToken: phải nhúng đủ custom claims (role, email, userId)")
    void generateToken_shouldEmbedExtraClaims() {
        UserDetails user = mockUser("investor@example.com");
        Map<String, Object> claims = Map.of(
                "role", "USER",
                "email", "investor@example.com",
                "userId", "123e4567-e89b-12d3-a456-426614174000"
        );

        String token = jwtService.generateToken(user, claims);

        assertThat(jwtService.extractUsername(token)).isEqualTo("investor@example.com");
        assertThat(jwtService.isTokenValid(token, user)).isTrue();
    }

    @Test
    @DisplayName("isTokenValid: token hợp lệ + đúng user → true")
    void isTokenValid_validTokenMatchingUser_returnsTrue() {
        UserDetails user = mockUser("valid@example.com");
        String token = jwtService.generateToken(user, Map.of());

        assertThat(jwtService.isTokenValid(token, user)).isTrue();
    }

    @Test
    @DisplayName("isTokenValid: token đã hết hạn → false")
    void isTokenValid_expiredToken_returnsFalse() {
        JwtService shortLived = new JwtService();
        ReflectionTestUtils.setField(shortLived, "secret", TEST_SECRET);
        ReflectionTestUtils.setField(shortLived, "expirationMs", -1000L);

        UserDetails user = mockUser("expired@example.com");
        String token = shortLived.generateToken(user, Map.of());

        assertThat(shortLived.isTokenValid(token, user)).isFalse();
    }

    @Test
    @DisplayName("isTokenValid: token bị tamper (sai signature) → false")
    void isTokenValid_tamperedToken_returnsFalse() {
        UserDetails user = mockUser("user@example.com");
        String token = jwtService.generateToken(user, Map.of());
        String tampered = token.substring(0, token.length() - 6) + "TAMPER";

        assertThat(jwtService.isTokenValid(tampered, user)).isFalse();
    }

    @Test
    @DisplayName("isTokenValid: token của user A không hợp lệ cho user B → false")
    void isTokenValid_tokenForDifferentUser_returnsFalse() {
        UserDetails userA = mockUser("userA@example.com");
        UserDetails userB = mockUser("userB@example.com");

        String tokenForA = jwtService.generateToken(userA, Map.of());

        assertThat(jwtService.isTokenValid(tokenForA, userB)).isFalse();
    }

    @Test
    @DisplayName("isTokenValid: chuỗi token rỗng → false (không throw exception)")
    void isTokenValid_emptyToken_returnsFalse() {
        UserDetails user = mockUser("user@example.com");

        assertThat(jwtService.isTokenValid("", user)).isFalse();
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private UserDetails mockUser(String email) {
        UserDetails u = mock(UserDetails.class);
        when(u.getUsername()).thenReturn(email);
        return u;
    }
}
