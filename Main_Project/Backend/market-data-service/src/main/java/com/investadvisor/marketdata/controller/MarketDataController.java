package com.investadvisor.marketdata.controller;

import com.investadvisor.marketdata.dto.StockDto;
import com.investadvisor.marketdata.dto.StockPriceDto;
import com.investadvisor.marketdata.service.MarketDataService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
public class MarketDataController {

    private final MarketDataService marketDataService;

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
}
