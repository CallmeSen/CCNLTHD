package vn.hdbank.intern.event;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Objects;

@AllArgsConstructor
@Service
@Slf4j
public class OrderEventConsumer {

    private final ProcessConsumer processConsumer;

    @KafkaListener(topics = "notificationTopic", groupId = "notification-group")
    public void listen(String message) {
        log.info("Received notification message: {}", message);
        if (message == null || message.isEmpty()) {
            log.warn("Received empty message, skipping processing ........ ");
            return;
        }

        if (message.equals("Order has been placed successfully"))
        {
            String to = "yentuan130803@gmail.com";
            String subject = "ORDER";
            String text = "Order has been placed successfully";
            log.info("Send email to {}", to);
            processConsumer.sendEmail(to, subject, text);
        }
    }

}