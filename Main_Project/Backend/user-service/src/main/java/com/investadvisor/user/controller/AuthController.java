package com.investadvisor.user.controller;

import com.investadvisor.user.dto.AuthResponse;
import com.investadvisor.user.dto.LoginRequest;
import com.investadvisor.user.dto.RegisterRequest;
import com.investadvisor.user.dto.UserDto;
import com.investadvisor.user.model.User;
import com.investadvisor.user.service.JwtService;
import com.investadvisor.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Value("${jwt.expiration-ms:86400000}")
    private long jwtExpirationMs;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        UserDto user = userService.register(request);
        // Load full UserDetails for token generation
        User principal = (User) userService.loadUserByUsername(user.email());
        String token = jwtService.generateToken(principal, Map.of(
                "role", user.role(),
                "email", user.email(),
                "userId", user.id().toString()
        ));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(AuthResponse.of(token, jwtExpirationMs, user));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );
        User principal = (User) userService.loadUserByUsername(request.email());
        String token = jwtService.generateToken(principal, Map.of(
                "role", principal.getRole().name(),
                "email", principal.getEmail(),
                "userId", principal.getId().toString()
        ));
        UserDto dto = UserDto.from(principal);
        return ResponseEntity.ok(AuthResponse.of(token, jwtExpirationMs, dto));
    }
}
