package com.investadvisor.marketdata.controller;

import com.investadvisor.marketdata.dto.StockDto;
import com.investadvisor.marketdata.dto.StockPriceDto;
import com.investadvisor.marketdata.service.MarketDataService;
import com.investadvisor.marketdata.service.VnIndexIngestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
public class MarketDataController {

    private final MarketDataService marketDataService;
    private final VnIndexIngestionService vnIndexIngestionService;

    // ── Stocks ─────────────────────────────────────────────────────────────────

    @PostMapping("/stocks")
    public ResponseEntity<StockDto> createStock(@Valid @RequestBody StockDto.CreateRequest request) {
        return ResponseEntity.status(201).body(marketDataService.createStock(request.toEntity()));
    }

    @GetMapping("/stocks")
    public ResponseEntity<List<StockDto>> getAllStocks() {
        return ResponseEntity.ok(marketDataService.getAllActiveStocks());
    }

    @GetMapping("/stocks/{ticker}")
    public ResponseEntity<StockDto> getStock(@PathVariable String ticker) {
        return ResponseEntity.ok(marketDataService.getByTicker(ticker));
    }

    // ── Prices ────────────────────────────────────────────────────────────────

    @GetMapping("/stocks/{ticker}/price/latest")
    public ResponseEntity<StockPriceDto> getLatestPrice(
            @PathVariable String ticker,
            @RequestParam(defaultValue = "1D") String interval) {
        return ResponseEntity.ok(marketDataService.getLatestPrice(ticker, interval));
    }

    @GetMapping("/stocks/{ticker}/price/history")
    public ResponseEntity<List<StockPriceDto>> getPriceHistory(
            @PathVariable String ticker,
            @RequestParam(defaultValue = "1D") String interval,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(marketDataService.getPrices(ticker, interval, from, to));
    }

    @GetMapping("/stocks/{ticker}/price/daily")
    public ResponseEntity<List<StockPriceDto>> getDailyHistory(
            @PathVariable String ticker,
            @RequestParam(defaultValue = "30") int limit) {
        return ResponseEntity.ok(marketDataService.getDailyHistory(ticker, limit));
    }

    /** Internal endpoint for data ingestion (called by data pipeline). */
    @PostMapping("/ingest")
    public ResponseEntity<StockPriceDto> ingest(@Valid @RequestBody StockPriceDto.IngestRequest request) {
        return ResponseEntity.ok(marketDataService.ingestPrice(request));
    }

    // ── Index endpoints ────────────────────────────────────────────────────────

    /** List the index tickers supported by the auto-fetch pipeline. */
    @GetMapping("/indices")
    public ResponseEntity<List<String>> getSupportedIndices() {
        return ResponseEntity.ok(VnIndexIngestionService.SUPPORTED_INDICES);
    }

    /** Latest price for a market index (VNINDEX or VN30). */
    @GetMapping("/indices/{indexId}/price/latest")
    public ResponseEntity<StockPriceDto> getIndexLatestPrice(
            @PathVariable String indexId,
            @RequestParam(defaultValue = "1D") String interval) {
        return ResponseEntity.ok(marketDataService.getLatestPrice(indexId.toUpperCase(), interval));
    }

    /**
     * Historical OHLCV candles for a market index within a date range.
     *
     * <p>Example:
     * <pre>
     *   GET /api/market/indices/VNINDEX/price/history
     *       ?interval=1D&from=2025-01-01&to=2025-04-29
     * </pre>
     */
    @GetMapping("/indices/{indexId}/price/history")
    public ResponseEntity<List<StockPriceDto>> getIndexPriceHistory(
            @PathVariable String indexId,
            @RequestParam(defaultValue = "1D") String interval,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDateTime fromDt = from.atStartOfDay();
        LocalDateTime toDt   = to.plusDays(1).atStartOfDay();
        return ResponseEntity.ok(
                marketDataService.getPrices(indexId.toUpperCase(), interval, fromDt, toDt));
    }

    /**
     * Manually trigger a data fetch for a specific index and date range.
     * Useful for backfilling historical data.
     *
     * <p>Example:
     * <pre>
     *   POST /api/market/indices/fetch
     *       ?indexId=VNINDEX&interval=1D&from=2024-01-01&to=2025-04-29
     * </pre>
     *
     * @return summary with the number of newly ingested records
     */
    @PostMapping("/indices/fetch")
    public ResponseEntity<Map<String, Object>> fetchIndexData(
            @RequestParam String indexId,
            @RequestParam(defaultValue = "1D") String interval,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        int ingested = vnIndexIngestionService.fetchAndIngest(indexId, interval, from, to);
        return ResponseEntity.ok(Map.of(
                "indexId",   indexId.toUpperCase(),
                "interval",  interval.toUpperCase(),
                "from",      from.toString(),
                "to",        to.toString(),
                "ingested",  ingested));
    }
}
