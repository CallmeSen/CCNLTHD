package com.investadvisor.notification.service;

import com.investadvisor.notification.model.Notification;
import com.investadvisor.notification.model.NotificationType;
import com.investadvisor.notification.repository.NotificationRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationService Unit Tests")
class NotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private JavaMailSender mailSender;

    @InjectMocks
    private NotificationService notificationService;

    private static final UUID USER_ID = UUID.randomUUID();
    private static final String RECIPIENT = "user@example.com";

    // ── send (thành công) ─────────────────────────────────────────────────────

    @Test
    @DisplayName("send: gửi email thành công → status=SENT, sentAt được set")
    void send_emailSucceeds_statusIsSent() {
        Notification pending = buildPendingNotification();
        Notification saved = buildPendingNotification();
        saved.setStatus("SENT");

        when(notificationRepository.save(any())).thenReturn(pending).thenReturn(saved);
        doNothing().when(mailSender).send(any(SimpleMailMessage.class));

        Notification result = notificationService.send(
                USER_ID, RECIPIENT, NotificationType.USER_REGISTERED,
                "Welcome!", "Welcome to InvestAdvisor"
        );

        assertThat(result.getStatus()).isEqualTo("SENT");
        verify(mailSender).send(any(SimpleMailMessage.class));
        verify(notificationRepository, times(2)).save(any());
    }

    @Test
    @DisplayName("send: email được gửi đến đúng địa chỉ với đúng subject")
    void send_emailHasCorrectToAndSubject() {
        Notification pending = buildPendingNotification();
        when(notificationRepository.save(any())).thenReturn(pending);
        doNothing().when(mailSender).send(any(SimpleMailMessage.class));

        notificationService.send(USER_ID, RECIPIENT, NotificationType.USER_REGISTERED,
                "Chào mừng!", "Nội dung email");

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        assertThat(captor.getValue().getTo()).contains(RECIPIENT);
        assertThat(captor.getValue().getSubject()).isEqualTo("Chào mừng!");
    }

    // ── send (thất bại) ───────────────────────────────────────────────────────

    @Test
    @DisplayName("send: SMTP thất bại → status=FAILED, errorMessage được set, không throw exception")
    void send_emailFails_statusIsFailedWithErrorMessage() {
        Notification pending = buildPendingNotification();
        Notification failedSave = buildPendingNotification();
        failedSave.setStatus("FAILED");
        failedSave.setErrorMessage("SMTP connection refused");

        when(notificationRepository.save(any())).thenReturn(pending).thenReturn(failedSave);
        doThrow(new MailSendException("SMTP connection refused"))
                .when(mailSender).send(any(SimpleMailMessage.class));

        Notification result = notificationService.send(
                USER_ID, RECIPIENT, NotificationType.USER_REGISTERED,
                "Welcome", "Body"
        );

        // NotificationService catches exception — does NOT propagate it
        assertThat(result.getStatus()).isEqualTo("FAILED");
        assertThat(result.getErrorMessage()).isNotBlank();
        verify(notificationRepository, times(2)).save(any());
    }

    @Test
    @DisplayName("send: SMTP thất bại → Notification vẫn được persist vào DB với status=FAILED")
    void send_emailFails_stillPersistsNotification() {
        Notification pending = buildPendingNotification();
        when(notificationRepository.save(any())).thenReturn(pending);
        doThrow(new RuntimeException("Mail server down")).when(mailSender).send(any(SimpleMailMessage.class));

        notificationService.send(USER_ID, RECIPIENT, NotificationType.MARKET_PRICE_ALERT, "Alert", "Body");

        verify(notificationRepository, times(2)).save(any());
    }

    // ── getByUser ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("getByUser: trả danh sách notification của user, sắp xếp theo createdAt DESC")
    void getByUser_returnsUserNotifications() {
        Notification n1 = buildPendingNotification();
        Notification n2 = buildPendingNotification();
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(USER_ID))
                .thenReturn(List.of(n1, n2));

        List<Notification> result = notificationService.getByUser(USER_ID);

        assertThat(result).hasSize(2);
        verify(notificationRepository).findByUserIdOrderByCreatedAtDesc(USER_ID);
    }

    @Test
    @DisplayName("getByUser: user không có notification → danh sách rỗng")
    void getByUser_noNotifications_returnsEmptyList() {
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(USER_ID)).thenReturn(List.of());

        assertThat(notificationService.getByUser(USER_ID)).isEmpty();
    }

    // ── getByUserAndType ──────────────────────────────────────────────────────

    @Test
    @DisplayName("getByUserAndType: filter đúng loại notification")
    void getByUserAndType_filtersCorrectly() {
        Notification n = buildPendingNotification();
        when(notificationRepository.findByUserIdAndTypeOrderByCreatedAtDesc(
                USER_ID, NotificationType.USER_REGISTERED))
                .thenReturn(List.of(n));

        List<Notification> result = notificationService.getByUserAndType(USER_ID, NotificationType.USER_REGISTERED);

        assertThat(result).hasSize(1);
        verify(notificationRepository).findByUserIdAndTypeOrderByCreatedAtDesc(
                USER_ID, NotificationType.USER_REGISTERED);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Notification buildPendingNotification() {
        Notification n = new Notification();
        n.setUserId(USER_ID);
        n.setRecipientEmail(RECIPIENT);
        n.setType(NotificationType.USER_REGISTERED);
        n.setSubject("Test Subject");
        n.setBody("Test Body");
        n.setStatus("PENDING");
        return n;
    }
}
