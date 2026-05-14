package com.investadvisor.notification.integration;

import com.icegreen.greenmail.configuration.GreenMailConfiguration;
import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.ServerSetupTest;
import com.investadvisor.notification.model.Notification;
import com.investadvisor.notification.model.NotificationType;
import com.investadvisor.notification.repository.NotificationRepository;
import com.investadvisor.notification.service.NotificationService;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * NS-I-001..NS-I-010: Integration tests for notification-service.
 * Uses real PostgreSQL (Testcontainers), EmbeddedKafka, and GreenMail (SMTP mock).
 */
@SpringBootTest
@ActiveProfiles("docker-test")
@EmbeddedKafka(partitions = 1, topics = {"user-events", "portfolio-events", "market-data-events"})
@DisplayName("NotificationService Integration Tests")
class NotificationServiceIntegrationTest {

    // ── GreenMail: embedded SMTP server ─────────────────────────────────────

    @RegisterExtension
    static GreenMailExtension greenMail = new GreenMailExtension(ServerSetupTest.SMTP)
            .withConfiguration(GreenMailConfiguration.aConfig()
                    .withUser("test@investadvisor.com", "testpass"))
            .withPerMethodLifecycle(false);

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        // Point Spring Mail to GreenMail port
        registry.add("spring.mail.host", () -> "localhost");
        registry.add("spring.mail.port", () -> ServerSetupTest.SMTP.getPort());
        registry.add("spring.mail.username", () -> "test@investadvisor.com");
        registry.add("spring.mail.password", () -> "testpass");
        registry.add("spring.mail.properties.mail.smtp.auth", () -> "false");
        registry.add("spring.mail.properties.mail.smtp.starttls.enable", () -> "false");
    }

    @Autowired NotificationService notificationService;
    @Autowired NotificationRepository notificationRepository;

    private UUID testUserId;

    @BeforeEach
    void setUp() throws Exception {
        testUserId = UUID.randomUUID();
        notificationRepository.deleteAll();
        greenMail.purgeEmailFromAllMailboxes();
    }

    // ── NS-I-001: Email actually sent via GreenMail ──────────────────────────

    @Test
    @DisplayName("NS-I-001: send() → email physically sent to GreenMail SMTP server")
    void send_emailDeliveredToGreenMail() throws Exception {
        notificationService.send(
                testUserId,
                "recipient@test.com",
                NotificationType.USER_REGISTERED,
                "Welcome to InvestAdvisor!",
                "Dear User, welcome aboard.");

        // GreenMail intercepts SMTP — verify exactly 1 email was received
        assertThat(greenMail.getReceivedMessages()).hasSize(1);
        MimeMessage message = greenMail.getReceivedMessages()[0];
        assertThat(message.getAllRecipients()[0].toString())
                .isEqualTo("recipient@test.com");
        assertThat(message.getSubject()).isEqualTo("Welcome to InvestAdvisor!");
    }

    // ── NS-I-002: Notification persisted with SENT status ───────────────────

    @Test
    @DisplayName("NS-I-002: send() success → Notification saved with status=SENT in DB")
    void send_success_savedWithStatusSent() {
        Notification result = notificationService.send(
                testUserId,
                "user@test.com",
                NotificationType.USER_REGISTERED,
                "Welcome!",
                "Hello.");

        assertThat(result.getStatus()).isEqualTo("SENT");
        assertThat(result.getSentAt()).isNotNull();
        assertThat(result.getErrorMessage()).isNull();

        var saved = notificationRepository.findById(result.getId()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo("SENT");
    }

    // ── NS-I-003: Notification persisted with correct fields ─────────────────

    @Test
    @DisplayName("NS-I-003: saved notification has correct userId, type, subject")
    void send_savedNotificationHasCorrectFields() {
        Notification result = notificationService.send(
                testUserId,
                "user@test.com",
                NotificationType.PORTFOLIO_TRANSACTION,
                "Portfolio Update",
                "Your portfolio has been updated.");

        assertThat(result.getUserId()).isEqualTo(testUserId);
        assertThat(result.getType()).isEqualTo(NotificationType.PORTFOLIO_TRANSACTION);
        assertThat(result.getSubject()).isEqualTo("Portfolio Update");
        assertThat(result.getRecipientEmail()).isEqualTo("user@test.com");
    }

    // ── NS-I-004: Email body contains correct content ─────────────────────────

    @Test
    @DisplayName("NS-I-004: email body matches what was sent via service")
    void send_emailBodyMatchesInput() throws Exception {
        String body = "Dear Nguyen Van An, welcome to InvestAdvisor!";
        notificationService.send(
                testUserId, "user@test.com",
                NotificationType.USER_REGISTERED,
                "Welcome", body);

        MimeMessage message = greenMail.getReceivedMessages()[0];
        assertThat(message.getContent().toString()).contains("Nguyen Van An");
    }

    // ── NS-I-005: SMTP failure → FAILED status, no exception thrown ──────────

    @Test
    @DisplayName("NS-I-005: SMTP unreachable (GreenMail stopped) → status=FAILED, no exception")
    void send_smtpFailure_savedWithStatusFailed() {
        greenMail.stop();
        try {
            Notification result = notificationService.send(
                    testUserId, "user@test.com",
                    NotificationType.USER_REGISTERED,
                    "Welcome!", "Body");

            // Must not throw — service handles failure gracefully
            assertThat(result.getStatus()).isEqualTo("FAILED");
            assertThat(result.getErrorMessage()).isNotNull();

            var saved = notificationRepository.findById(result.getId()).orElseThrow();
            assertThat(saved.getStatus()).isEqualTo("FAILED");
        } finally {
            greenMail.start();
        }
    }

    // ── NS-I-006: getByUser returns notifications in descending order ─────────

    @Test
    @DisplayName("NS-I-006: getByUser → returns all notifications for user, newest first")
    void getByUser_returnsNotificationsForUser() throws InterruptedException {
        notificationService.send(testUserId, "user@test.com",
                NotificationType.USER_REGISTERED, "Subject 1", "Body 1");
        Thread.sleep(10); // ensure different timestamps
        notificationService.send(testUserId, "user@test.com",
                NotificationType.PORTFOLIO_TRANSACTION, "Subject 2", "Body 2");

        List<Notification> result = notificationService.getByUser(testUserId);
        assertThat(result).hasSize(2);
        // Newest first — PORTFOLIO_UPDATE was sent last
        assertThat(result.get(0).getType()).isEqualTo(NotificationType.PORTFOLIO_TRANSACTION);
    }

    // ── NS-I-007: getByUser isolates between users ────────────────────────────

    @Test
    @DisplayName("NS-I-007: getByUser does not return other users' notifications")
    void getByUser_isolatedBetweenUsers() {
        UUID otherUser = UUID.randomUUID();
        notificationService.send(testUserId, "my@test.com",
                NotificationType.USER_REGISTERED, "My Welcome", "Body");
        notificationService.send(otherUser, "other@test.com",
                NotificationType.USER_REGISTERED, "Other Welcome", "Body");

        List<Notification> myNotifications = notificationService.getByUser(testUserId);
        assertThat(myNotifications).hasSize(1);
        assertThat(myNotifications.get(0).getRecipientEmail()).isEqualTo("my@test.com");
    }

    // ── NS-I-008: getByUserAndType filters correctly ──────────────────────────

    @Test
    @DisplayName("NS-I-008: getByUserAndType → only returns matching type")
    void getByUserAndType_filtersCorrectly() {
        notificationService.send(testUserId, "u@test.com",
                NotificationType.USER_REGISTERED, "Welcome", "Body");
        notificationService.send(testUserId, "u@test.com",
                NotificationType.PORTFOLIO_TRANSACTION, "Update", "Body");
        notificationService.send(testUserId, "u@test.com",
                NotificationType.MARKET_PRICE_ALERT, "Alert", "Body");

        List<Notification> result = notificationService.getByUserAndType(
                testUserId, NotificationType.PORTFOLIO_TRANSACTION);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getType()).isEqualTo(NotificationType.PORTFOLIO_TRANSACTION);
    }

    // ── NS-I-009: Multiple emails sent sequentially ───────────────────────────

    @Test
    @DisplayName("NS-I-009: send 3 emails → 3 received by GreenMail, 3 rows in DB")
    void send_multipleEmails_allDelivered() {
        String[] emails = {"a@test.com", "b@test.com", "c@test.com"};
        for (String email : emails) {
            notificationService.send(UUID.randomUUID(), email,
                    NotificationType.USER_REGISTERED, "Welcome", "Body");
        }

        assertThat(greenMail.getReceivedMessages()).hasSize(3);
        assertThat(notificationRepository.findAll()).hasSize(3);
    }

    // ── NS-I-010: sentAt timestamp set after successful send ─────────────────

    @Test
    @DisplayName("NS-I-010: sentAt timestamp is set when email is sent successfully")
    void send_success_sentAtTimestampIsSet() {
        var before = java.time.LocalDateTime.now().minusSeconds(1);
        Notification result = notificationService.send(
                testUserId, "user@test.com",
                NotificationType.USER_REGISTERED, "Welcome!", "Body");
        var after = java.time.LocalDateTime.now().plusSeconds(1);

        assertThat(result.getSentAt()).isNotNull();
        assertThat(result.getSentAt()).isAfter(before);
        assertThat(result.getSentAt()).isBefore(after);
    }
}
