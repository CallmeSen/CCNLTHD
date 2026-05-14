package com.investadvisor.notification.kafka;

import com.investadvisor.notification.kafka.events.MarketAlertEvent;
import com.investadvisor.notification.kafka.events.PortfolioEvent;
import com.investadvisor.notification.kafka.events.UserEvent;
import com.investadvisor.notification.model.NotificationType;
import com.investadvisor.notification.service.NotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationEventConsumer Unit Tests")
class NotificationEventConsumerTest {

    @Mock private NotificationService notificationService;

    @InjectMocks
    private NotificationEventConsumer consumer;

    // ── onUserEvent ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("USER_REGISTERED event: gọi notificationService.send với đúng type và email")
    void onUserEvent_userRegistered_sendsWelcomeEmail() {
        UUID userId = UUID.randomUUID();
        UserEvent event = buildUserEvent("USER_REGISTERED", userId, "newuser@example.com", "Nguyễn Văn A");

        consumer.onUserEvent(event);

        ArgumentCaptor<String> subjectCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(notificationService).send(
                eq(userId),
                eq("newuser@example.com"),
                eq(NotificationType.USER_REGISTERED),
                subjectCaptor.capture(),
                bodyCaptor.capture()
        );
        assertThat(subjectCaptor.getValue()).isNotBlank();
        assertThat(bodyCaptor.getValue()).contains("Nguyễn Văn A");
    }

    @Test
    @DisplayName("USER_REGISTERED: body email phải chứa tên đầy đủ của user")
    void onUserEvent_userRegistered_emailBodyContainsFullName() {
        UserEvent event = buildUserEvent("USER_REGISTERED", UUID.randomUUID(), "user@test.com", "Trần Thị B");

        consumer.onUserEvent(event);

        verify(notificationService).send(
                any(), any(), any(),
                any(),
                argThat(body -> body.contains("Trần Thị B"))
        );
    }

    @Test
    @DisplayName("USER_UPDATED event: không gửi notification (chỉ USER_REGISTERED mới gửi)")
    void onUserEvent_userUpdated_doesNotSendNotification() {
        UserEvent event = buildUserEvent("USER_UPDATED", UUID.randomUUID(), "user@test.com", "User");

        consumer.onUserEvent(event);

        verify(notificationService, never()).send(any(), any(), any(), any(), any());
    }

    // ── onPortfolioEvent ──────────────────────────────────────────────────────

    @Test
    @DisplayName("TRANSACTION_EXECUTED event: ghi log, không crash khi thiếu email")
    void onPortfolioEvent_transactionExecuted_logsWithoutException() {
        PortfolioEvent event = buildPortfolioEvent("TRANSACTION_EXECUTED", "VNM");
        event.setQuantity(100L);
        event.setPriceVnd(new BigDecimal("85000"));

        // Should not throw even though email lookup is a placeholder (not implemented)
        consumer.onPortfolioEvent(event);

        // NotificationService should NOT be called (email lookup not yet implemented)
        verify(notificationService, never()).send(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("PORTFOLIO_CREATED event: không gửi notification (không xử lý event type này)")
    void onPortfolioEvent_portfolioCreated_isIgnored() {
        PortfolioEvent event = buildPortfolioEvent("PORTFOLIO_CREATED", null);

        consumer.onPortfolioEvent(event);

        verify(notificationService, never()).send(any(), any(), any(), any(), any());
    }

    // ── onMarketEvent ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("PRICE_ALERT market event: không crash (placeholder implementation)")
    void onMarketEvent_priceAlert_noException() {
        MarketAlertEvent event = new MarketAlertEvent();
        event.setEventType("PRICE_ALERT");
        event.setTicker("VNM");

        // Should not throw — market alerts are a placeholder implementation
        consumer.onMarketEvent(event);

        verify(notificationService, never()).send(any(), any(), any(), any(), any());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private UserEvent buildUserEvent(String type, UUID userId, String email, String fullName) {
        UserEvent e = new UserEvent();
        e.setEventType(type);
        e.setUserId(userId);
        e.setEmail(email);
        e.setFullName(fullName);
        return e;
    }

    private PortfolioEvent buildPortfolioEvent(String type, String ticker) {
        PortfolioEvent e = new PortfolioEvent();
        e.setEventType(type);
        e.setUserId(UUID.randomUUID());
        e.setPortfolioId(UUID.randomUUID());
        e.setTicker(ticker);
        return e;
    }
}
