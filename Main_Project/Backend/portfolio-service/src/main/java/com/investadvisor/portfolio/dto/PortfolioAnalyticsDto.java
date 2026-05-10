package com.investadvisor.portfolio.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Response shape returned by the portfolio analytics endpoint.
 * Mirrors the JSON produced by the Python market-data-service analytics module.
 */
public record PortfolioAnalyticsDto(
        double totalValueVnd,
        double totalPnlVnd,
        double expectedReturnAnnualPct,
        double volatilityAnnualPct,
        double sharpeRatio,
        double beta,
        double riskFreeRatePct,
        List<TickerMetricsDto> metricsPerTicker,
        List<RebalanceActionDto> rebalanceActions
) {

    public record TickerMetricsDto(
            String ticker,
            long quantity,
            double avgPrice,
            double currentPrice,
            double marketValue,
            double weight,
            double pnlPct,
            double expectedReturnAnnualPct,
            double volatilityAnnualPct
    ) {}

    public record RebalanceActionDto(
            String ticker,
            double currentWeightPct,
            double targetWeightPct,
            double deltaWeightPct,
            String action,
            int quantityDelta,
            double currentPrice,
            double estimatedTransactionVnd
    ) {}
}
