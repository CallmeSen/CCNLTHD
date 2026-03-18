package com.nhom1.notificationservice.listener;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nhom1.notificationservice.dto.NotificationEvent;
import com.nhom1.notificationservice.service.NotificationProcessingService;

@Component
public class OrderNotificationListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(OrderNotificationListener.class);
    private static final Pattern LEGACY_FORMAT = Pattern.compile("Order Placed: (.+)");

    private final ObjectMapper objectMapper;
    private final NotificationProcessingService notificationProcessingService;

    public OrderNotificationListener(
            ObjectMapper objectMapper,
            NotificationProcessingService notificationProcessingService) {
        this.objectMapper = objectMapper;
        this.notificationProcessingService = notificationProcessingService;
    }

    @KafkaListener(topics = "${app.kafka.notification-topic:notificationTopic}")
    public void listen(String payload) {
        LOGGER.info("Received event from Kafka topic notificationTopic: {}", payload);
        NotificationEvent event = parse(payload);
        notificationProcessingService.processNotification(event);
    }

    private NotificationEvent parse(String payload) {
        try {
            return objectMapper.readValue(payload, NotificationEvent.class);
        } catch (JsonProcessingException ex) {
            Matcher matcher = LEGACY_FORMAT.matcher(payload);
            if (matcher.matches()) {
                String orderNumber = matcher.group(1);
                return new NotificationEvent(orderNumber, "Order Placed Successfully");
            }
            throw new IllegalArgumentException("Invalid notification payload: " + payload, ex);
        }
    }
}
