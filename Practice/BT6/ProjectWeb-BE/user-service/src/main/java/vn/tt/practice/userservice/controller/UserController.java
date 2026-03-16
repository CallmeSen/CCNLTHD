package vn.tt.practice.userservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import vn.tt.practice.userservice.dto.UserDTO;
import vn.tt.practice.userservice.model.User;
import vn.tt.practice.userservice.repository.UserRepo;
import vn.tt.practice.userservice.service.UserService;
import vn.tt.practice.userservice.util.JWTUtil;


import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Controller
@RequiredArgsConstructor
@RestController
@RequestMapping("/v1/api/user")
//@CrossOrigin(origins = "*")
@Slf4j
public class UserController {

    private final UserService userService;
    private final UserRepo userRepo;
    private final StringRedisTemplate redisTemplate;

    @GetMapping("/{id}/email")
    public ResponseEntity<String> getEmail(@PathVariable String id) {
        Optional<User> user = userRepo.findById(id);
        return user.map(u -> ResponseEntity.ok(u.getEmail()))
                .orElse(ResponseEntity.notFound().build());
    }


    @GetMapping("/{id}")
    public ResponseEntity<Optional<User>> getUser(@PathVariable String id) {
        return ResponseEntity.ok(userRepo.findById(id));
    }

    @GetMapping
    public ResponseEntity<List<User>> getUsers() {
        return ResponseEntity.ok(userRepo.findAll());
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody UserDTO userDTO) {
        Map<String, Object> response = new HashMap<>();
//        response.put("message", "Registered Successfully");
        try {
            userDTO.setExpirationDate(86400);
            response.put("user", userService.register(userDTO));
            return ResponseEntity.ok().body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody UserDTO userDTO) {
        try {
            Map<String, Object> response = userService.login(userDTO);
            return ResponseEntity.ok(response);
        } catch (BadCredentialsException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password"));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Login failed"));
        }
    }

    @GetMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.badRequest().body("Missing or invalid Authorization header");
            }

            String token = authHeader.replace("Bearer ", "").trim();

            Boolean exists = redisTemplate.hasKey(token);
            System.out.println("Token received: " + token);
            System.out.println("Token exists in Redis: " + exists);

            if (!Boolean.TRUE.equals(exists)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token invalid or already logged out");
            }

            redisTemplate.delete(token);
            return ResponseEntity.ok("Logout successful");

        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Logout failed");
        }
    }

}
