package com.investadvisor.marketdata.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * HTTP client for the TCBS public stock-insight API.
 *
 * <p>No authentication required — this is an open public endpoint used by the
 * TCBS trading platform's own charting widgets.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TcbsApiClient {

    private final RestTemplate restTemplate;

    @Value("${tcbs.api.base-url:https://apipubaws.tcbs.com.vn}")
    private String baseUrl;

    /**
     * Fetches OHLCV candle data for a Vietnamese market index.
     *
     * @param indexId    VNINDEX or VN30
     * @param resolution TradingView resolution: 1, 5, 15, 30, 60, D, W, M
     * @param fromEpoch  start time as Unix epoch seconds (inclusive)
     * @param toEpoch    end time as Unix epoch seconds (exclusive)
     * @return parsed response with parallel-array price data, or {@code null} on HTTP error
     */
    public TcbsIndexResponse fetchIndexChart(String indexId, String resolution,
                                             long fromEpoch, long toEpoch) {
        String url = UriComponentsBuilder.fromHttpUrl(baseUrl)
                .path("/stock-insight/v1/index/chart")
                .queryParam("indexId", indexId)
                .queryParam("type", "stickChart")
                .queryParam("resolution", resolution)
                .queryParam("from", fromEpoch)
                .queryParam("to", toEpoch)
                .build()
                .toUriString();

        log.debug("TCBS request: {}", url);

        // Include a browser-like User-Agent to avoid being blocked
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT,
                "Mozilla/5.0 (compatible; InvestAdvisor/1.0; +https://investadvisor.internal)");
        headers.set(HttpHeaders.ACCEPT, "application/json");

        return restTemplate.exchange(url, HttpMethod.GET,
                new HttpEntity<>(headers), TcbsIndexResponse.class).getBody();
    }
}
