package com.investadvisor.user.service;

import com.investadvisor.user.dto.RegisterRequest;
import com.investadvisor.user.dto.UserDto;
import com.investadvisor.user.kafka.UserEventProducer;
import com.investadvisor.user.kafka.events.UserEvent;
import com.investadvisor.user.model.Role;
import com.investadvisor.user.model.User;
import com.investadvisor.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService Unit Tests")
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private UserEventProducer userEventProducer;

    @InjectMocks
    private UserService userService;

    // ── register ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("register: email mới → lưu user, publish event USER_REGISTERED")
    void register_newEmail_savesUserAndPublishesEvent() {
        RegisterRequest req = new RegisterRequest("new@example.com", "secret123", "Nguyễn Văn A", "0901234567");
        User saved = buildUser(UUID.randomUUID(), "new@example.com", "Nguyễn Văn A");

        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenReturn(saved);

        UserDto result = userService.register(req);

        assertThat(result.email()).isEqualTo("new@example.com");
        assertThat(result.fullName()).isEqualTo("Nguyễn Văn A");

        ArgumentCaptor<UserEvent> eventCaptor = ArgumentCaptor.forClass(UserEvent.class);
        verify(userEventProducer).publish(eventCaptor.capture());
        assertThat(eventCaptor.getValue().getEventType()).isEqualTo("USER_REGISTERED");
    }

    @Test
    @DisplayName("register: password phải được BCrypt encode, không lưu plain-text")
    void register_passwordMustBeEncoded() {
        RegisterRequest req = new RegisterRequest("enc@example.com", "plaintext", "User", "0900000000");
        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(passwordEncoder.encode("plaintext")).thenReturn("$2a$10$hashed");
        User saved = buildUser(UUID.randomUUID(), "enc@example.com", "User");
        when(userRepository.save(any())).thenReturn(saved);

        userService.register(req);

        verify(passwordEncoder).encode("plaintext");
        verify(userRepository).save(argThat(u -> "$2a$10$hashed".equals(u.getPassword())));
    }

    @Test
    @DisplayName("register: email trùng → IllegalArgumentException, không gọi save")
    void register_duplicateEmail_throwsIllegalArgumentException() {
        RegisterRequest req = new RegisterRequest("dup@example.com", "pass", "Name", "123");
        when(userRepository.existsByEmail("dup@example.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.register(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email already in use");

        verify(userRepository, never()).save(any());
        verify(userEventProducer, never()).publish(any());
    }

    // ── loadUserByUsername ────────────────────────────────────────────────────

    @Test
    @DisplayName("loadUserByUsername: email tồn tại → trả về UserDetails")
    void loadUserByUsername_existingEmail_returnsUserDetails() {
        User user = buildUser(UUID.randomUUID(), "found@example.com", "Found User");
        when(userRepository.findByEmail("found@example.com")).thenReturn(Optional.of(user));

        var result = userService.loadUserByUsername("found@example.com");

        assertThat(result.getUsername()).isEqualTo("found@example.com");
    }

    @Test
    @DisplayName("loadUserByUsername: email không tồn tại → UsernameNotFoundException")
    void loadUserByUsername_unknownEmail_throwsUsernameNotFoundException() {
        when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.loadUserByUsername("ghost@example.com"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("ghost@example.com");
    }

    // ── findById ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("findById: UUID tồn tại → trả về UserDto")
    void findById_existingId_returnsDto() {
        UUID id = UUID.randomUUID();
        User user = buildUser(id, "user@example.com", "User");
        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        UserDto dto = userService.findById(id);

        assertThat(dto.id()).isEqualTo(id);
        assertThat(dto.email()).isEqualTo("user@example.com");
    }

    @Test
    @DisplayName("findById: UUID không tồn tại → UsernameNotFoundException")
    void findById_unknownId_throwsUsernameNotFoundException() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.findById(id))
                .isInstanceOf(UsernameNotFoundException.class);
    }

    // ── updateProfile ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("updateProfile: cập nhật fullName + phone, publish USER_UPDATED event")
    void updateProfile_validUser_updatesFieldsAndPublishesEvent() {
        UUID id = UUID.randomUUID();
        User existing = buildUser(id, "user@example.com", "Old Name");
        User updated = buildUser(id, "user@example.com", "New Name");
        updated.setPhone("0999999999");

        when(userRepository.findById(id)).thenReturn(Optional.of(existing));
        when(userRepository.save(any())).thenReturn(updated);

        UserDto result = userService.updateProfile(id, "New Name", "0999999999");

        assertThat(result.fullName()).isEqualTo("New Name");
        verify(userEventProducer).publish(argThat(e -> "USER_UPDATED".equals(e.getEventType())));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private User buildUser(UUID id, String email, String fullName) {
        return User.builder()
                .id(id)
                .email(email)
                .password("hashed")
                .fullName(fullName)
                .phone("0900000000")
                .role(Role.USER)
                .enabled(true)
                .build();
    }
}
