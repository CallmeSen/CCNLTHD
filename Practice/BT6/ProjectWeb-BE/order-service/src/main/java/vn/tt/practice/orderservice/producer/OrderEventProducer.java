package vn.tt.practice.orderservice.producer;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OrderEventProducer {
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public void sendOrderEvent(String message, String userId) {
        String jsonMessage = String.format("{\"message\":\"%s\", \"userId\":\"%s\"}", message, userId);
        kafkaTemplate.send("notificationTopic",jsonMessage);
    }
}