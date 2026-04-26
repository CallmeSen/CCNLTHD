package com.investadvisor.notification.kafka;

import com.investadvisor.notification.kafka.events.MarketAlertEvent;
import com.investadvisor.notification.kafka.events.PortfolioEvent;
import com.investadvisor.notification.kafka.events.UserEvent;
import com.investadvisor.notification.model.NotificationType;
import com.investadvisor.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Listens on all three topics and dispatches notifications accordingly.
 * Each listener method is its own consumer — they run in separate threads
 * within the same consumer group.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventConsumer {

    private final NotificationService notificationService;

    @KafkaListener(topics = "user-events", groupId = "notification-service-group",
            containerFactory = "userEventKafkaListenerContainerFactory")
    public void onUserEvent(UserEvent event) {
        log.info("Received user event [{}] for {}", event.getEventType(), event.getEmail());
        if ("USER_REGISTERED".equals(event.getEventType())) {
            String subject = "Chào mừng bạn đến với InvestAdvisor!";
            String body = String.format(
                    "Xin chào %s,\n\nTài khoản của bạn đã được tạo thành công.\n" +
                    "Hãy bắt đầu xây dựng danh mục đầu tư của bạn ngay hôm nay.\n\n" +
                    "Trân trọng,\nĐội ngũ InvestAdvisor",
                    event.getFullName()
            );
            notificationService.send(event.getUserId(), event.getEmail(),
                    NotificationType.USER_REGISTERED, subject, body);
        }
    }

    @KafkaListener(topics = "market-data-events", groupId = "notification-service-group",
            containerFactory = "marketAlertKafkaListenerContainerFactory")
    public void onMarketEvent(MarketAlertEvent event) {
        log.debug("Received market event [{}] for {}", event.getEventType(), event.getTicker());
        // Price alert logic: in a real implementation, look up users who subscribed
        // to price alerts for this ticker and notify them.
        // Placeholder — extend with user alert subscription table.
    }

    @KafkaListener(topics = "portfolio-events", groupId = "notification-service-group",
            containerFactory = "portfolioEventKafkaListenerContainerFactory")
    public void onPortfolioEvent(PortfolioEvent event) {
        log.info("Received portfolio event [{}] for user {}", event.getEventType(), event.getUserId());
        if ("TRANSACTION_EXECUTED".equals(event.getEventType()) && event.getTicker() != null) {
            // In production, look up user email via user-service REST call or cache
            // For now, log and skip email (email requires user lookup)
            log.info("Portfolio transaction: {} {} shares of {} @ {} VND",
                    event.getTransactionType(), event.getQuantity(),
                    event.getTicker(),
                    event.getPriceVnd() != null ? event.getPriceVnd() : BigDecimal.ZERO);
        }
    }
}
