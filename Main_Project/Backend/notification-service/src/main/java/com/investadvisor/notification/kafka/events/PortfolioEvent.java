package com.investadvisor.notification.kafka.events;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioEvent {
    private String eventType;
    private UUID portfolioId;
    private UUID userId;
    private String ticker;
    private String transactionType;
    private Long quantity;
    private BigDecimal priceVnd;
    private Instant occurredAt;
}
