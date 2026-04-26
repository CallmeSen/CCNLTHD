package com.investadvisor.portfolio.kafka;

import com.investadvisor.portfolio.kafka.events.PortfolioEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PortfolioEventProducer {

    private static final String TOPIC = "portfolio-events";

    private final KafkaTemplate<String, PortfolioEvent> kafkaTemplate;

    public void publish(PortfolioEvent event) {
        kafkaTemplate.send(TOPIC, event.getPortfolioId().toString(), event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish portfolio event: {}", ex.getMessage());
                    } else {
                        log.debug("Portfolio event [{}] published for portfolio {}",
                                event.getEventType(), event.getPortfolioId());
                    }
                });
    }
}
