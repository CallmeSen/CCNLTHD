package vn.tt.practice.notificationservice.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import vn.tt.practice.notificationservice.config.UserClient;
import vn.tt.practice.notificationservice.service.EmailService;

@RequiredArgsConstructor
@Service
@Slf4j
public class OrderEventConsumer {

    private final EmailService emailService;
    private final UserClient userClient;

    private String getEmail;
    @KafkaListener(topics = "notificationTopic", groupId = "notification-group")
    public void listen(String rawJson) {
        try {

            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode node = objectMapper.readTree(rawJson);

            String message = node.get("message").asText();
            String userId = node.get("userId").asText();

            log.info("📩 Received message: {} for userId: {}", message, userId);

            String email = userClient.getEmailByUserId(userId);
            if (email != null) {
                emailService.sendEmail(email, "Order Notification", message);
            } else {
                log.warn("❗ Không tìm thấy email cho userId: {}", userId);
            }

        } catch (Exception e) {
            log.error("❌ Failed to parse message", e);
        }
    }

}