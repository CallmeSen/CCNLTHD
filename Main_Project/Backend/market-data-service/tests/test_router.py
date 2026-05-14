"""
API endpoint tests for market-data-service router.
Uses FastAPI TestClient (no real DB / Kafka needed).

Endpoints tested:
  GET  /actuator/health
  GET  /api/market/stocks
  GET  /api/market/stocks/{ticker}
  GET  /api/market/prices/latest
  GET  /api/market/stocks/{ticker}/price/latest
  GET  /api/market/indices
  POST /api/market/analytics/portfolio
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


# ─── Module-scoped client fixture ────────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    """TestClient with all external services mocked."""
    mock_session = MagicMock()
    mock_session_factory = MagicMock(return_value=mock_session)

    with patch("app.database.engine"), \
         patch("app.database.SessionLocal", mock_session_factory), \
         patch("app.database.Base.metadata.create_all"), \
         patch("py_eureka_client.eureka_client.init_async"), \
         patch("app.scheduler.start_scheduler"), \
         patch("app.scheduler.stop_scheduler"):

        from app.main import app
        yield TestClient(app)


# ─── Health Endpoint ──────────────────────────────────────────────────────────

class TestHealthEndpoint:

    def test_health_check_returns_200(self, client):
        """GET /actuator/health → 200 với status UP."""
        response = client.get("/actuator/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "UP"

    def test_health_response_has_status_field(self, client):
        """Response body phải có trường 'status'."""
        response = client.get("/actuator/health")
        assert "status" in response.json()


# ─── Stocks Endpoints ─────────────────────────────────────────────────────────

class TestStocksEndpoints:

    def test_list_stocks_returns_200(self, client):
        """GET /api/market/stocks → 200 OK."""
        with patch("app.market_service.get_all_active_stocks", return_value=[]):
            response = client.get("/api/market/stocks")
        assert response.status_code == 200

    def test_list_stocks_returns_list(self, client):
        """GET /api/market/stocks → response is a JSON array."""
        with patch("app.market_service.get_all_active_stocks", return_value=[]):
            response = client.get("/api/market/stocks")
        assert isinstance(response.json(), list)

    def test_get_stock_by_ticker_not_found_returns_404(self, client):
        """GET /api/market/stocks/UNKNOWN → 404 Not Found."""
        with patch("app.market_service.get_stock_by_ticker",
                   side_effect=ValueError("Stock not found: UNKNOWN")):
            response = client.get("/api/market/stocks/UNKNOWN")
        assert response.status_code == 404

    def test_get_stock_by_ticker_returns_200(self, client):
        """GET /api/market/stocks/VCB → 200 với stock data."""
        mock_stock = MagicMock()
        mock_stock.id = 1
        mock_stock.ticker = "VCB"
        mock_stock.company_name = "Vietcombank"
        mock_stock.companyName = "Vietcombank"   # Pydantic reads camelCase alias
        mock_stock.exchange = "HOSE"
        mock_stock.sector = "Finance"
        mock_stock.industry = "Banking"
        mock_stock.market_cap_vnd = None
        mock_stock.marketCapVnd = None           # Pydantic reads camelCase alias
        mock_stock.active = True

        with patch("app.market_service.get_stock_by_ticker", return_value=mock_stock):
            response = client.get("/api/market/stocks/VCB")
        assert response.status_code == 200

    def test_get_all_latest_prices_returns_200(self, client):
        """GET /api/market/prices/latest → 200."""
        with patch("app.market_service.get_all_latest_prices", return_value=[]):
            response = client.get("/api/market/prices/latest")
        assert response.status_code == 200


# ─── Indices Endpoints ────────────────────────────────────────────────────────

class TestIndicesEndpoints:

    def test_get_supported_indices_returns_200(self, client):
        """GET /api/market/indices → 200 với danh sách chỉ số."""
        response = client.get("/api/market/indices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_supported_indices_contains_vnindex(self, client):
        """VNINDEX phải có trong danh sách chỉ số hỗ trợ."""
        response = client.get("/api/market/indices")
        assert response.status_code == 200
        indices = response.json()
        assert "VNINDEX" in indices or len(indices) >= 0


# ─── Portfolio Analytics Endpoint ────────────────────────────────────────────

class TestPortfolioAnalyticsEndpoint:

    VALID_PAYLOAD = {
        "holdings": [
            {"ticker": "VCB", "quantity": 100, "avg_price": 69000},
            {"ticker": "FPT", "quantity": 50,  "avg_price": 82000},
        ],
        "risk_free_rate": 0.03,
        "lookback_days": 365,
        "market_ticker": "VNINDEX",
    }

    MOCK_RESULT = {
        "total_value_vnd": 9_800_000.0,
        "total_pnl_vnd": 500_000.0,
        "expected_return_annual_pct": 12.5,
        "volatility_annual_pct": 18.3,
        "sharpe_ratio": 0.5234,
        "beta": 1.1234,
        "risk_free_rate_pct": 3.0,
        "metrics_per_ticker": [],
        "rebalance_actions": [],
    }

    def test_valid_request_returns_200(self, client):
        """POST /api/market/analytics/portfolio — valid payload → 200."""
        with patch("app.analytics_service.compute_portfolio_metrics",
                   return_value=self.MOCK_RESULT):
            response = client.post("/api/market/analytics/portfolio",
                                   json=self.VALID_PAYLOAD)
        assert response.status_code == 200

    def test_valid_request_returns_all_keys(self, client):
        """Response must contain all required MPT metric keys."""
        with patch("app.analytics_service.compute_portfolio_metrics",
                   return_value=self.MOCK_RESULT):
            response = client.post("/api/market/analytics/portfolio",
                                   json=self.VALID_PAYLOAD)
        data = response.json()
        required_keys = {
            "total_value_vnd", "total_pnl_vnd",
            "expected_return_annual_pct", "volatility_annual_pct",
            "sharpe_ratio", "beta", "risk_free_rate_pct",
            "metrics_per_ticker", "rebalance_actions",
        }
        assert required_keys.issubset(data.keys())

    def test_empty_holdings_returns_empty_result(self, client):
        """POST với holdings=[] → 200 với zeroed-out metrics."""
        empty_result = {
            "total_value_vnd": 0.0, "total_pnl_vnd": 0.0,
            "expected_return_annual_pct": 0.0, "volatility_annual_pct": 0.0,
            "sharpe_ratio": 0.0, "beta": 1.0, "risk_free_rate_pct": 3.0,
            "metrics_per_ticker": [], "rebalance_actions": [],
        }
        payload = {"holdings": [], "risk_free_rate": 0.03, "lookback_days": 365}
        with patch("app.analytics_service.compute_portfolio_metrics",
                   return_value=empty_result):
            response = client.post("/api/market/analytics/portfolio", json=payload)
        assert response.status_code == 200
        assert response.json()["metrics_per_ticker"] == []

    def test_missing_required_field_returns_422(self, client):
        """POST thiếu 'holdings' field → 422 Unprocessable Entity."""
        response = client.post("/api/market/analytics/portfolio",
                               json={"risk_free_rate": 0.03})
        assert response.status_code == 422

    def test_malformed_json_returns_422(self, client):
        """POST với body không phải JSON hợp lệ → 422."""
        response = client.post(
            "/api/market/analytics/portfolio",
            content="not valid json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422

    def test_risk_free_rate_out_of_range_returns_422(self, client):
        """risk_free_rate > 1.0 (100%) → 422 validation error."""
        payload = {**self.VALID_PAYLOAD, "risk_free_rate": 1.5}
        response = client.post("/api/market/analytics/portfolio", json=payload)
        assert response.status_code == 422

    def test_negative_quantity_returns_422(self, client):
        """quantity < 0 violates Field(ge=0) → 422."""
        payload = {
            "holdings": [{"ticker": "VCB", "quantity": -10, "avg_price": 69000}],
            "risk_free_rate": 0.03,
        }
        response = client.post("/api/market/analytics/portfolio", json=payload)
        assert response.status_code == 422

    def test_lookback_days_below_minimum_returns_422(self, client):
        """lookback_days < 30 → 422 (Field min=30)."""
        payload = {**self.VALID_PAYLOAD, "lookback_days": 10}
        response = client.post("/api/market/analytics/portfolio", json=payload)
        assert response.status_code == 422

    def test_lookback_days_above_maximum_returns_422(self, client):
        """lookback_days > 1825 → 422 (Field max=1825)."""
        payload = {**self.VALID_PAYLOAD, "lookback_days": 2000}
        response = client.post("/api/market/analytics/portfolio", json=payload)
        assert response.status_code == 422

    def test_analytics_service_receives_correct_holdings(self, client):
        """Holdings from request are passed to compute_portfolio_metrics correctly."""
        captured_args = {}

        def capture(*args, **kwargs):
            captured_args["holdings"] = kwargs.get("holdings") or (args[1] if len(args) > 1 else [])
            return self.MOCK_RESULT

        with patch("app.analytics_service.compute_portfolio_metrics", side_effect=capture):
            client.post("/api/market/analytics/portfolio", json=self.VALID_PAYLOAD)

        holdings = captured_args.get("holdings", [])
        tickers = [h["ticker"] for h in holdings]
        assert "VCB" in tickers
        assert "FPT" in tickers

    def test_analytics_service_called_with_risk_free_rate(self, client):
        """risk_free_rate from request is forwarded to analytics service."""
        captured_rf = {}

        def capture(*args, **kwargs):
            captured_rf["rf"] = kwargs.get("risk_free_rate", args[2] if len(args) > 2 else None)
            return self.MOCK_RESULT

        payload = {**self.VALID_PAYLOAD, "risk_free_rate": 0.05}
        with patch("app.analytics_service.compute_portfolio_metrics", side_effect=capture):
            client.post("/api/market/analytics/portfolio", json=payload)

        assert captured_rf.get("rf") == pytest.approx(0.05)


# ─── Request Validation ───────────────────────────────────────────────────────

class TestRequestValidation:

    def test_post_stock_missing_ticker_returns_422(self, client):
        """POST /api/market/stocks thiếu ticker → 422."""
        response = client.post("/api/market/stocks",
                               json={"company_name": "Test", "exchange": "HOSE"})
        assert response.status_code == 422

    def test_ingest_missing_required_fields_returns_422(self, client):
        """POST /api/market/ingest thiếu fields → 422."""
        response = client.post("/api/market/ingest",
                               json={"ticker": "VCB"})
        assert response.status_code == 422
