package com.investadvisor.notification.kafka.events;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarketAlertEvent {
    private String eventType;
    private String ticker;
    private BigDecimal price;
    private Long volume;
    private String interval;
    private Instant occurredAt;
}
