package com.investadvisor.notification.dto;

import com.investadvisor.notification.model.Notification;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificationDto(
        UUID id,
        UUID userId,
        String recipientEmail,
        String type,
        String subject,
        String status,
        LocalDateTime createdAt,
        LocalDateTime sentAt
) {
    public static NotificationDto from(Notification n) {
        return new NotificationDto(
                n.getId(), n.getUserId(), n.getRecipientEmail(),
                n.getType().name(), n.getSubject(), n.getStatus(),
                n.getCreatedAt(), n.getSentAt()
        );
    }
}
