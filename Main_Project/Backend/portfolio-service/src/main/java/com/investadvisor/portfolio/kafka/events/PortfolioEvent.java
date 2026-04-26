package com.investadvisor.portfolio.kafka.events;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioEvent {
    /** e.g. PORTFOLIO_CREATED, STOCK_ADDED, STOCK_REMOVED */
    private String eventType;
    private UUID portfolioId;
    private UUID userId;
    private Instant occurredAt;
}
