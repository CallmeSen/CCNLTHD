package com.investadvisor.notification.controller;

import com.investadvisor.notification.dto.NotificationDto;
import com.investadvisor.notification.model.NotificationType;
import com.investadvisor.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /** Fetch notification history for the calling user. */
    @GetMapping
    public ResponseEntity<List<NotificationDto>> getMyNotifications(
            @RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(
                notificationService.getByUser(userId).stream()
                        .map(NotificationDto::from).toList()
        );
    }

    /** Filter by type. */
    @GetMapping("/type/{type}")
    public ResponseEntity<List<NotificationDto>> getByType(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable NotificationType type) {
        return ResponseEntity.ok(
                notificationService.getByUserAndType(userId, type).stream()
                        .map(NotificationDto::from).toList()
        );
    }
}
