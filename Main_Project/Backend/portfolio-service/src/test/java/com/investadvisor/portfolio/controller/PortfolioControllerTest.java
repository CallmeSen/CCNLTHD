package com.investadvisor.portfolio.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.investadvisor.portfolio.dto.*;
import com.investadvisor.portfolio.model.RiskProfile;
import com.investadvisor.portfolio.service.PortfolioService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Portfolio service không có Spring Security — controller sử dụng X-User-Id header
 * được inject bởi API Gateway sau khi xác thực JWT.
 */
@WebMvcTest(PortfolioController.class)
@DisplayName("PortfolioController Tests (MockMvc)")
class PortfolioControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean PortfolioService portfolioService;

    private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID PORTFOLIO_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    // ── GET /api/portfolios ───────────────────────────────────────────────────

    @Test
    @DisplayName("GET /: có portfolios → 200 + danh sách")
    void getMyPortfolios_returnsListOf200() throws Exception {
        PortfolioDto p1 = buildDto(PORTFOLIO_ID, "Conservative Portfolio");
        PortfolioDto p2 = buildDto(UUID.randomUUID(), "Growth Portfolio");
        when(portfolioService.getUserPortfolios(USER_ID)).thenReturn(List.of(p1, p2));

        mockMvc.perform(get("/api/portfolios")
                        .header("X-User-Id", USER_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Conservative Portfolio"));
    }

    @Test
    @DisplayName("GET /: thiếu header X-User-Id → 400 Bad Request")
    void getMyPortfolios_missingUserIdHeader_returns400() throws Exception {
        mockMvc.perform(get("/api/portfolios"))
                .andExpect(status().isBadRequest());
    }

    // ── GET /api/portfolios/{portfolioId} ─────────────────────────────────────

    @Test
    @DisplayName("GET /{id}: portfolio thuộc user → 200 + PortfolioDto")
    void getPortfolio_validOwner_returns200() throws Exception {
        PortfolioDto dto = buildDto(PORTFOLIO_ID, "My Portfolio");
        when(portfolioService.getPortfolio(PORTFOLIO_ID, USER_ID)).thenReturn(dto);

        mockMvc.perform(get("/api/portfolios/{id}", PORTFOLIO_ID)
                        .header("X-User-Id", USER_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(PORTFOLIO_ID.toString()))
                .andExpect(jsonPath("$.name").value("My Portfolio"));
    }

    @Test
    @DisplayName("GET /{id}: portfolio không thuộc user → 404 Not Found")
    void getPortfolio_wrongOwner_returns404() throws Exception {
        when(portfolioService.getPortfolio(PORTFOLIO_ID, USER_ID))
                .thenThrow(new NoSuchElementException("Portfolio not found: " + PORTFOLIO_ID));

        mockMvc.perform(get("/api/portfolios/{id}", PORTFOLIO_ID)
                        .header("X-User-Id", USER_ID.toString()))
                .andExpect(status().isNotFound());
    }

    // ── POST /api/portfolios ──────────────────────────────────────────────────

    @Test
    @DisplayName("POST /: request hợp lệ → 201 + PortfolioDto")
    void createPortfolio_validRequest_returns201() throws Exception {
        CreatePortfolioRequest req = new CreatePortfolioRequest(
                "New Portfolio", "Conservative investment", RiskProfile.CONSERVATIVE);
        PortfolioDto created = buildDto(PORTFOLIO_ID, "New Portfolio");
        when(portfolioService.createPortfolio(eq(USER_ID), any())).thenReturn(created);

        mockMvc.perform(post("/api/portfolios")
                        .header("X-User-Id", USER_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("New Portfolio"));
    }

    @Test
    @DisplayName("POST /: thiếu tên portfolio → 400 Bad Request")
    void createPortfolio_missingName_returns400() throws Exception {
        String badBody = """
                {"description": "desc", "riskProfile": "MODERATE"}
                """;

        mockMvc.perform(post("/api/portfolios")
                        .header("X-User-Id", USER_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badBody))
                .andExpect(status().isBadRequest());
    }

    // ── POST /api/portfolios/{id}/stocks ─────────────────────────────────────

    @Test
    @DisplayName("POST /{id}/stocks: ticker mới → 200 + updated PortfolioDto")
    void addStock_newTicker_returns200() throws Exception {
        AddStockRequest req = new AddStockRequest("VNM", 100L, new BigDecimal("85000"));
        PortfolioDto updated = buildDto(PORTFOLIO_ID, "My Portfolio");
        when(portfolioService.addStock(eq(PORTFOLIO_ID), eq(USER_ID), any())).thenReturn(updated);

        mockMvc.perform(post("/api/portfolios/{id}/stocks", PORTFOLIO_ID)
                        .header("X-User-Id", USER_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /{id}/stocks: ticker trùng → 409 Conflict")
    void addStock_duplicateTicker_returns409() throws Exception {
        AddStockRequest req = new AddStockRequest("VCB", 10L, new BigDecimal("90000"));
        when(portfolioService.addStock(eq(PORTFOLIO_ID), eq(USER_ID), any()))
                .thenThrow(new IllegalArgumentException("Ticker already in portfolio: VCB"));

        mockMvc.perform(post("/api/portfolios/{id}/stocks", PORTFOLIO_ID)
                        .header("X-User-Id", USER_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict());
    }

    // ── DELETE /api/portfolios/{id}/stocks/{ticker} ───────────────────────────

    @Test
    @DisplayName("DELETE /{id}/stocks/{ticker}: xóa thành công → 200")
    void removeStock_existingTicker_returns200() throws Exception {
        PortfolioDto updated = buildDto(PORTFOLIO_ID, "My Portfolio");
        when(portfolioService.removeStock(PORTFOLIO_ID, USER_ID, "VNM")).thenReturn(updated);

        mockMvc.perform(delete("/api/portfolios/{id}/stocks/{ticker}", PORTFOLIO_ID, "VNM")
                        .header("X-User-Id", USER_ID.toString()))
                .andExpect(status().isOk());
    }

    // ── GET /api/portfolios/{id}/analytics ───────────────────────────────────

    @Test
    @DisplayName("GET /{id}/analytics: trả MPT/CAPM data → 200")
    void getAnalytics_returnsAnalyticsDto() throws Exception {
        PortfolioAnalyticsDto analytics = new PortfolioAnalyticsDto(
                0, 0, 0.15, 0.25, 0.6, 1.1, 0.03, List.of(), List.of());
        when(portfolioService.getPortfolioAnalytics(PORTFOLIO_ID, USER_ID)).thenReturn(analytics);

        mockMvc.perform(get("/api/portfolios/{id}/analytics", PORTFOLIO_ID)
                        .header("X-User-Id", USER_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expectedReturnAnnualPct").value(0.15))
                .andExpect(jsonPath("$.sharpeRatio").value(0.6));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private PortfolioDto buildDto(UUID id, String name) {
        return new PortfolioDto(id, USER_ID, name, "Description",
                RiskProfile.MODERATE, true, LocalDateTime.now(), List.of(), List.of());
    }
}
