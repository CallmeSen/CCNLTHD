package com.investadvisor.marketdata.service;

import com.investadvisor.marketdata.dto.StockDto;
import com.investadvisor.marketdata.dto.StockPriceDto;
import com.investadvisor.marketdata.kafka.MarketDataEventProducer;
import com.investadvisor.marketdata.kafka.events.MarketDataEvent;
import com.investadvisor.marketdata.model.Stock;
import com.investadvisor.marketdata.model.StockPrice;
import com.investadvisor.marketdata.repository.StockPriceRepository;
import com.investadvisor.marketdata.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@Slf4j
@Service
@RequiredArgsConstructor
public class MarketDataService {

    private final StockRepository stockRepository;
    private final StockPriceRepository stockPriceRepository;
    private final MarketDataEventProducer eventProducer;

    // ── Stocks ─────────────────────────────────────────────────────────────────

    public List<StockDto> getAllActiveStocks() {
        return stockRepository.findByActiveTrue().stream().map(StockDto::from).toList();
    }

    public StockDto getByTicker(String ticker) {
        return stockRepository.findByTicker(ticker.toUpperCase())
                .map(StockDto::from)
                .orElseThrow(() -> new NoSuchElementException("Stock not found: " + ticker));
    }

    @Transactional
    public StockDto createStock(Stock stock) {
        stock.setTicker(stock.getTicker().toUpperCase());
        if (stockRepository.existsByTicker(stock.getTicker())) {
            throw new IllegalArgumentException("Ticker already exists: " + stock.getTicker());
        }
        return StockDto.from(stockRepository.save(stock));
    }

    // ── Prices ────────────────────────────────────────────────────────────────

    public List<StockPriceDto> getPrices(String ticker, String interval, LocalDateTime from, LocalDateTime to) {
        return stockPriceRepository
                .findByTickerAndIntervalAndTimestampBetweenOrderByTimestampAsc(ticker.toUpperCase(), interval, from, to)
                .stream().map(StockPriceDto::from).toList();
    }

    public StockPriceDto getLatestPrice(String ticker, String interval) {
        return stockPriceRepository.findTopByTickerAndIntervalOrderByTimestampDesc(ticker.toUpperCase(), interval)
                .map(StockPriceDto::from)
                .orElseThrow(() -> new NoSuchElementException("No price data for: " + ticker));
    }

    public List<StockPriceDto> getDailyHistory(String ticker, int limit) {
        return stockPriceRepository.findDailyByTicker(ticker.toUpperCase(), PageRequest.of(0, limit))
                .stream().map(StockPriceDto::from).toList();
    }

    @Transactional
    public StockPriceDto ingestPrice(StockPriceDto.IngestRequest req) {
        Stock stock = stockRepository.findByTicker(req.ticker().toUpperCase())
                .orElseThrow(() -> new NoSuchElementException("Unknown ticker: " + req.ticker()));

        StockPrice price = StockPrice.builder()
                .stock(stock)
                .ticker(stock.getTicker())
                .timestamp(req.timestamp())
                .open(req.open())
                .high(req.high())
                .low(req.low())
                .close(req.close())
                .volume(req.volume())
                .interval(req.interval())
                .build();

        StockPrice saved = stockPriceRepository.save(price);
        log.debug("Ingested {} {} @ {}", saved.getTicker(), saved.getInterval(), saved.getTimestamp());

        // Publish real-time price event to Kafka
        eventProducer.publish(new MarketDataEvent(
                "PRICE_UPDATED", saved.getTicker(), saved.getClose(),
                saved.getVolume(), saved.getInterval(), Instant.now()
        ));

        return StockPriceDto.from(saved);
    }
}
