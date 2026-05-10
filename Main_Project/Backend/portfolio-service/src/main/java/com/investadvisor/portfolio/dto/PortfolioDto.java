package com.investadvisor.portfolio.dto;

import com.investadvisor.portfolio.model.Portfolio;
import com.investadvisor.portfolio.model.RiskProfile;
import com.investadvisor.portfolio.model.WatchlistItem;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record PortfolioDto(
        UUID id,
        UUID userId,
        String name,
        String description,
        RiskProfile riskProfile,
        boolean active,
        LocalDateTime createdAt,
        List<String> tickers,
        List<HoldingDto> holdings
) {
    public record HoldingDto(String ticker, long quantity, BigDecimal avgPrice) {}

    public static PortfolioDto from(Portfolio p) {
        List<WatchlistItem> items = p.getWatchlistItems() == null ? List.of() : p.getWatchlistItems();
        List<String> tickers = items.stream().map(WatchlistItem::getTicker).sorted().toList();
        List<HoldingDto> holdings = items.stream()
                .map(w -> new HoldingDto(w.getTicker(), w.getQuantity(), w.getAvgPrice()))
                .sorted((a, b) -> a.ticker().compareTo(b.ticker()))
                .toList();
        return new PortfolioDto(p.getId(), p.getUserId(), p.getName(), p.getDescription(),
                p.getRiskProfile(), p.isActive(), p.getCreatedAt(), tickers, holdings);
    }
}
