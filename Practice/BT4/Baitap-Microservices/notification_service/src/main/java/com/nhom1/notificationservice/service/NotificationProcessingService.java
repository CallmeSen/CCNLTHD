package com.nhom1.notificationservice.service;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.nhom1.notificationservice.dto.NotificationEvent;
import com.nhom1.notificationservice.entity.NotificationDocument;
import com.nhom1.notificationservice.repository.NotificationRepository;

@Service
public class NotificationProcessingService {

    private static final Logger LOGGER = LoggerFactory.getLogger(NotificationProcessingService.class);

    private final NotificationRepository notificationRepository;

    public NotificationProcessingService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public void processNotification(NotificationEvent event) {
        LOGGER.info("Processing notification for orderNumber={} message={}", event.orderNumber(), event.message());

        NotificationDocument document = new NotificationDocument();
        document.setOrderNumber(event.orderNumber());
        document.setMessage(event.message());
        document.setDeliveryStatus("SENT");
        document.setCreatedAt(Instant.now());
        notificationRepository.save(document);

        // Simulate email sending for assignment scope.
        LOGGER.info("[EMAIL_SIMULATION] Confirmation email sent for orderNumber={}", event.orderNumber());
    }
}
