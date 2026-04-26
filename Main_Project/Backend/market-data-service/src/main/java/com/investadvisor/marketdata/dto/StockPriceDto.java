package com.investadvisor.marketdata.dto;

import com.investadvisor.marketdata.model.StockPrice;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record StockPriceDto(
        Long id,
        String ticker,
        LocalDateTime timestamp,
        BigDecimal open,
        BigDecimal high,
        BigDecimal low,
        BigDecimal close,
        Long volume,
        String interval
) {
    public static StockPriceDto from(StockPrice sp) {
        return new StockPriceDto(sp.getId(), sp.getTicker(), sp.getTimestamp(),
                sp.getOpen(), sp.getHigh(), sp.getLow(), sp.getClose(),
                sp.getVolume(), sp.getInterval());
    }

    /** Inbound record for data ingestion */
    public record IngestRequest(
            @NotBlank String ticker,
            @NotNull LocalDateTime timestamp,
            BigDecimal open,
            BigDecimal high,
            BigDecimal low,
            @NotNull @Positive BigDecimal close,
            Long volume,
            @NotBlank String interval
    ) {}
}
