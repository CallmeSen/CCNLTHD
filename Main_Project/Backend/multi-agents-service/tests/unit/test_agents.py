"""
Unit tests for individual agent class instances.
LLM calls are mocked — no real API keys needed.
"""
import json
import pytest
from unittest.mock import MagicMock, patch
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableLambda

from src.fin_agents.agents.parse_agent import ParseAgent
from src.fin_agents.agents.portfolio_agent import PortfolioAgent
from src.fin_agents.agents.validation_agent import ValidationAgent
from src.fin_agents.agents.metrics_agent import MetricsAgent

_PARSE_LLM      = "src.fin_agents.agents.parse_agent.get_shared_llm"
_PORTFOLIO_LLM  = "src.fin_agents.agents.portfolio_agent.get_shared_llm"


def _fake_json_llm(response_dict: dict) -> RunnableLambda:
    """LangChain-compatible fake LLM — returns fixed JSON as AIMessage."""
    def _invoke(messages, **kwargs):
        return AIMessage(content=json.dumps(response_dict))
    return RunnableLambda(_invoke)


# ── ParseAgent ─────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestParseAgent:
    _PROFILE = {
        "goal": "long_term_growth",
        "risk_tolerance": "moderate",
        "time_horizon": "5 years",
        "initial_capital": 50000,
        "preferences": "technology stocks",
        "specific_preferences": None,
        "suggested_assets": ["AAPL", "MSFT", "GOOGL"],
        "start_date": None,
        "end_date": None,
    }

    def test_valid_english_request(self):
        with patch(_PARSE_LLM, return_value=_fake_json_llm(self._PROFILE)):
            result = ParseAgent().invoke({"initial_request": "Invest $50k in tech", "lang": "en"})
        assert "user_profile" in result
        assert "asset_universe" in result
        assert result["user_profile"]["risk_tolerance"] == "moderate"

    def test_valid_vietnamese_request(self):
        vi_profile = {**self._PROFILE, "suggested_assets": ["VCB", "FPT", "HPG"]}
        with patch(_PARSE_LLM, return_value=_fake_json_llm(vi_profile)):
            result = ParseAgent().invoke({
                "initial_request": "Tôi muốn đầu tư 100 triệu vào cổ phiếu Việt Nam",
                "lang": "vi",
            })
        assert "user_profile" in result
        assert result.get("error_message") is None

    def test_empty_request_returns_error(self):
        with patch(_PARSE_LLM, return_value=_fake_json_llm({})):
            result = ParseAgent().invoke({"initial_request": "", "lang": "en"})
        assert result.get("error_message") is not None

    def test_tickers_are_uppercased(self):
        profile = {**self._PROFILE, "suggested_assets": ["aapl", "msft"]}
        with patch(_PARSE_LLM, return_value=_fake_json_llm(profile)):
            result = ParseAgent().invoke({"initial_request": "Invest", "lang": "en"})
        for ticker in result.get("asset_universe", []):
            assert ticker == ticker.upper()

    def test_route_next_on_success(self):
        state = {"asset_universe": ["AAPL", "MSFT"], "error_message": None}
        assert ParseAgent(llm=MagicMock()).route_next(state) == "fetch_market_news"

    def test_route_next_on_empty_assets(self):
        state = {"asset_universe": [], "error_message": None}
        assert ParseAgent(llm=MagicMock()).route_next(state) == "handle_error"

    def test_route_next_on_error(self):
        state = {"asset_universe": [], "error_message": "LLM failed"}
        assert ParseAgent(llm=MagicMock()).route_next(state) == "handle_error"

    def test_output_keys_declared(self):
        keys = ParseAgent(llm=MagicMock()).output_keys
        assert "user_profile" in keys
        assert "asset_universe" in keys


# ── PortfolioAgent ─────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestPortfolioAgent:
    _ALLOCATION = {
        "portfolio_allocation": {"AAPL": 0.40, "MSFT": 0.35, "GOOGL": 0.25},
        "reasoning": "Balanced tech portfolio.",
    }

    def _state(self):
        return {
            "user_profile": {"goal": "growth", "risk_tolerance": "moderate"},
            "asset_universe": ["AAPL", "MSFT", "GOOGL"],
            "metrics": {
                "AAPL": {"sharpe_ratio": 1.2, "capm_expected_return": 0.10},
                "MSFT": {"sharpe_ratio": 1.5, "capm_expected_return": 0.11},
                "GOOGL": {"sharpe_ratio": 0.9, "capm_expected_return": 0.09},
            },
            "market_news": "Markets are stable.",
            "lang": "en",
        }

    def test_valid_allocation_weights_sum_to_one(self):
        with patch(_PORTFOLIO_LLM, return_value=_fake_json_llm(self._ALLOCATION)):
            result = PortfolioAgent().invoke(self._state())
        weights = result.get("proposed_portfolio", {})
        assert abs(sum(weights.values()) - 1.0) < 0.02

    def test_unknown_tickers_filtered_out(self):
        alloc = {"portfolio_allocation": {"AAPL": 0.5, "UNKNOWN_XYZ": 0.5}, "reasoning": "..."}
        with patch(_PORTFOLIO_LLM, return_value=_fake_json_llm(alloc)):
            result = PortfolioAgent().invoke(self._state())
        assert "UNKNOWN_XYZ" not in result.get("proposed_portfolio", {})

    def test_unnormalized_weights_renormalized(self):
        alloc = {"portfolio_allocation": {"AAPL": 60.0, "MSFT": 40.0}, "reasoning": "..."}
        with patch(_PORTFOLIO_LLM, return_value=_fake_json_llm(alloc)):
            result = PortfolioAgent().invoke(self._state())
        weights = result.get("proposed_portfolio", {})
        if weights:
            assert abs(sum(weights.values()) - 1.0) < 0.02

    def test_missing_user_profile_returns_error(self):
        state = self._state()
        del state["user_profile"]
        with patch(_PORTFOLIO_LLM, return_value=_fake_json_llm(self._ALLOCATION)):
            result = PortfolioAgent().invoke(state)
        assert result.get("error_message") is not None

    def test_route_next_on_success(self):
        state = {"proposed_portfolio": {"AAPL": 1.0}, "error_message": None}
        assert PortfolioAgent(llm=MagicMock()).route_next(state) == "validate_portfolio"

    def test_route_next_on_error(self):
        state = {"proposed_portfolio": None, "error_message": "LLM error"}
        assert PortfolioAgent(llm=MagicMock()).route_next(state) == "handle_error"


# ── ValidationAgent ────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestValidationAgent:

    def test_valid_portfolio_passes(self, sample_financial_data, sample_metrics):
        state = {
            "proposed_portfolio": {"AAPL": 0.40, "MSFT": 0.35, "GOOGL": 0.25},
            "metrics": sample_metrics,
            "financial_data": sample_financial_data,
        }
        result = ValidationAgent().invoke(state)
        assert result.get("validation_result", {}).get("status", "").lower() == "pass"

    def test_invalid_weights_fails(self, sample_metrics, sample_financial_data):
        state = {
            "proposed_portfolio": {"AAPL": 0.10, "MSFT": 0.10},  # sum = 0.20
            "metrics": sample_metrics,
            "financial_data": sample_financial_data,
        }
        result = ValidationAgent().invoke(state)
        assert result.get("validation_result", {}).get("status", "").lower() == "fail"

    def test_no_portfolio_completes_without_error(self):
        result = ValidationAgent().invoke({"proposed_portfolio": None, "metrics": {}, "financial_data": {}})
        assert "step" in result

    def test_route_next_pass(self):
        state = {"validation_result": {"status": "pass"}, "error_message": None}
        assert ValidationAgent().route_next(state) == "generate_commentary"

    def test_route_next_fail(self):
        state = {
            "validation_result": {"status": "fail", "errors": ["Bad weights"]},
            "error_message": None,
        }
        assert ValidationAgent().route_next(state) == "handle_error"


# ── MetricsAgent ───────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestMetricsAgent:

    def test_valid_data_produces_metrics(self, sample_financial_data):
        result = MetricsAgent().invoke({"financial_data": sample_financial_data})
        assert "metrics" in result
        assert result.get("error_message") is None

    def test_missing_data_returns_error(self):
        result = MetricsAgent().invoke({"financial_data": {}})
        assert result.get("error_message") is not None

    def test_metrics_contains_individual_assets(self, sample_financial_data):
        result = MetricsAgent().invoke({"financial_data": sample_financial_data})
        non_portfolio = [k for k in result.get("metrics", {}) if k != "portfolio"]
        assert len(non_portfolio) > 0

    def test_route_next_on_success(self, sample_financial_data):
        result = MetricsAgent().invoke({"financial_data": sample_financial_data})
        assert MetricsAgent().route_next(result) == "propose_portfolio"

    def test_route_next_on_error(self):
        result = MetricsAgent().invoke({"financial_data": {}})
        assert MetricsAgent().route_next(result) == "handle_error"
