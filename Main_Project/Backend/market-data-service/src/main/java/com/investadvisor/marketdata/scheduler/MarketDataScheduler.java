package com.investadvisor.marketdata.scheduler;

import com.investadvisor.marketdata.service.VnIndexIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.annotation.Schedules;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Scheduled jobs that automatically keep VN-Index and VN30 price data up to date.
 *
 * <p>All cron expressions use Vietnam time (Asia/Ho_Chi_Minh, UTC+7).
 * <ul>
 *   <li>Daily candles are fetched at 17:30 on trading days (30 min after HOSE close).</li>
 *   <li>Hourly candles are refreshed at 09:15, 11:30, and 15:15 (before/during/after trading).</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MarketDataScheduler {

    private final VnIndexIngestionService vnIndexIngestionService;

    // ── Daily (1D) candles — weekdays at 17:30 ICT ────────────────────────────

    @Scheduled(cron = "0 30 17 * * MON-FRI", zone = "Asia/Ho_Chi_Minh")
    public void fetchDailyIndexData() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        for (String indexId : VnIndexIngestionService.SUPPORTED_INDICES) {
            try {
                vnIndexIngestionService.fetchAndIngest(indexId, "1D", today, today);
            } catch (Exception e) {
                log.error("Daily fetch failed for {}: {}", indexId, e.getMessage(), e);
            }
        }
    }

    // ── Intraday (1H) candles — weekdays at 09:15, 11:30, 15:15 ICT ─────────

    @Schedules({
        @Scheduled(cron = "0 15  9 * * MON-FRI", zone = "Asia/Ho_Chi_Minh"),
        @Scheduled(cron = "0 30 11 * * MON-FRI", zone = "Asia/Ho_Chi_Minh"),
        @Scheduled(cron = "0 15 15 * * MON-FRI", zone = "Asia/Ho_Chi_Minh")
    })
    public void fetchIntradayIndexData() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        for (String indexId : VnIndexIngestionService.SUPPORTED_INDICES) {
            try {
                vnIndexIngestionService.fetchAndIngest(indexId, "1H", today, today);
            } catch (Exception e) {
                log.error("Intraday fetch failed for {}: {}", indexId, e.getMessage(), e);
            }
        }
    }
}
