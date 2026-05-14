package com.investadvisor.portfolio.service;

import com.investadvisor.portfolio.client.AnalyticsClient;
import com.investadvisor.portfolio.dto.AddStockRequest;
import com.investadvisor.portfolio.dto.CreatePortfolioRequest;
import com.investadvisor.portfolio.dto.PortfolioAnalyticsDto;
import com.investadvisor.portfolio.dto.PortfolioDto;
import com.investadvisor.portfolio.kafka.PortfolioEventProducer;
import com.investadvisor.portfolio.model.Portfolio;
import com.investadvisor.portfolio.model.RiskProfile;
import com.investadvisor.portfolio.model.WatchlistItem;
import com.investadvisor.portfolio.repository.PortfolioRepository;
import com.investadvisor.portfolio.repository.WatchlistItemRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PortfolioService Unit Tests")
class PortfolioServiceTest {

    @Mock private PortfolioRepository portfolioRepository;
    @Mock private WatchlistItemRepository watchlistItemRepository;
    @Mock private PortfolioEventProducer eventProducer;
    @Mock private EntityManager entityManager;
    @Mock private AnalyticsClient analyticsClient;

    @InjectMocks
    private PortfolioService portfolioService;

    // ── getUserPortfolios ─────────────────────────────────────────────────────

    @Test
    @DisplayName("getUserPortfolios: trả danh sách portfolio active của user")
    void getUserPortfolios_returnsActivePortfoliosForUser() {
        UUID userId = UUID.randomUUID();
        Portfolio p1 = buildPortfolio(UUID.randomUUID(), userId, "Portfolio A");
        Portfolio p2 = buildPortfolio(UUID.randomUUID(), userId, "Portfolio B");
        when(portfolioRepository.findByUserIdAndActiveTrue(userId)).thenReturn(List.of(p1, p2));

        List<PortfolioDto> result = portfolioService.getUserPortfolios(userId);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(PortfolioDto::name)
                .containsExactlyInAnyOrder("Portfolio A", "Portfolio B");
    }

    @Test
    @DisplayName("getUserPortfolios: không có portfolio → danh sách rỗng")
    void getUserPortfolios_noPortfolios_returnsEmptyList() {
        UUID userId = UUID.randomUUID();
        when(portfolioRepository.findByUserIdAndActiveTrue(userId)).thenReturn(List.of());

        assertThat(portfolioService.getUserPortfolios(userId)).isEmpty();
    }

    // ── getPortfolio ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("getPortfolio: portfolioId + userId đúng → trả PortfolioDto")
    void getPortfolio_validOwnership_returnsDto() {
        UUID userId = UUID.randomUUID();
        UUID portfolioId = UUID.randomUUID();
        Portfolio p = buildPortfolio(portfolioId, userId, "My Portfolio");
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(p));

        PortfolioDto result = portfolioService.getPortfolio(portfolioId, userId);

        assertThat(result.id()).isEqualTo(portfolioId);
        assertThat(result.name()).isEqualTo("My Portfolio");
    }

    @Test
    @DisplayName("getPortfolio: portfolio không thuộc user → NoSuchElementException")
    void getPortfolio_wrongOwner_throwsNoSuchElementException() {
        UUID userId = UUID.randomUUID();
        UUID portfolioId = UUID.randomUUID();
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> portfolioService.getPortfolio(portfolioId, userId))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining(portfolioId.toString());
    }

    // ── createPortfolio ───────────────────────────────────────────────────────

    @Test
    @DisplayName("createPortfolio: tạo portfolio, lưu DB, publish PORTFOLIO_CREATED event")
    void createPortfolio_validRequest_savesAndPublishesEvent() {
        UUID userId = UUID.randomUUID();
        UUID portfolioId = UUID.randomUUID();
        CreatePortfolioRequest req = new CreatePortfolioRequest(
                "Growth Portfolio", "Aggressive growth", RiskProfile.AGGRESSIVE);
        Portfolio saved = buildPortfolio(portfolioId, userId, "Growth Portfolio");
        when(portfolioRepository.save(any())).thenReturn(saved);

        PortfolioDto result = portfolioService.createPortfolio(userId, req);

        assertThat(result.id()).isEqualTo(portfolioId);
        assertThat(result.name()).isEqualTo("Growth Portfolio");

        ArgumentCaptor<com.investadvisor.portfolio.kafka.events.PortfolioEvent> captor =
                ArgumentCaptor.forClass(com.investadvisor.portfolio.kafka.events.PortfolioEvent.class);
        verify(eventProducer).publish(captor.capture());
        assertThat(captor.getValue().getEventType()).isEqualTo("PORTFOLIO_CREATED");
    }

    // ── addStock ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("addStock: ticker mới → thêm vào watchlist, publish STOCK_ADDED event")
    void addStock_newTicker_addsToWatchlistAndPublishesEvent() {
        UUID userId = UUID.randomUUID();
        UUID portfolioId = UUID.randomUUID();
        Portfolio portfolio = buildPortfolio(portfolioId, userId, "My Portfolio");
        AddStockRequest req = new AddStockRequest("vnm", 100L, new BigDecimal("85000"));

        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));
        when(watchlistItemRepository.existsByPortfolioIdAndTicker(portfolioId, "VNM")).thenReturn(false);
        when(portfolioRepository.save(any())).thenReturn(portfolio);

        portfolioService.addStock(portfolioId, userId, req);

        verify(portfolioRepository).save(argThat(p ->
                p.getWatchlistItems().stream().anyMatch(item -> "VNM".equals(item.getTicker()))
        ));
        verify(eventProducer).publish(argThat(e -> "STOCK_ADDED".equals(e.getEventType())));
    }

    @Test
    @DisplayName("addStock: ticker tự động uppercase (vnm → VNM)")
    void addStock_tickerIsUppercased() {
        UUID userId = UUID.randomUUID();
        UUID portfolioId = UUID.randomUUID();
        Portfolio portfolio = buildPortfolio(portfolioId, userId, "Portfolio");
        AddStockRequest req = new AddStockRequest("vnm", 10L, new BigDecimal("85000"));

        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));
        when(watchlistItemRepository.existsByPortfolioIdAndTicker(portfolioId, "VNM")).thenReturn(false);
        when(portfolioRepository.save(any())).thenReturn(portfolio);

        portfolioService.addStock(portfolioId, userId, req);

        verify(watchlistItemRepository).existsByPortfolioIdAndTicker(portfolioId, "VNM");
    }

    @Test
    @DisplayName("addStock: ticker đã có trong portfolio → IllegalArgumentException")
    void addStock_duplicateTicker_throwsIllegalArgumentException() {
        UUID userId = UUID.randomUUID();
        UUID portfolioId = UUID.randomUUID();
        Portfolio portfolio = buildPortfolio(portfolioId, userId, "Portfolio");
        AddStockRequest req = new AddStockRequest("VCB", 10L, new BigDecimal("90000"));

        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));
        when(watchlistItemRepository.existsByPortfolioIdAndTicker(portfolioId, "VCB")).thenReturn(true);

        assertThatThrownBy(() -> portfolioService.addStock(portfolioId, userId, req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("VCB");

        verify(portfolioRepository, never()).save(any());
    }

    // ── removeStock ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("removeStock: xóa ticker thành công → deleteByPortfolioIdAndTicker được gọi")
    void removeStock_existingTicker_deletesFromWatchlist() {
        UUID userId = UUID.randomUUID();
        UUID portfolioId = UUID.randomUUID();
        Portfolio portfolio = buildPortfolio(portfolioId, userId, "Portfolio");

        when(portfolioRepository.findByIdAndUserId(portfolioId, userId))
                .thenReturn(Optional.of(portfolio));

        portfolioService.removeStock(portfolioId, userId, "vnm");

        verify(watchlistItemRepository).deleteByPortfolioIdAndTicker(portfolioId, "VNM");
        verify(entityManager).flush();
        verify(entityManager).clear();
    }

    @Test
    @DisplayName("removeStock: portfolio không thuộc user → NoSuchElementException")
    void removeStock_portfolioNotFound_throwsNoSuchElementException() {
        UUID userId = UUID.randomUUID();
        UUID portfolioId = UUID.randomUUID();
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> portfolioService.removeStock(portfolioId, userId, "VNM"))
                .isInstanceOf(NoSuchElementException.class);

        verify(watchlistItemRepository, never()).deleteByPortfolioIdAndTicker(any(), any());
    }

    // ── deletePortfolio ───────────────────────────────────────────────────────

    @Test
    @DisplayName("deletePortfolio: đánh dấu active=false (soft delete)")
    void deletePortfolio_validPortfolio_setsActiveFalse() {
        UUID userId = UUID.randomUUID();
        UUID portfolioId = UUID.randomUUID();
        Portfolio portfolio = buildPortfolio(portfolioId, userId, "Portfolio");
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));
        when(portfolioRepository.save(any())).thenReturn(portfolio);

        portfolioService.deletePortfolio(portfolioId, userId);

        verify(portfolioRepository).save(argThat(p -> !p.isActive()));
    }

    @Test
    @DisplayName("deletePortfolio: portfolio không tồn tại → NoSuchElementException")
    void deletePortfolio_notFound_throwsNoSuchElementException() {
        UUID userId = UUID.randomUUID();
        UUID portfolioId = UUID.randomUUID();
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> portfolioService.deletePortfolio(portfolioId, userId))
                .isInstanceOf(NoSuchElementException.class);

        verify(portfolioRepository, never()).save(any());
    }

    // ── updateRiskProfile ─────────────────────────────────────────────────────

    @Test
    @DisplayName("updateRiskProfile: cập nhật risk profile thành công")
    void updateRiskProfile_validPortfolio_updatesRiskProfile() {
        UUID userId = UUID.randomUUID();
        UUID portfolioId = UUID.randomUUID();
        Portfolio portfolio = buildPortfolio(portfolioId, userId, "Portfolio");
        portfolio.setRiskProfile(RiskProfile.MODERATE);

        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));
        when(portfolioRepository.save(any())).thenReturn(portfolio);

        portfolioService.updateRiskProfile(portfolioId, userId, RiskProfile.AGGRESSIVE);

        verify(portfolioRepository).save(argThat(p -> p.getRiskProfile() == RiskProfile.AGGRESSIVE));
    }

    // ── getPortfolioAnalytics ─────────────────────────────────────────────────

    @Test
    @DisplayName("getPortfolioAnalytics: gọi AnalyticsClient với danh sách holdings")
    void getPortfolioAnalytics_callsAnalyticsClient() {
        UUID userId = UUID.randomUUID();
        UUID portfolioId = UUID.randomUUID();
        Portfolio portfolio = buildPortfolio(portfolioId, userId, "Portfolio");
        WatchlistItem item = WatchlistItem.builder()
                .ticker("VNM").quantity(10L).build();
        portfolio.getWatchlistItems().add(item);

        PortfolioAnalyticsDto expected = new PortfolioAnalyticsDto(
                0, 0, 0.15, 0.25, 0.6, 1.1, 0.03, List.of(), List.of());
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));
        when(analyticsClient.computeAnalytics(any(), eq(0.03), eq(365))).thenReturn(expected);

        PortfolioAnalyticsDto result = portfolioService.getPortfolioAnalytics(portfolioId, userId);

        assertThat(result.expectedReturnAnnualPct()).isEqualTo(0.15);
        assertThat(result.sharpeRatio()).isEqualTo(0.6);
        verify(analyticsClient).computeAnalytics(any(), eq(0.03), eq(365));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Portfolio buildPortfolio(UUID id, UUID userId, String name) {
        return Portfolio.builder()
                .id(id).userId(userId).name(name)
                .riskProfile(RiskProfile.MODERATE)
                .active(true)
                .watchlistItems(new ArrayList<>())
                .build();
    }
}
