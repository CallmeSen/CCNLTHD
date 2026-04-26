package com.investadvisor.marketdata.kafka;

import com.investadvisor.marketdata.kafka.events.MarketDataEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MarketDataEventProducer {

    private static final String TOPIC = "market-data-events";

    private final KafkaTemplate<String, MarketDataEvent> kafkaTemplate;

    public void publish(MarketDataEvent event) {
        kafkaTemplate.send(TOPIC, event.getTicker(), event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish market event for {}: {}", event.getTicker(), ex.getMessage());
                    } else {
                        log.debug("Market event [{}] published for {}", event.getEventType(), event.getTicker());
                    }
                });
    }
}
