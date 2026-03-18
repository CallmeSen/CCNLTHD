package com.nhom1.order_service.listener;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class OrderEventProducer {

    private static final Logger LOGGER = LoggerFactory.getLogger(OrderEventProducer.class);

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final String notificationTopic;

    public OrderEventProducer(
            KafkaTemplate<String, String> kafkaTemplate,
            @Value("${app.kafka.notification-topic:notificationTopic}") String notificationTopic) {
        this.kafkaTemplate = kafkaTemplate;
        this.notificationTopic = notificationTopic;
    }

    public void sendOrderPlacedEvent(String orderNumber) {
        String message = "Order Placed: " + orderNumber;
        kafkaTemplate.send(notificationTopic, message);
        LOGGER.info("Published order notification for orderNumber={} to topic={}", orderNumber, notificationTopic);
    }
}
