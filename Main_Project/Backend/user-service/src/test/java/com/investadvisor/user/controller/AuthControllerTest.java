package com.investadvisor.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.investadvisor.user.dto.LoginRequest;
import com.investadvisor.user.dto.RegisterRequest;
import com.investadvisor.user.dto.UserDto;
import com.investadvisor.user.model.Role;
import com.investadvisor.user.model.User;
import java.time.LocalDateTime;
import com.investadvisor.user.service.JwtService;
import com.investadvisor.user.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {AuthController.class, GlobalExceptionHandler.class})
@Import(TestWebSecurityConfig.class)
@DisplayName("AuthController Integration Tests (MockMvc)")
class AuthControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean UserService userService;
    @MockBean JwtService jwtService;
    @MockBean AuthenticationManager authenticationManager;

    // ── POST /api/auth/register ───────────────────────────────────────────────

    @Test
    @DisplayName("POST /register: dữ liệu hợp lệ → 201 + token")
    void register_validRequest_returns201WithToken() throws Exception {
        UUID userId = UUID.randomUUID();
        RegisterRequest req = new RegisterRequest("user@test.com", "pass123!", "Lê Văn B", "0901111111");
        UserDto dto = buildUserDto(userId, "user@test.com", "Lê Văn B");
        User principal = buildUser(userId, "user@test.com", "Lê Văn B");

        when(userService.register(any())).thenReturn(dto);
        when(userService.loadUserByUsername("user@test.com")).thenReturn(principal);
        when(jwtService.generateToken(any(), any(Map.class))).thenReturn("mocked.jwt.token");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").value("mocked.jwt.token"))
                .andExpect(jsonPath("$.expiresIn").exists());
    }

    @Test
    @DisplayName("POST /register: email đã tồn tại → 409 Conflict")
    void register_duplicateEmail_returns409() throws Exception {
        RegisterRequest req = new RegisterRequest("dup@test.com", "pass1234", "Name", "0900000000");
        when(userService.register(any()))
                .thenThrow(new IllegalArgumentException("Email already in use: dup@test.com"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Email already in use: dup@test.com"));
    }

    @Test
    @DisplayName("POST /register: request body thiếu email → 400 Bad Request")
    void register_missingEmail_returns400() throws Exception {
        String badBody = """
                {"password": "pass123!", "fullName": "Name", "phone": "0900000000"}
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /register: request body rỗng → 400 Bad Request")
    void register_emptyBody_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    // ── POST /api/auth/login ──────────────────────────────────────────────────

    @Test
    @DisplayName("POST /login: đúng credentials → 200 + token")
    void login_validCredentials_returns200WithToken() throws Exception {
        UUID userId = UUID.randomUUID();
        LoginRequest req = new LoginRequest("user@test.com", "pass123!");
        User principal = buildUser(userId, "user@test.com", "Test User");

        when(authenticationManager.authenticate(any()))
                .thenReturn(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        when(userService.loadUserByUsername("user@test.com")).thenReturn(principal);
        when(jwtService.generateToken(any(), any(Map.class))).thenReturn("valid.jwt.token");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("valid.jwt.token"))
                .andExpect(jsonPath("$.user.email").value("user@test.com"));
    }

    @Test
    @DisplayName("POST /login: sai password → 401 Unauthorized")
    void login_wrongPassword_returns401() throws Exception {
        LoginRequest req = new LoginRequest("user@test.com", "wrongpass");
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /login: email không tồn tại → 401 Unauthorized")
    void login_unknownEmail_returns401() throws Exception {
        LoginRequest req = new LoginRequest("nobody@test.com", "pass");
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("User not found"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private UserDto buildUserDto(UUID id, String email, String fullName) {
        return new UserDto(id, email, fullName, "0900000000", "USER", true, LocalDateTime.now());
    }

    private User buildUser(UUID id, String email, String fullName) {
        return User.builder()
                .id(id).email(email).password("hashed")
                .fullName(fullName).role(Role.USER).enabled(true).build();
    }
}
