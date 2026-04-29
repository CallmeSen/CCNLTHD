package com.investadvisor.marketdata.repository;

import com.investadvisor.marketdata.model.StockPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface StockPriceRepository extends JpaRepository<StockPrice, Long> {

    List<StockPrice> findByTickerAndIntervalAndTimestampBetweenOrderByTimestampAsc(
            String ticker,
            String interval,
            LocalDateTime from,
            LocalDateTime to
    );

    Optional<StockPrice> findTopByTickerAndIntervalOrderByTimestampDesc(String ticker, String interval);

    @Query("SELECT sp FROM StockPrice sp WHERE sp.ticker = :ticker AND sp.interval = '1D' ORDER BY sp.timestamp DESC")
    List<StockPrice> findDailyByTicker(@Param("ticker") String ticker,
                                       org.springframework.data.domain.Pageable pageable);

    /** Used to prevent duplicate ingestion of the same candle. */
    boolean existsByTickerAndIntervalAndTimestamp(String ticker, String interval, LocalDateTime timestamp);
}
