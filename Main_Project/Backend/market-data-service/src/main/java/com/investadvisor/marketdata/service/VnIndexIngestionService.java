package com.investadvisor.marketdata.service;

import com.investadvisor.marketdata.client.TcbsApiClient;
import com.investadvisor.marketdata.client.TcbsIndexResponse;
import com.investadvisor.marketdata.dto.StockPriceDto;
import com.investadvisor.marketdata.model.Stock;
import com.investadvisor.marketdata.model.StockPrice;
import com.investadvisor.marketdata.repository.StockPriceRepository;
import com.investadvisor.marketdata.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Fetches VN-Index and VN30 data from the TCBS public API and stores it
 * as {@link StockPrice} records using the same pipeline as regular stocks.
 *
 * <p>Index tickers are seeded into the {@code stocks} table on startup so that
 * the existing price-history endpoints work out of the box:
 * <pre>
 *   GET /api/market/stocks/VNINDEX/price/history?interval=1D&from=...&to=...
 *   GET /api/market/stocks/VN30/price/history?interval=1D&from=...&to=...
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VnIndexIngestionService {

    /** Vietnam timezone used when converting epoch seconds ↔ LocalDateTime. */
    public static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /** All index tickers managed by this service. */
    public static final List<String> SUPPORTED_INDICES = List.of("VNINDEX", "VN30");

    /**
     * Maps the internal interval codes (used in {@code stock_prices.interval})
     * to TCBS / TradingView resolution strings.
     */
    private static final Map<String, String> INTERVAL_TO_RESOLUTION = Map.of(
            "1MIN",  "1",
            "5MIN",  "5",
            "15MIN", "15",
            "1H",    "60",
            "1D",    "D"
    );

    private final TcbsApiClient       tcbsApiClient;
    private final StockRepository     stockRepository;
    private final StockPriceRepository stockPriceRepository;
    private final MarketDataService    marketDataService;

    // ── Startup seed ──────────────────────────────────────────────────────────

    /**
     * Ensures VNINDEX and VN30 exist as stock master records.
     * Runs once after the Spring context is fully ready (after JPA schema creation).
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initIndices() {
        seedIndex("VNINDEX", "VN-Index (HOSE)");
        seedIndex("VN30",    "VN30 Index (HOSE)");
    }

    private void seedIndex(String ticker, String name) {
        if (!stockRepository.existsByTicker(ticker)) {
            Stock index = Stock.builder()
                    .ticker(ticker)
                    .companyName(name)
                    .exchange("HOSE")
                    .sector("INDEX")
                    .industry("Market Index")
                    .active(true)
                    .build();
            stockRepository.save(index);
            log.info("Seeded index ticker: {}", ticker);
        }
    }

    // ── Data ingestion ────────────────────────────────────────────────────────

    /**
     * Fetches OHLCV candles from TCBS for the given index and stores them.
     *
     * <p>Duplicate candles (same ticker + interval + timestamp) are silently skipped.
     *
     * @param indexId  VNINDEX or VN30 (case-insensitive)
     * @param interval internal interval code: 1MIN, 5MIN, 15MIN, 1H, 1D
     * @param from     start date (inclusive), Vietnam time
     * @param to       end date (inclusive), Vietnam time
     * @return number of new records persisted
     */
    @Transactional
    public int fetchAndIngest(String indexId, String interval, LocalDate from, LocalDate to) {
        String upperIndexId  = indexId.toUpperCase();
        String upperInterval = interval.toUpperCase();
        String resolution    = INTERVAL_TO_RESOLUTION.getOrDefault(upperInterval, "D");

        long fromEpoch = from.atStartOfDay(VN_ZONE).toEpochSecond();
        long toEpoch   = to.plusDays(1).atStartOfDay(VN_ZONE).toEpochSecond();

        log.info("Fetching {} {} from {} to {}", upperIndexId, upperInterval, from, to);

        TcbsIndexResponse response = tcbsApiClient.fetchIndexChart(
                upperIndexId, resolution, fromEpoch, toEpoch);

        if (response == null || !response.hasData()) {
            log.warn("No data returned for {} [{} → {}]", upperIndexId, from, to);
            return 0;
        }

        List<StockPriceDto.IngestRequest> requests =
                buildRequests(upperIndexId, upperInterval, response);

        int ingested = 0;
        for (StockPriceDto.IngestRequest req : requests) {
            if (stockPriceRepository.existsByTickerAndIntervalAndTimestamp(
                    req.ticker(), req.interval(), req.timestamp())) {
                continue; // already stored — skip duplicate
            }
            try {
                marketDataService.ingestPrice(req);
                ingested++;
            } catch (Exception e) {
                log.warn("Failed to ingest {} {} @ {}: {}",
                        upperIndexId, upperInterval, req.timestamp(), e.getMessage());
            }
        }

        log.info("Persisted {}/{} records for {} ({})", ingested, requests.size(), upperIndexId, upperInterval);
        return ingested;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<StockPriceDto.IngestRequest> buildRequests(
            String indexId, String interval, TcbsIndexResponse r) {

        List<StockPriceDto.IngestRequest> list = new ArrayList<>();
        List<Long> timestamps = r.timestamps();

        for (int i = 0; i < timestamps.size(); i++) {
            LocalDateTime ts = Instant.ofEpochSecond(timestamps.get(i))
                    .atZone(VN_ZONE)
                    .toLocalDateTime();

            BigDecimal open  = toDecimal(r.open(),  i);
            BigDecimal high  = toDecimal(r.high(),  i);
            BigDecimal low   = toDecimal(r.low(),   i);
            BigDecimal close = toDecimal(r.close(), i);
            long volume      = (r.volume() != null && i < r.volume().size() && r.volume().get(i) != null)
                               ? r.volume().get(i) : 0L;

            // Skip candles where close is zero or null (malformed data)
            if (close.compareTo(BigDecimal.ZERO) <= 0) continue;

            list.add(new StockPriceDto.IngestRequest(
                    indexId, ts, open, high, low, close, volume, interval));
        }
        return list;
    }

    private BigDecimal toDecimal(List<Double> list, int i) {
        if (list == null || i >= list.size() || list.get(i) == null) return BigDecimal.ZERO;
        return BigDecimal.valueOf(list.get(i));
    }
}
