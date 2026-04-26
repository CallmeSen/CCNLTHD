package com.investadvisor.user.controller;

import com.investadvisor.user.dto.UserDto;
import com.investadvisor.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /** Any authenticated user can fetch their own profile. */
    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    /** Update own profile. Only ADMIN can update other users (enforced at service layer). */
    @PutMapping("/{id}")
    public ResponseEntity<UserDto> updateProfile(
            @PathVariable UUID id,
            @RequestParam String fullName,
            @RequestParam(required = false) String phone) {
        return ResponseEntity.ok(userService.updateProfile(id, fullName, phone));
    }

    /** Admin-only endpoint. */
    @GetMapping("/email/{email}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDto> getByEmail(@PathVariable String email) {
        return ResponseEntity.ok(userService.findByEmail(email));
    }
}
