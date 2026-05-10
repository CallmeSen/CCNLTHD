package com.investadvisor.portfolio.controller;

import com.investadvisor.portfolio.dto.AddStockRequest;
import com.investadvisor.portfolio.dto.CreatePortfolioRequest;
import com.investadvisor.portfolio.dto.PortfolioAnalyticsDto;
import com.investadvisor.portfolio.dto.PortfolioDto;
import com.investadvisor.portfolio.model.RiskProfile;
import com.investadvisor.portfolio.service.PortfolioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * The gateway injects X-User-Id and X-User-Role headers after JWT validation,
 * so this service trusts those headers without re-verifying tokens.
 */
@RestController
@RequestMapping("/api/portfolios")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioService portfolioService;

    @GetMapping
    public ResponseEntity<List<PortfolioDto>> getMyPortfolios(
            @RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(portfolioService.getUserPortfolios(userId));
    }

    @GetMapping("/{portfolioId}")
    public ResponseEntity<PortfolioDto> getPortfolio(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID portfolioId) {
        return ResponseEntity.ok(portfolioService.getPortfolio(portfolioId, userId));
    }

    @PostMapping
    public ResponseEntity<PortfolioDto> createPortfolio(
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody CreatePortfolioRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(portfolioService.createPortfolio(userId, request));
    }

    @PatchMapping("/{portfolioId}/risk-profile")
    public ResponseEntity<PortfolioDto> updateRiskProfile(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID portfolioId,
            @RequestParam RiskProfile riskProfile) {
        return ResponseEntity.ok(portfolioService.updateRiskProfile(portfolioId, userId, riskProfile));
    }

    /** Add a stock ticker to this portfolio's watchlist. */
    @PostMapping("/{portfolioId}/stocks")
    public ResponseEntity<PortfolioDto> addStock(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID portfolioId,
            @Valid @RequestBody AddStockRequest request) {
        return ResponseEntity.ok(portfolioService.addStock(portfolioId, userId, request));
    }

    /** Remove a stock ticker from this portfolio's watchlist. */
    @DeleteMapping("/{portfolioId}/stocks/{ticker}")
    public ResponseEntity<PortfolioDto> removeStock(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID portfolioId,
            @PathVariable String ticker) {
        return ResponseEntity.ok(portfolioService.removeStock(portfolioId, userId, ticker));
    }

    /**
     * Compute MPT + CAPM analytics for a portfolio.
     * Delegates calculation to the market-data-service (Python/FastAPI).
     *
     * Returns: expected return, volatility, Sharpe ratio, Beta, and
     * Markowitz rebalancing suggestions.
     */
    @GetMapping("/{portfolioId}/analytics")
    public ResponseEntity<PortfolioAnalyticsDto> getAnalytics(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID portfolioId) {
        return ResponseEntity.ok(portfolioService.getPortfolioAnalytics(portfolioId, userId));
    }
}
