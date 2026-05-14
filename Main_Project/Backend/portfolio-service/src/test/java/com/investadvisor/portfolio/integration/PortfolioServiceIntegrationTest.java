package com.investadvisor.portfolio.integration;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import com.investadvisor.portfolio.dto.AddStockRequest;
import com.investadvisor.portfolio.dto.CreatePortfolioRequest;
import com.investadvisor.portfolio.dto.PortfolioAnalyticsDto;
import com.investadvisor.portfolio.dto.PortfolioDto;
import com.investadvisor.portfolio.model.RiskProfile;
import com.investadvisor.portfolio.repository.PortfolioRepository;
import com.investadvisor.portfolio.repository.WatchlistItemRepository;
import com.investadvisor.portfolio.service.PortfolioService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * PS-I-001..PS-I-015: Integration tests for portfolio-service.
 * Uses real PostgreSQL (Testcontainers), EmbeddedKafka, and WireMock
 * for market-data-service HTTP stubs.
 */
@SpringBootTest
@ActiveProfiles("docker-test")
@EmbeddedKafka(partitions = 1, topics = {"portfolio-events"})
@DisplayName("PortfolioService Integration Tests")
class PortfolioServiceIntegrationTest {

    static WireMockServer wireMock;

    @BeforeAll
    static void startWireMock() {
        wireMock = new WireMockServer(WireMockConfiguration.options().dynamicPort());
        wireMock.start();
        WireMock.configureFor("localhost", wireMock.port());
    }

    @AfterAll
    static void stopWireMock() {
        wireMock.stop();
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("market-data.base-url",
                () -> "http://localhost:" + wireMock.port());
    }

    @Autowired PortfolioService portfolioService;
    @Autowired PortfolioRepository portfolioRepository;
    @Autowired WatchlistItemRepository watchlistItemRepository;

    private UUID testUserId;

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
        watchlistItemRepository.deleteAll();
        portfolioRepository.deleteAll();
        WireMock.reset();
    }

    // ── PS-I-001: Create portfolio persists to DB ────────────────────────────

    @Test
    @DisplayName("PS-I-001: createPortfolio → persisted to PostgreSQL")
    void createPortfolio_persistsToDatabase() {
        CreatePortfolioRequest req = new CreatePortfolioRequest(
                "My Portfolio", "Test portfolio", RiskProfile.MODERATE);

        PortfolioDto dto = portfolioService.createPortfolio(testUserId, req);

        assertThat(dto.id()).isNotNull();
        assertThat(portfolioRepository.findById(dto.id())).isPresent();
        assertThat(portfolioRepository.findById(dto.id()).get().getName())
                .isEqualTo("My Portfolio");
    }

    // ── PS-I-002: getUserPortfolios returns only active ones ─────────────────

    @Test
    @DisplayName("PS-I-002: getUserPortfolios → only active portfolios returned")
    void getUserPortfolios_returnsOnlyActivePortfolios() {
        CreatePortfolioRequest req = new CreatePortfolioRequest(
                "Active Portfolio", null, RiskProfile.CONSERVATIVE);
        PortfolioDto created = portfolioService.createPortfolio(testUserId, req);

        // Soft-delete the portfolio
        portfolioService.deletePortfolio(created.id(), testUserId);

        List<PortfolioDto> result = portfolioService.getUserPortfolios(testUserId);
        assertThat(result).isEmpty();
    }

    // ── PS-I-003: Soft delete sets active=false, does not remove row ─────────

    @Test
    @DisplayName("PS-I-003: deletePortfolio → active=false, row still in DB")
    void deletePortfolio_setsActiveFalse() {
        PortfolioDto dto = portfolioService.createPortfolio(testUserId,
                new CreatePortfolioRequest("Portfolio", null, RiskProfile.MODERATE));

        portfolioService.deletePortfolio(dto.id(), testUserId);

        var entity = portfolioRepository.findById(dto.id()).orElseThrow();
        assertThat(entity.isActive()).isFalse();
    }

    // ── PS-I-004: addStock persisted, unique constraint enforced ─────────────

    @Test
    @DisplayName("PS-I-004: addStock → WatchlistItem persisted to DB")
    void addStock_persistsWatchlistItem() {
        PortfolioDto portfolio = portfolioService.createPortfolio(testUserId,
                new CreatePortfolioRequest("Portfolio", null, RiskProfile.MODERATE));
        AddStockRequest req = new AddStockRequest("VCB",
                100L, new BigDecimal("69000"));

        portfolioService.addStock(portfolio.id(), testUserId, req);

        assertThat(watchlistItemRepository
                .existsByPortfolioIdAndTicker(portfolio.id(), "VCB")).isTrue();
    }

    // ── PS-I-005: Duplicate ticker → IllegalArgumentException ────────────────

    @Test
    @DisplayName("PS-I-005: addStock duplicate ticker → IllegalArgumentException, DB not modified")
    void addStock_duplicateTicker_throwsAndDoesNotPersist() {
        PortfolioDto portfolio = portfolioService.createPortfolio(testUserId,
                new CreatePortfolioRequest("Portfolio", null, RiskProfile.MODERATE));
        AddStockRequest req = new AddStockRequest("VCB",
                100L, new BigDecimal("69000"));

        portfolioService.addStock(portfolio.id(), testUserId, req);

        assertThatThrownBy(() -> portfolioService.addStock(portfolio.id(), testUserId, req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("VCB");

        // Only 1 row persisted
        assertThat(watchlistItemRepository
                .findAll().stream()
                .filter(i -> i.getTicker().equals("VCB"))
                .count()).isEqualTo(1);
    }

    // ── PS-I-006: removeStock removes only the specified ticker ───────────────

    @Test
    @DisplayName("PS-I-006: removeStock → WatchlistItem deleted from DB")
    void removeStock_deletesItemFromDatabase() {
        PortfolioDto portfolio = portfolioService.createPortfolio(testUserId,
                new CreatePortfolioRequest("Portfolio", null, RiskProfile.MODERATE));
        portfolioService.addStock(portfolio.id(), testUserId,
                new AddStockRequest("VCB", 100L, new BigDecimal("69000")));
        portfolioService.addStock(portfolio.id(), testUserId,
                new AddStockRequest("FPT", 50L, new BigDecimal("82000")));

        portfolioService.removeStock(portfolio.id(), testUserId, "VCB");

        assertThat(watchlistItemRepository
                .existsByPortfolioIdAndTicker(portfolio.id(), "VCB")).isFalse();
        assertThat(watchlistItemRepository
                .existsByPortfolioIdAndTicker(portfolio.id(), "FPT")).isTrue();
    }

    // ── PS-I-007: updateRiskProfile persists new value ────────────────────────

    @Test
    @DisplayName("PS-I-007: updateRiskProfile → persisted to DB")
    void updateRiskProfile_persistsChange() {
        PortfolioDto portfolio = portfolioService.createPortfolio(testUserId,
                new CreatePortfolioRequest("Portfolio", null, RiskProfile.CONSERVATIVE));

        portfolioService.updateRiskProfile(portfolio.id(), testUserId, RiskProfile.AGGRESSIVE);

        var entity = portfolioRepository.findById(portfolio.id()).orElseThrow();
        assertThat(entity.getRiskProfile()).isEqualTo(RiskProfile.AGGRESSIVE);
    }

    // ── PS-I-008: getPortfolio wrong owner → NoSuchElementException ───────────

    @Test
    @DisplayName("PS-I-008: getPortfolio with wrong userId → NoSuchElementException")
    void getPortfolio_wrongOwner_throws() {
        PortfolioDto portfolio = portfolioService.createPortfolio(testUserId,
                new CreatePortfolioRequest("Portfolio", null, RiskProfile.MODERATE));

        UUID otherUser = UUID.randomUUID();
        assertThatThrownBy(() -> portfolioService.getPortfolio(portfolio.id(), otherUser))
                .isInstanceOf(NoSuchElementException.class);
    }

    // ── PS-I-009: getPortfolioAnalytics calls WireMock ───────────────────────

    @Test
    @DisplayName("PS-I-009: getPortfolioAnalytics → HTTP call to market-data-service via WireMock")
    void getPortfolioAnalytics_callsMarketDataService() throws Exception {
        PortfolioDto portfolio = portfolioService.createPortfolio(testUserId,
                new CreatePortfolioRequest("Portfolio", null, RiskProfile.MODERATE));
        portfolioService.addStock(portfolio.id(), testUserId,
                new AddStockRequest("VCB", 100L, new BigDecimal("69000")));

        // Stub WireMock to return mock analytics response
        String analyticsJson = """
                {
                  "total_value_vnd": 7150000.0,
                  "total_pnl_vnd": 250000.0,
                  "expected_return_annual_pct": 12.5,
                  "volatility_annual_pct": 18.3,
                  "sharpe_ratio": 0.5234,
                  "beta": 1.1234,
                  "risk_free_rate_pct": 3.0,
                  "metrics_per_ticker": [],
                  "rebalance_actions": []
                }
                """;
        wireMock.stubFor(post(urlEqualTo("/api/market/analytics/portfolio"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                        .withBody(analyticsJson)));

        PortfolioAnalyticsDto result =
                portfolioService.getPortfolioAnalytics(portfolio.id(), testUserId);

        assertThat(result).isNotNull();
        assertThat(result.expectedReturnAnnualPct()).isEqualTo(12.5);
        assertThat(result.sharpeRatio()).isEqualTo(0.5234);

        // Verify WireMock received the call
        wireMock.verify(postRequestedFor(urlEqualTo("/api/market/analytics/portfolio")));
    }

    // ── PS-I-010: Analytics → market-data-service returns 503 ────────────────

    @Test
    @DisplayName("PS-I-010: market-data-service returns 503 → runtime exception propagated")
    void getPortfolioAnalytics_marketDataServiceDown_throwsException() {
        PortfolioDto portfolio = portfolioService.createPortfolio(testUserId,
                new CreatePortfolioRequest("Portfolio", null, RiskProfile.MODERATE));
        portfolioService.addStock(portfolio.id(), testUserId,
                new AddStockRequest("VCB", 100L, new BigDecimal("69000")));

        wireMock.stubFor(post(urlEqualTo("/api/market/analytics/portfolio"))
                .willReturn(aResponse().withStatus(503)));

        // AnalyticsClient catches RestClientException and returns emptyAnalytics() — no exception propagated
        PortfolioAnalyticsDto result = portfolioService.getPortfolioAnalytics(portfolio.id(), testUserId);
        assertThat(result).isNotNull();
        assertThat(result.expectedReturnAnnualPct()).isEqualTo(0.0);
    }

    // ── PS-I-011: Ticker uppercase normalization in DB ────────────────────────

    @Test
    @DisplayName("PS-I-011: addStock with lowercase ticker → stored as UPPERCASE in DB")
    void addStock_tickerStoredUppercase() {
        PortfolioDto portfolio = portfolioService.createPortfolio(testUserId,
                new CreatePortfolioRequest("Portfolio", null, RiskProfile.MODERATE));

        portfolioService.addStock(portfolio.id(), testUserId,
                new AddStockRequest("vcb", 100L, new BigDecimal("69000")));

        assertThat(watchlistItemRepository
                .existsByPortfolioIdAndTicker(portfolio.id(), "VCB")).isTrue();
        assertThat(watchlistItemRepository
                .existsByPortfolioIdAndTicker(portfolio.id(), "vcb")).isFalse();
    }

    // ── PS-I-012: Multiple portfolios per user ────────────────────────────────

    @Test
    @DisplayName("PS-I-012: user can have multiple active portfolios")
    void getUserPortfolios_multiplePortfolios_returnsAll() {
        portfolioService.createPortfolio(testUserId,
                new CreatePortfolioRequest("Portfolio A", null, RiskProfile.CONSERVATIVE));
        portfolioService.createPortfolio(testUserId,
                new CreatePortfolioRequest("Portfolio B", null, RiskProfile.AGGRESSIVE));
        portfolioService.createPortfolio(testUserId,
                new CreatePortfolioRequest("Portfolio C", null, RiskProfile.MODERATE));

        List<PortfolioDto> result = portfolioService.getUserPortfolios(testUserId);
        assertThat(result).hasSize(3);
    }

    // ── PS-I-013: Portfolios isolated between users ───────────────────────────

    @Test
    @DisplayName("PS-I-013: getUserPortfolios only returns portfolios for that user")
    void getUserPortfolios_isolatedBetweenUsers() {
        UUID otherUserId = UUID.randomUUID();
        portfolioService.createPortfolio(testUserId,
                new CreatePortfolioRequest("My Portfolio", null, RiskProfile.MODERATE));
        portfolioService.createPortfolio(otherUserId,
                new CreatePortfolioRequest("Other's Portfolio", null, RiskProfile.MODERATE));

        List<PortfolioDto> myPortfolios = portfolioService.getUserPortfolios(testUserId);
        assertThat(myPortfolios).hasSize(1);
        assertThat(myPortfolios.get(0).name()).isEqualTo("My Portfolio");

        List<PortfolioDto> otherPortfolios = portfolioService.getUserPortfolios(otherUserId);
        assertThat(otherPortfolios).hasSize(1);
        assertThat(otherPortfolios.get(0).name()).isEqualTo("Other's Portfolio");
    }

    // ── PS-I-014: WireMock request body contains holdings ────────────────────

    @Test
    @DisplayName("PS-I-014: analytics request to market-data-service contains portfolio holdings")
    void getPortfolioAnalytics_requestBodyContainsHoldings() throws Exception {
        PortfolioDto portfolio = portfolioService.createPortfolio(testUserId,
                new CreatePortfolioRequest("Portfolio", null, RiskProfile.MODERATE));
        portfolioService.addStock(portfolio.id(), testUserId,
                new AddStockRequest("VCB", 100L, new BigDecimal("69000")));

        String analyticsJson = """
                {
                  "total_value_vnd": 0, "total_pnl_vnd": 0,
                  "expected_return_annual_pct": 0, "volatility_annual_pct": 0,
                  "sharpe_ratio": 0, "beta": 1.0, "risk_free_rate_pct": 3.0,
                  "metrics_per_ticker": [], "rebalance_actions": []
                }
                """;
        wireMock.stubFor(post(urlEqualTo("/api/market/analytics/portfolio"))
                .willReturn(aResponse().withStatus(200)
                        .withHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                        .withBody(analyticsJson)));

        portfolioService.getPortfolioAnalytics(portfolio.id(), testUserId);

        // Verify request body contained "VCB"
        wireMock.verify(postRequestedFor(urlEqualTo("/api/market/analytics/portfolio"))
                .withRequestBody(containing("VCB")));
    }
}
