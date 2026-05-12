package com.investadvisor.portfolio.service;

import com.investadvisor.portfolio.client.AnalyticsClient;
import com.investadvisor.portfolio.dto.AddStockRequest;
import com.investadvisor.portfolio.dto.CreatePortfolioRequest;
import com.investadvisor.portfolio.dto.PortfolioAnalyticsDto;
import com.investadvisor.portfolio.dto.PortfolioDto;
import com.investadvisor.portfolio.kafka.PortfolioEventProducer;
import com.investadvisor.portfolio.kafka.events.PortfolioEvent;
import com.investadvisor.portfolio.model.*;
import com.investadvisor.portfolio.repository.PortfolioRepository;
import com.investadvisor.portfolio.repository.WatchlistItemRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PortfolioService {

    private final PortfolioRepository portfolioRepository;
    private final WatchlistItemRepository watchlistItemRepository;
    private final PortfolioEventProducer eventProducer;
    private final EntityManager entityManager;
    private final AnalyticsClient analyticsClient;

    @Transactional(readOnly = true)
    public List<PortfolioDto> getUserPortfolios(UUID userId) {
        return portfolioRepository.findByUserIdAndActiveTrue(userId)
                .stream().map(PortfolioDto::from).toList();
    }

    @Transactional(readOnly = true)
    public PortfolioDto getPortfolio(UUID portfolioId, UUID userId) {
        return portfolioRepository.findByIdAndUserId(portfolioId, userId)
                .map(PortfolioDto::from)
                .orElseThrow(() -> new NoSuchElementException("Portfolio not found: " + portfolioId));
    }

    @Transactional(readOnly = true)
    public PortfolioAnalyticsDto getPortfolioAnalytics(UUID portfolioId, UUID userId) {
        Portfolio portfolio = portfolioRepository.findByIdAndUserId(portfolioId, userId)
                .orElseThrow(() -> new NoSuchElementException("Portfolio not found: " + portfolioId));
        List<WatchlistItem> holdings = portfolio.getWatchlistItems();
        log.info("Computing analytics for portfolio {} with {} holdings", portfolioId, holdings.size());
        return analyticsClient.computeAnalytics(holdings, 0.03, 365);
    }

    @Transactional
    public PortfolioDto createPortfolio(UUID userId, CreatePortfolioRequest req) {
        Portfolio portfolio = Portfolio.builder()
                .userId(userId)
                .name(req.name())
                .description(req.description())
                .riskProfile(req.riskProfile())
                .build();
        Portfolio saved = portfolioRepository.save(portfolio);
        log.info("Created portfolio {} for user {}", saved.getId(), userId);

        eventProducer.publish(new PortfolioEvent(
                "PORTFOLIO_CREATED", saved.getId(), userId, Instant.now()
        ));
        return PortfolioDto.from(saved);
    }

    @Transactional
    public PortfolioDto updateRiskProfile(UUID portfolioId, UUID userId, RiskProfile riskProfile) {
        Portfolio portfolio = portfolioRepository.findByIdAndUserId(portfolioId, userId)
                .orElseThrow(() -> new NoSuchElementException("Portfolio not found: " + portfolioId));
        portfolio.setRiskProfile(riskProfile);
        Portfolio saved = portfolioRepository.save(portfolio);
        log.info("Updated risk profile for portfolio {} to {}", portfolioId, riskProfile);
        return PortfolioDto.from(saved);
    }

    @Transactional
    public PortfolioDto addStock(UUID portfolioId, UUID userId, AddStockRequest req) {
        String ticker = req.ticker().toUpperCase();
        Portfolio portfolio = portfolioRepository.findByIdAndUserId(portfolioId, userId)
                .orElseThrow(() -> new NoSuchElementException("Portfolio not found: " + portfolioId));
        if (watchlistItemRepository.existsByPortfolioIdAndTicker(portfolioId, ticker)) {
            throw new IllegalArgumentException("Ticker already in portfolio: " + ticker);
        }
        WatchlistItem item = WatchlistItem.builder()
                .portfolio(portfolio)
                .ticker(ticker)
                .quantity(req.quantity())
                .avgPrice(req.avgPrice())
                .build();
        portfolio.getWatchlistItems().add(item);
        Portfolio saved = portfolioRepository.save(portfolio);
        log.info("Added {} (qty={}) to portfolio {}", ticker, req.quantity(), portfolioId);

        eventProducer.publish(new PortfolioEvent(
                "STOCK_ADDED", portfolioId, userId, Instant.now()
        ));
        return PortfolioDto.from(saved);
    }

    @Transactional
    public PortfolioDto removeStock(UUID portfolioId, UUID userId, String rawTicker) {
        String ticker = rawTicker.toUpperCase();
        portfolioRepository.findByIdAndUserId(portfolioId, userId)
                .orElseThrow(() -> new NoSuchElementException("Portfolio not found: " + portfolioId));
        watchlistItemRepository.deleteByPortfolioIdAndTicker(portfolioId, ticker);
        entityManager.flush();
        entityManager.clear();
        Portfolio refreshed = portfolioRepository.findByIdAndUserId(portfolioId, userId).get();
        log.info("Removed {} from portfolio {}", ticker, portfolioId);
        return PortfolioDto.from(refreshed);
    }

    @Transactional
    public void deletePortfolio(UUID portfolioId, UUID userId) {
        Portfolio portfolio = portfolioRepository.findByIdAndUserId(portfolioId, userId)
                .orElseThrow(() -> new NoSuchElementException("Portfolio not found: " + portfolioId));
        portfolio.setActive(false);
        portfolioRepository.save(portfolio);
        log.info("Soft-deleted portfolio {}", portfolioId);
    }
}
