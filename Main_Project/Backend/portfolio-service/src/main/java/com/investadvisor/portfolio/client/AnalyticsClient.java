package com.investadvisor.portfolio.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.investadvisor.portfolio.dto.PortfolioAnalyticsDto;
import com.investadvisor.portfolio.model.WatchlistItem;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * HTTP client that delegates MPT / CAPM calculations to the Python
 * market-data-service (FastAPI).
 *
 * The endpoint being called is:
 *   POST /api/market/analytics/portfolio
 */
@Slf4j
@Component
public class AnalyticsClient {

    private final RestTemplate restTemplate;
    private final String marketDataBaseUrl;

    public AnalyticsClient(
            RestTemplate restTemplate,
            @Value("${market-data.base-url:http://localhost:8082}") String marketDataBaseUrl) {
        this.restTemplate = restTemplate;
        this.marketDataBaseUrl = marketDataBaseUrl;
    }

    /**
     * Send holdings to the analytics endpoint and return MPT metrics.
     *
     * @param holdings       list of WatchlistItem entities with quantity + avgPrice
     * @param riskFreeRate   annual risk-free rate (e.g. 0.03 for 3%)
     * @param lookbackDays   historical window (default 365)
     * @return analytics result, or a zero-filled fallback if the call fails
     */
    public PortfolioAnalyticsDto computeAnalytics(
            List<WatchlistItem> holdings,
            double riskFreeRate,
            int lookbackDays) {

        List<Map<String, Object>> holdingsPayload = holdings.stream()
                .map(h -> Map.<String, Object>of(
                        "ticker", h.getTicker(),
                        "quantity", h.getQuantity(),
                        "avg_price", h.getAvgPrice().doubleValue()))
                .toList();

        Map<String, Object> requestBody = Map.of(
                "holdings", holdingsPayload,
                "risk_free_rate", riskFreeRate,
                "lookback_days", lookbackDays,
                "market_ticker", "VNINDEX");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<PortfolioAnalyticsDto> response = restTemplate.exchange(
                    marketDataBaseUrl + "/api/market/analytics/portfolio",
                    HttpMethod.POST,
                    entity,
                    PortfolioAnalyticsDto.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (RestClientException ex) {
            log.warn("Analytics call to market-data-service failed: {}", ex.getMessage());
        }

        return emptyAnalytics();
    }

    private static PortfolioAnalyticsDto emptyAnalytics() {
        return new PortfolioAnalyticsDto(
                0, 0, 0, 0, 0, 1.0, 3.0,
                List.of(), List.of());
    }
}
