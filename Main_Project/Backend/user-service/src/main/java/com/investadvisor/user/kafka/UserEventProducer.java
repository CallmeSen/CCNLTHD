package com.investadvisor.user.kafka;

import com.investadvisor.user.kafka.events.UserEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserEventProducer {

    private static final String TOPIC = "user-events";

    private final KafkaTemplate<String, UserEvent> kafkaTemplate;

    public void publish(UserEvent event) {
        CompletableFuture<SendResult<String, UserEvent>> future =
                kafkaTemplate.send(TOPIC, event.getUserId().toString(), event);

        future.whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish UserEvent [{}] for userId {}: {}",
                        event.getEventType(), event.getUserId(), ex.getMessage());
            } else {
                log.debug("Published UserEvent [{}] for userId {} to partition {}",
                        event.getEventType(), event.getUserId(),
                        result.getRecordMetadata().partition());
            }
        });
    }
}
