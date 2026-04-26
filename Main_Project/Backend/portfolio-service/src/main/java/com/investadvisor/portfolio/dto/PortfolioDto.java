package com.investadvisor.portfolio.dto;

import com.investadvisor.portfolio.model.Portfolio;
import com.investadvisor.portfolio.model.RiskProfile;
import com.investadvisor.portfolio.model.WatchlistItem;

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
        List<String> tickers
) {
    public static PortfolioDto from(Portfolio p) {
        List<String> tickers = p.getWatchlistItems() == null
                ? List.of()
                : p.getWatchlistItems().stream()
                        .map(WatchlistItem::getTicker)
                        .sorted()
                        .toList();
        return new PortfolioDto(p.getId(), p.getUserId(), p.getName(), p.getDescription(),
                p.getRiskProfile(), p.isActive(), p.getCreatedAt(), tickers);
    }
}
