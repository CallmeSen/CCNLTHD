package com.investadvisor.notification.service;

import com.investadvisor.notification.model.Notification;
import com.investadvisor.notification.model.NotificationType;
import com.investadvisor.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final JavaMailSender mailSender;

    @Transactional
    public Notification send(UUID userId, String recipientEmail,
                             NotificationType type, String subject, String body) {
        Notification notification = Notification.builder()
                .userId(userId)
                .recipientEmail(recipientEmail)
                .type(type)
                .subject(subject)
                .body(body)
                .status("PENDING")
                .build();

        Notification saved = notificationRepository.save(notification);

        try {
            sendEmail(recipientEmail, subject, body);
            saved.setStatus("SENT");
            saved.setSentAt(LocalDateTime.now());
            log.info("Notification [{}] sent to {}", type, recipientEmail);
        } catch (Exception e) {
            saved.setStatus("FAILED");
            saved.setErrorMessage(e.getMessage());
            log.error("Failed to send notification [{}] to {}: {}", type, recipientEmail, e.getMessage());
        }

        return notificationRepository.save(saved);
    }

    private void sendEmail(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }

    @Transactional(readOnly = true)
    public List<Notification> getByUser(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<Notification> getByUserAndType(UUID userId, NotificationType type) {
        return notificationRepository.findByUserIdAndTypeOrderByCreatedAtDesc(userId, type);
    }
}
