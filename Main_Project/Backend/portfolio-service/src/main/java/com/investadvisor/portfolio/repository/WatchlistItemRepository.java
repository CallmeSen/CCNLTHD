package com.investadvisor.portfolio.repository;

import com.investadvisor.portfolio.model.WatchlistItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface WatchlistItemRepository extends JpaRepository<WatchlistItem, Long> {
    boolean existsByPortfolioIdAndTicker(UUID portfolioId, String ticker);
    Optional<WatchlistItem> findByPortfolioIdAndTicker(UUID portfolioId, String ticker);
    void deleteByPortfolioIdAndTicker(UUID portfolioId, String ticker);
}
