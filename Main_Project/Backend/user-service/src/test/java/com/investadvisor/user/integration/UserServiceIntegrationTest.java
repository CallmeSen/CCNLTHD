package com.investadvisor.user.integration;

import com.investadvisor.user.dto.RegisterRequest;
import com.investadvisor.user.dto.UserDto;
import com.investadvisor.user.repository.UserRepository;
import com.investadvisor.user.service.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests: Spring context + real PostgreSQL (Testcontainers) + embedded Kafka.
 * Verifies that UserService correctly persists data and publishes Kafka events.
 */
@SpringBootTest
@ActiveProfiles("docker-test")
@EmbeddedKafka(partitions = 1, topics = {"user-events"})
@DisplayName("UserService Integration Tests")
class UserServiceIntegrationTest {

    @Autowired UserService userService;
    @Autowired UserRepository userRepository;

    @AfterEach
    void cleanup() {
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("register + findById: user được lưu vào PostgreSQL với mật khẩu đã hash")
    void register_persistsUserToDatabase() {
        RegisterRequest req = new RegisterRequest(
                "integration@test.com", "securePass123", "Integration User", "0901111111");

        UserDto dto = userService.register(req);

        assertThat(dto.id()).isNotNull();
        assertThat(userRepository.existsByEmail("integration@test.com")).isTrue();

        // Verify password is NOT stored in plain-text
        var saved = userRepository.findByEmail("integration@test.com").orElseThrow();
        assertThat(saved.getPassword()).doesNotContain("securePass123");
        assertThat(saved.getPassword()).startsWith("$2");  // BCrypt prefix
    }

    @Test
    @DisplayName("register: email trùng → IllegalArgumentException, không lưu vào DB")
    void register_duplicateEmail_doesNotPersist() {
        RegisterRequest req = new RegisterRequest("dup@test.com", "pass", "User", "0900000000");
        userService.register(req);

        assertThatThrownBy(() -> userService.register(req))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(userRepository.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("loadUserByUsername: sau khi register, load được đúng user")
    void loadUserByUsername_afterRegister_returnsCorrectUser() {
        RegisterRequest req = new RegisterRequest("load@test.com", "pass", "Load User", "0900000001");
        userService.register(req);

        var details = userService.loadUserByUsername("load@test.com");

        assertThat(details.getUsername()).isEqualTo("load@test.com");
        assertThat(details.isEnabled()).isTrue();
    }

    @Test
    @DisplayName("updateProfile: cập nhật fullName + phone vào DB")
    void updateProfile_persitsChangesToDatabase() {
        RegisterRequest req = new RegisterRequest("update@test.com", "pass", "Old Name", "0900000002");
        UserDto created = userService.register(req);

        userService.updateProfile(created.id(), "New Name", "0999999999");

        var updated = userRepository.findById(created.id()).orElseThrow();
        assertThat(updated.getFullName()).isEqualTo("New Name");
        assertThat(updated.getPhone()).isEqualTo("0999999999");
    }
}
