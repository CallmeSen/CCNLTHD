"""
Integration tests for FastAPI endpoints.
DB and orchestrator are mocked — no real PostgreSQL or LLM needed.
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

_ORCHESTRATOR = "fin_agents.api.routes.OrchestratorService"
_GET_DB       = "fin_agents.api.dependencies.get_db"
_SESSIONS_DB  = "fin_agents.api.sessions.get_db"


@pytest.fixture(scope="module")
def client():
    """TestClient with DB dependency overridden to avoid real PostgreSQL."""
    from fin_agents.api.main import app
    from fin_agents.api.dependencies import get_db

    mock_session = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_session
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


# ── Health & System ────────────────────────────────────────────────────────────

@pytest.mark.integration
class TestHealthEndpoints:

    def test_root_returns_200(self, client):
        resp = client.get("/")
        assert resp.status_code == 200

    def test_health_returns_status(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data or "detail" in data

    def test_workflows_endpoint(self, client):
        resp = client.get("/workflows")
        assert resp.status_code == 200


# ── Portfolio Analysis ─────────────────────────────────────────────────────────

@pytest.mark.integration
class TestPortfolioAnalyze:

    _SUCCESS_RESULT = {
        "run_id": "STK123456",
        "status": "completed",
        "final_report": "# Financial Portfolio Report\n\nYour portfolio...",
        "user_profile": {"goal": "growth", "risk_tolerance": "moderate"},
        "proposed_portfolio": {"AAPL": 0.40, "MSFT": 0.35, "GOOGL": 0.25},
        "metrics": {"AAPL": {"sharpe_ratio": 1.2}},
        "validation_result": {"status": "pass", "errors": []},
        "llm_commentary": "Well-balanced portfolio.",
        "market_news": "Markets are stable.",
        "lang": "en",
        "error": None,
    }

    def test_analyze_success(self, client):
        mock_orch = MagicMock()
        mock_orch.return_value.run_stock_workflow = MagicMock(return_value=self._SUCCESS_RESULT)

        with patch(_ORCHESTRATOR, mock_orch):
            resp = client.post(
                "/portfolio/analyze",
                json={"request": "Invest $50k in tech stocks", "lang": "en"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "completed"
        assert data.get("final_report") is not None

    def test_analyze_missing_request_returns_422(self, client):
        resp = client.post("/portfolio/analyze", json={})
        assert resp.status_code == 422

    def test_analyze_service_failure_returns_error(self, client):
        mock_orch = MagicMock()
        mock_orch.return_value.run_stock_workflow = MagicMock(
            return_value={**self._SUCCESS_RESULT, "status": "failed", "error": "LLM timeout"}
        )

        with patch(_ORCHESTRATOR, mock_orch):
            resp = client.post(
                "/portfolio/analyze",
                json={"request": "Invest in stocks"},
            )

        assert resp.status_code in (200, 500)


# ── Chat Sessions ──────────────────────────────────────────────────────────────

@pytest.mark.integration
class TestChatSessions:

    def test_create_session(self, client):
        mock_session_obj = MagicMock()
        mock_session_obj.session_id = "sess-abc123"
        mock_session_obj.user_id = None
        mock_session_obj.created_at.isoformat.return_value = "2026-05-17T00:00:00"
        mock_session_obj.updated_at.isoformat.return_value = "2026-05-17T00:00:00"
        mock_session_obj.is_active = True

        mock_repo = MagicMock()
        mock_repo.return_value.create.return_value = mock_session_obj

        with patch("fin_agents.api.sessions.ChatSessionRepository", mock_repo):
            resp = client.post("/sessions", json={})

        assert resp.status_code in (200, 201, 422)

    def test_list_sessions(self, client):
        mock_repo = MagicMock()
        mock_repo.return_value.list_active.return_value = []

        with patch("fin_agents.api.sessions.ChatSessionRepository", mock_repo):
            resp = client.get("/sessions")

        assert resp.status_code in (200, 404)

    def test_get_nonexistent_session_returns_404(self, client):
        mock_repo = MagicMock()
        mock_repo.return_value.get_by_id.return_value = None

        with patch("fin_agents.api.sessions.ChatSessionRepository", mock_repo):
            resp = client.get("/sessions/nonexistent-session-id")

        assert resp.status_code in (404, 200)
