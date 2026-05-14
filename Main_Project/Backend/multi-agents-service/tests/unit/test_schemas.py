"""
Unit tests for Pydantic schemas used throughout the API.
"""
import pytest
from pydantic import ValidationError
from src.fin_agents.api.schemas import (
    HealthCheck,
    HistoryItem,
    StockAnalyzeRequest,
    StockAnalyzeResponse,
)


class TestHealthCheck:
    def test_valid_health_check(self):
        hc = HealthCheck(
            status="healthy",
            service="Financial Advisor API",
            version="0.1.0",
            timestamp="2026-04-28T00:00:00",
        )
        assert hc.status == "healthy"
        assert hc.service == "Financial Advisor API"

    def test_health_check_with_database(self):
        hc = HealthCheck(
            status="healthy",
            service="Financial Advisor API",
            version="0.1.0",
            timestamp="2026-04-28T00:00:00",
            database="connected",
        )
        assert hc.database == "connected"

    def test_health_check_missing_required(self):
        with pytest.raises(ValidationError):
            HealthCheck(status="healthy")  # missing required fields


class TestStockAnalyzeRequest:
    def test_valid_request(self):
        req = StockAnalyzeRequest(request="Build a retirement portfolio")
        assert req.request == "Build a retirement portfolio"
        assert req.lang == "en"  # default

    def test_request_with_vietnamese_lang(self):
        req = StockAnalyzeRequest(request="Xây dựng danh mục", lang="vi")
        assert req.lang == "vi"

    def test_request_empty_string_invalid(self):
        req = StockAnalyzeRequest(request="")
        assert req.request == ""  # Pydantic v2 accepts empty string unless min_length is set

    def test_request_missing_field(self):
        with pytest.raises(ValidationError):
            StockAnalyzeRequest()  # request is required

    def test_request_whitespace_only_invalid(self):
        req = StockAnalyzeRequest(request="   ")
        assert req.request == "   "  # Pydantic v2 accepts whitespace by default

    def test_request_max_length(self):
        long_request = "A" * 10000
        req = StockAnalyzeRequest(request=long_request)
        assert len(req.request) == 10000


class TestStockAnalyzeResponse:
    def test_complete_response(self):
        resp = StockAnalyzeResponse(
            run_id="STK20260428001",
            status="completed",
            final_report="# Report\nContent",
            user_profile={"goal": "retirement"},
            proposed_portfolio={"AAPL": 0.5, "MSFT": 0.5},
            metrics={"portfolio": {"sharpe_ratio": 0.5}},
            validation_result={"status": "pass"},
        )
        assert resp.status == "completed"
        assert resp.run_id == "STK20260428001"
        assert resp.error is None

    def test_response_with_error(self):
        resp = StockAnalyzeResponse(
            run_id="STK20260428001",
            status="failed",
            error="Network timeout",
        )
        assert resp.status == "failed"
        assert "Network timeout" in resp.error

    def test_response_minimal(self):
        resp = StockAnalyzeResponse(run_id="STK001", status="completed")
        assert resp.final_report is None
        assert resp.user_profile is None
        assert resp.proposed_portfolio is None

    def test_response_partial_data(self):
        resp = StockAnalyzeResponse(
            run_id="STK001",
            status="completed",
            user_profile={"goal": "growth"},
            metrics={},
        )
        assert resp.user_profile["goal"] == "growth"
        assert resp.final_report is None


class TestHistoryItem:
    def test_valid_history_item(self):
        item = HistoryItem(
            run_id="STK001",
            timestamp="2026-04-28T00:00:00",
            request="Build portfolio",
            status="COMPLETED",
        )
        assert item.run_id == "STK001"
        assert item.portfolio is None  # optional

    def test_history_item_with_portfolio(self):
        item = HistoryItem(
            run_id="STK001",
            timestamp="2026-04-28T00:00:00",
            request="Build portfolio",
            status="COMPLETED",
            portfolio={"AAPL": 0.6, "MSFT": 0.4},
        )
        assert item.portfolio is not None
        assert item.portfolio["AAPL"] == 0.6

    def test_history_item_failed(self):
        item = HistoryItem(
            run_id="STK002",
            timestamp="2026-04-28T00:00:00",
            request="Build portfolio",
            status="FAILED",
        )
        assert item.status == "FAILED"
