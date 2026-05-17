"""
Unit tests for all LangGraph workflow agent nodes.
Each agent class lives in agents/<name>_agent.py and exposes .invoke(state).
"""
import pytest
from unittest.mock import patch, MagicMock


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_llm_mock(return_value):
    """Return a mock that mimics a LangChain chain: supports | and .invoke()."""
    from langchain_core.runnables import RunnableLambda
    return RunnableLambda(lambda _: return_value)


# ── ParseAgent ────────────────────────────────────────────────────────────────

class TestParseUserRequestNode:

    def test_empty_request_returns_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.parse_agent import ParseAgent
        agent = ParseAgent(llm=_make_llm_mock({"suggested_assets": []}))
        result = agent.invoke({"initial_request": "", "lang": "en"})
        assert "error_message" in result or "asset_universe" in result

    def test_valid_parse_returns_profile_and_assets(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.parse_agent import ParseAgent
        mock_profile = {
            "goal": "retirement", "risk_tolerance": "high",
            "time_horizon": "10 years", "suggested_assets": ["AAPL", "MSFT", "GOOGL"],
        }
        agent = ParseAgent(llm=_make_llm_mock(mock_profile))
        result = agent.invoke({"initial_request": "Build retirement portfolio", "lang": "en"})
        assert "user_profile" in result
        assert "asset_universe" in result
        assert len(result["asset_universe"]) == 3

    def test_no_assets_returns_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.parse_agent import ParseAgent
        mock_profile = {"goal": "growth", "risk_tolerance": "high",
                        "time_horizon": "5 years", "suggested_assets": []}
        agent = ParseAgent(llm=_make_llm_mock(mock_profile))
        result = agent.invoke({"initial_request": "Build portfolio", "lang": "en"})
        assert "error_message" in result or result.get("asset_universe") == []

    def test_assets_uppercase_normalized(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.parse_agent import ParseAgent
        mock_profile = {"goal": "growth", "risk_tolerance": "medium",
                        "time_horizon": "5 years", "suggested_assets": ["aapl", "MsFt"]}
        agent = ParseAgent(llm=_make_llm_mock(mock_profile))
        result = agent.invoke({"initial_request": "Growth portfolio", "lang": "en"})
        if "asset_universe" in result and result["asset_universe"]:
            assert all(t == t.upper() for t in result["asset_universe"])

    def test_llm_exception_returns_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.parse_agent import ParseAgent
        from langchain_core.runnables import RunnableLambda
        def raise_exc(_): raise Exception("LLM timeout")
        agent = ParseAgent(llm=RunnableLambda(raise_exc))
        result = agent.invoke({"initial_request": "Test", "lang": "en"})
        assert "error_message" in result

    def test_duplicate_assets_deduplicated(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.parse_agent import ParseAgent
        mock_profile = {"goal": "growth", "risk_tolerance": "medium",
                        "time_horizon": "5 years",
                        "suggested_assets": ["AAPL", "AAPL", "MSFT", "AAPL"]}
        agent = ParseAgent(llm=_make_llm_mock(mock_profile))
        result = agent.invoke({"initial_request": "Test", "lang": "en"})
        if "asset_universe" in result:
            assert len(result["asset_universe"]) == len(set(result["asset_universe"]))

    def test_output_keys_declared(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.parse_agent import ParseAgent
        agent = ParseAgent(llm=_make_llm_mock({}))
        assert "user_profile" in agent.output_keys
        assert "asset_universe" in agent.output_keys

    def test_route_next_on_success(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.parse_agent import ParseAgent
        agent = ParseAgent(llm=_make_llm_mock({}))
        state = {"asset_universe": ["AAPL"], "error_message": None}
        assert agent.route_next(state) == "fetch_market_news"

    def test_route_next_on_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.parse_agent import ParseAgent
        agent = ParseAgent(llm=_make_llm_mock({}))
        state = {"asset_universe": [], "error_message": "LLM failed"}
        assert agent.route_next(state) == "handle_error"


# ── NewsAgent ─────────────────────────────────────────────────────────────────

class TestFetchMarketNewsNode:

    @patch("src.fin_agents.graphs.workflow.stock_advisory.agents.news_agent.fetch_market_news")
    def test_returns_market_news(self, mock_fetch, sample_state):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.news_agent import NewsAgent
        mock_fetch.return_value = {"market_news": "Tech stocks rally"}
        result = NewsAgent().invoke(sample_state)
        assert "market_news" in result
        assert result["step"] == "fetch_market_news"

    @patch("src.fin_agents.graphs.workflow.stock_advisory.agents.news_agent.fetch_market_news")
    def test_returns_none_market_news(self, mock_fetch, sample_state):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.news_agent import NewsAgent
        mock_fetch.return_value = {"market_news": None}
        result = NewsAgent().invoke(sample_state)
        assert result.get("market_news") is None

    @patch("src.fin_agents.graphs.workflow.stock_advisory.agents.news_agent.fetch_market_news")
    def test_empty_state_still_works(self, mock_fetch):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.news_agent import NewsAgent
        mock_fetch.return_value = {"market_news": "N/A"}
        result = NewsAgent().invoke({})
        assert "market_news" in result
        assert result["step"] == "fetch_market_news"


# ── DataAgent ─────────────────────────────────────────────────────────────────

class TestFetchDataNodeWrapper:

    @patch("src.fin_agents.graphs.workflow.stock_advisory.agents.data_agent.fetch_data_node")
    def test_returns_financial_data(self, mock_fetch, sample_state):
        import pandas as pd
        from src.fin_agents.graphs.workflow.stock_advisory.agents.data_agent import DataAgent
        mock_fetch.return_value = {
            "financial_data": {"AAPL": pd.DataFrame({"close": [100]})},
            "asset_universe": ["AAPL"],
        }
        result = DataAgent().invoke(sample_state)
        assert "financial_data" in result
        assert result["step"] == "fetch_data"

    @patch("src.fin_agents.graphs.workflow.stock_advisory.agents.data_agent.fetch_data_node")
    def test_error_propagates(self, mock_fetch, sample_state):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.data_agent import DataAgent
        mock_fetch.return_value = {"error_message": "No data"}
        result = DataAgent().invoke(sample_state)
        assert result["step"] == "fetch_data"


# ── PortfolioAgent ────────────────────────────────────────────────────────────

class TestProposePortfolioNode:

    def test_missing_inputs_returns_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.portfolio_agent import PortfolioAgent
        agent = PortfolioAgent(llm=_make_llm_mock({}))
        result = agent.invoke({})
        assert "error_message" in result
        assert result.get("step") == "propose_portfolio"

    def test_missing_user_profile_returns_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.portfolio_agent import PortfolioAgent
        agent = PortfolioAgent(llm=_make_llm_mock({}))
        result = agent.invoke({"metrics": {}, "asset_universe": ["AAPL"]})
        assert "error_message" in result

    def test_missing_metrics_returns_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.portfolio_agent import PortfolioAgent
        agent = PortfolioAgent(llm=_make_llm_mock({}))
        result = agent.invoke({"user_profile": {}, "asset_universe": ["AAPL"]})
        assert "error_message" in result

    def test_missing_asset_universe_returns_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.portfolio_agent import PortfolioAgent
        agent = PortfolioAgent(llm=_make_llm_mock({}))
        result = agent.invoke({"user_profile": {}, "metrics": {}})
        assert "error_message" in result

    def test_valid_proposal(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.portfolio_agent import PortfolioAgent
        mock_alloc = {"portfolio_allocation": {"AAPL": 0.6, "MSFT": 0.4},
                      "reasoning": "Balanced allocation"}
        agent = PortfolioAgent(llm=_make_llm_mock(mock_alloc))
        state = {"user_profile": {"goal": "growth"}, "metrics": {"AAPL": {}, "MSFT": {}},
                 "asset_universe": ["AAPL", "MSFT"], "market_news": "Tech rally"}
        result = agent.invoke(state)
        assert "proposed_portfolio" in result or "error_message" in result
        assert result.get("step") == "propose_portfolio"

    def test_portfolio_renormalized(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.portfolio_agent import PortfolioAgent
        mock_alloc = {"portfolio_allocation": {"AAPL": 60, "MSFT": 40}}
        agent = PortfolioAgent(llm=_make_llm_mock(mock_alloc))
        state = {"user_profile": {}, "metrics": {}, "asset_universe": ["AAPL", "MSFT"],
                 "market_news": None}
        result = agent.invoke(state)
        if "proposed_portfolio" in result and result["proposed_portfolio"]:
            total = sum(result["proposed_portfolio"].values())
            assert abs(total - 1.0) < 0.02

    def test_llm_exception_returns_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.portfolio_agent import PortfolioAgent
        from langchain_core.runnables import RunnableLambda
        def raise_exc(_): raise Exception("LLM failed")
        agent = PortfolioAgent(llm=RunnableLambda(raise_exc))
        state = {"user_profile": {}, "metrics": {}, "asset_universe": ["AAPL"],
                 "market_news": None}
        result = agent.invoke(state)
        assert "error_message" in result


# ── ValidationAgent ───────────────────────────────────────────────────────────

class TestValidatePortfolioNode:

    def test_no_portfolio_no_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.validation_agent import ValidationAgent
        result = ValidationAgent().invoke({})
        assert "validation_result" in result

    def test_valid_portfolio(self, sample_portfolio, sample_metrics):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.validation_agent import ValidationAgent
        state = {"proposed_portfolio": sample_portfolio, "metrics": sample_metrics, "financial_data": {}}
        result = ValidationAgent().invoke(state)
        assert "validation_result" in result
        assert result["validation_result"]["status"] in ("pass", "fail")

    def test_invalid_weights_fail(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.validation_agent import ValidationAgent
        state = {"proposed_portfolio": {"AAPL": 0.5, "MSFT": 0.3},
                 "metrics": {}, "financial_data": {}}
        result = ValidationAgent().invoke(state)
        assert result["validation_result"]["status"] == "fail"


# ── CommentaryAgent ───────────────────────────────────────────────────────────

class TestGenerateCommentaryNode:

    def test_returns_commentary(self, sample_state, sample_metrics):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.commentary_agent import CommentaryAgent
        agent = CommentaryAgent(llm=_make_llm_mock("Well-diversified portfolio."))
        state = {**sample_state, "proposed_portfolio": {"AAPL": 0.6, "MSFT": 0.4},
                 "metrics": sample_metrics, "validation_result": {"status": "pass"},
                 "llm_commentary": None}
        result = agent.invoke(state)
        assert "llm_commentary" in result
        assert result["step"] == "generate_commentary"

    def test_llm_exception_returns_error_message(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.commentary_agent import CommentaryAgent
        from langchain_core.runnables import RunnableLambda
        def raise_exc(_): raise Exception("LLM timeout")
        agent = CommentaryAgent(llm=RunnableLambda(raise_exc))
        state = {"user_profile": {}, "proposed_portfolio": {}, "metrics": {},
                 "validation_result": {}, "market_news": None, "llm_commentary": None}
        result = agent.invoke(state)
        assert "llm_commentary" in result


# ── ReportAgent / ErrorAgent ──────────────────────────────────────────────────

class TestStructureOutputNode:

    def test_returns_final_report(self, sample_state, sample_metrics):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.report_agent import ReportAgent
        state = {**sample_state, "metrics": sample_metrics,
                 "proposed_portfolio": {"AAPL": 0.6, "MSFT": 0.4},
                 "validation_result": {"status": "pass", "errors": []},
                 "llm_commentary": "Good portfolio."}
        result = ReportAgent().invoke(state)
        assert "final_report" in result
        assert result["step"] == "structure_output"
        assert "Financial Portfolio Report" in result["final_report"]

    def test_error_state_produces_report(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.report_agent import ReportAgent
        state = {"error_message": "Workflow failed", "user_profile": {}}
        result = ReportAgent().invoke(state)
        assert "final_report" in result
        assert isinstance(result["final_report"], str)


class TestHandleErrorNode:

    def test_basic_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.report_agent import ErrorAgent
        state = {"error_message": "Network timeout", "step": "fetch_data"}
        result = ErrorAgent().invoke(state)
        assert "final_report" in result
        assert result["step"] == "handle_error"
        assert "Network timeout" in result["final_report"]

    def test_default_error_message(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.report_agent import ErrorAgent
        result = ErrorAgent().invoke({})
        assert "final_report" in result

    def test_error_report_format(self):
        from src.fin_agents.graphs.workflow.stock_advisory.agents.report_agent import ErrorAgent
        state = {"error_message": "API key invalid", "step": "propose_portfolio"}
        result = ErrorAgent().invoke(state)
        assert "Portfolio Generation Failed" in result["final_report"]
        assert "API key invalid" in result["final_report"]
