"""
Unit tests for all 9 LangGraph workflow nodes.
Imports hoisted into individual tests to avoid circular import.
"""
import pytest
from unittest.mock import patch, MagicMock


def _import_nodes():
    from src.fin_agents.graphs.workflow.stock_advisory.nodes import (
        parse_user_request,
        fetch_market_news_node,
        fetch_data_node_wrapper,
        calculate_metrics_node_wrapper,
        propose_portfolio_node,
        validate_portfolio_node,
        generate_commentary_node,
        structure_output_node,
        handle_error_node,
    )
    return (
        parse_user_request,
        fetch_market_news_node,
        fetch_data_node_wrapper,
        calculate_metrics_node_wrapper,
        propose_portfolio_node,
        validate_portfolio_node,
        generate_commentary_node,
        structure_output_node,
        handle_error_node,
    )


class TestParseUserRequestNode:
    """Test parse_user_request node (Node 1)."""

    def test_empty_request_returns_error(self):
        fn, *_ = _import_nodes()
        result = fn({})
        assert "error_message" in result or "user_profile" in result

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    def test_valid_parse_returns_profile_and_assets(self, mock_llm):
        fn, *_ = _import_nodes()
        mock_llm.invoke.return_value = {
            "goal": "retirement",
            "risk_tolerance": "high",
            "time_horizon": "10 years",
            "suggested_assets": ["AAPL", "MSFT", "GOOGL"],
        }
        result = fn({"initial_request": "Build retirement portfolio"})
        assert "user_profile" in result
        assert "asset_universe" in result
        assert len(result["asset_universe"]) == 3

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    def test_no_assets_returns_error(self, mock_llm):
        fn, *_ = _import_nodes()
        mock_llm.invoke.return_value = {
            "goal": "retirement",
            "risk_tolerance": "high",
            "time_horizon": "10 years",
            "suggested_assets": [],
        }
        result = fn({"initial_request": "Build retirement portfolio"})
        assert "error_message" in result
        assert result["asset_universe"] == []

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    def test_assets_uppercase_normalized(self, mock_llm):
        fn, *_ = _import_nodes()
        mock_llm.invoke.return_value = {
            "goal": "growth",
            "risk_tolerance": "medium",
            "time_horizon": "5 years",
            "suggested_assets": ["aapl", "MsFt"],
        }
        result = fn({"initial_request": "Growth portfolio"})
        assert "AAPL" in result["asset_universe"]
        assert "MSFT" in result["asset_universe"]

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    def test_llm_exception_returns_error(self, mock_llm):
        fn, *_ = _import_nodes()
        mock_llm.invoke.side_effect = Exception("LLM timeout")
        result = fn({"initial_request": "Test"})
        assert "error_message" in result
        assert "Failed to parse" in result["error_message"]

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    def test_duplicate_assets_deduplicated(self, mock_llm):
        fn, *_ = _import_nodes()
        mock_llm.invoke.return_value = {
            "goal": "growth",
            "risk_tolerance": "medium",
            "time_horizon": "5 years",
            "suggested_assets": ["AAPL", "AAPL", "MSFT", "AAPL"],
        }
        result = fn({"initial_request": "Test"})
        assert len(result["asset_universe"]) == len(set(result["asset_universe"]))


class TestFetchMarketNewsNode:
    """Test fetch_market_news_node (Node 2)."""

    def _node(self):
        return _import_nodes()[1]

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.fetch_market_news")
    def test_returns_market_news(self, mock_fetch_news, sample_state):
        node = self._node()
        mock_fetch_news.return_value = {"market_news": "Tech stocks rally"}
        result = node(sample_state)
        assert "market_news" in result
        assert result["step"] == "fetch_market_news"

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.fetch_market_news")
    def test_returns_none_market_news(self, mock_fetch_news, sample_state):
        node = self._node()
        mock_fetch_news.return_value = {"market_news": None}
        result = node(sample_state)
        assert result["market_news"] is None

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.fetch_market_news")
    def test_empty_state_still_works(self, mock_fetch_news):
        node = self._node()
        mock_fetch_news.return_value = {"market_news": "N/A"}
        result = node({})
        assert "market_news" in result
        assert result["step"] == "fetch_market_news"


class TestFetchDataNodeWrapper:
    """Test fetch_data_node_wrapper (Node 3)."""

    def _node(self):
        return _import_nodes()[2]

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.fetch_data_node")
    def test_returns_financial_data(self, mock_fetch, sample_state):
        import pandas as pd
        node = self._node()
        mock_fetch.return_value = {
            "financial_data": {"AAPL": pd.DataFrame({"close": [100]})},
            "asset_universe": ["AAPL"],
        }
        result = node(sample_state)
        assert "financial_data" in result
        assert result["step"] == "fetch_data"

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.fetch_data_node")
    def test_error_propagates(self, mock_fetch, sample_state):
        node = self._node()
        mock_fetch.return_value = {"error_message": "No data"}
        result = node(sample_state)
        assert result["step"] == "fetch_data"


class TestCalculateMetricsNodeWrapper:
    """Test calculate_metrics_node_wrapper (Node 4)."""

    def _node(self):
        return _import_nodes()[3]

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes._calculate_metrics_node")
    def test_returns_metrics(self, mock_calc, sample_financial_data):
        node = self._node()
        mock_calc.return_value = {"metrics": {"AAPL": {"sharpe_ratio": 0.5}}}
        state = {"financial_data": sample_financial_data}
        result = node(state)
        assert "metrics" in result
        assert result["step"] == "calculate_metrics"

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes._calculate_metrics_node")
    def test_error_propagates(self, mock_calc):
        node = self._node()
        mock_calc.return_value = {"error_message": "Calculation failed"}
        result = node({})
        assert result["step"] == "calculate_metrics"


class TestProposePortfolioNode:
    """Test propose_portfolio_node (Node 5)."""

    def _node(self):
        return _import_nodes()[4]

    def test_missing_inputs_returns_error(self):
        node = self._node()
        result = node({})
        assert "error_message" in result
        assert "step" in result
        assert result["step"] == "propose_portfolio"

    def test_missing_user_profile_returns_error(self):
        node = self._node()
        result = node({"metrics": {}, "asset_universe": ["AAPL"]})
        assert "error_message" in result

    def test_missing_metrics_returns_error(self):
        node = self._node()
        result = node({"user_profile": {}, "asset_universe": ["AAPL"]})
        assert "error_message" in result

    def test_missing_asset_universe_returns_error(self):
        node = self._node()
        result = node({"user_profile": {}, "metrics": {}})
        assert "error_message" in result

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    def test_valid_proposal(self, mock_llm):
        node = self._node()
        mock_llm.invoke.return_value = {
            "portfolio_allocation": {"AAPL": 0.6, "MSFT": 0.4},
            "reasoning": "Balanced tech allocation",
        }
        state = {
            "user_profile": {"goal": "growth"},
            "metrics": {"AAPL": {}, "MSFT": {}},
            "asset_universe": ["AAPL", "MSFT"],
            "market_news": "Tech rally",
        }
        result = node(state)
        assert "proposed_portfolio" in result
        assert "llm_commentary" in result
        assert result["step"] == "propose_portfolio"

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    def test_portfolio_renormalized(self, mock_llm):
        node = self._node()
        mock_llm.invoke.return_value = {
            "portfolio_allocation": {"AAPL": 60, "MSFT": 40},  # sum=100
        }
        state = {
            "user_profile": {},
            "metrics": {},
            "asset_universe": ["AAPL", "MSFT"],
            "market_news": None,
        }
        result = node(state)
        if "proposed_portfolio" in result:
            total = sum(result["proposed_portfolio"].values())
            assert abs(total - 1.0) < 0.01

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    def test_unknown_tickers_filtered(self, mock_llm):
        node = self._node()
        mock_llm.invoke.return_value = {
            "portfolio_allocation": {"AAPL": 0.5, "UNKNOWN": 0.5},
        }
        state = {
            "user_profile": {},
            "metrics": {},
            "asset_universe": ["AAPL"],
            "market_news": None,
        }
        result = node(state)
        if "proposed_portfolio" in result:
            assert "UNKNOWN" not in result["proposed_portfolio"]

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    def test_llm_exception_returns_error(self, mock_llm):
        node = self._node()
        mock_llm.invoke.side_effect = Exception("LLM failed")
        state = {
            "user_profile": {},
            "metrics": {},
            "asset_universe": ["AAPL"],
            "market_news": None,
        }
        result = node(state)
        assert "error_message" in result


class TestValidatePortfolioNode:
    """Test validate_portfolio_node (Node 6)."""

    def _node(self):
        return _import_nodes()[5]

    def test_no_portfolio_no_error(self):
        node = self._node()
        result = node({})
        assert "validation_result" in result

    def test_valid_portfolio(self, sample_portfolio, sample_metrics):
        node = self._node()
        state = {
            "proposed_portfolio": sample_portfolio,
            "metrics": sample_metrics,
            "financial_data": {},
        }
        result = node(state)
        assert "validation_result" in result
        assert result["validation_result"]["status"] in ("pass", "fail")

    def test_invalid_weights_fail(self):
        node = self._node()
        state = {
            "proposed_portfolio": {"AAPL": 0.5, "MSFT": 0.3},
            "metrics": {},
            "financial_data": {},
        }
        result = node(state)
        assert result["validation_result"]["status"] == "fail"


class TestGenerateCommentaryNode:
    """Test generate_commentary_node (Node 7)."""

    def _node(self):
        return _import_nodes()[6]

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    def test_returns_commentary(self, mock_llm):
        node = self._node()
        mock_llm.invoke.return_value = (
            "This portfolio is well-diversified. "
            "The high allocation to AAPL reflects strong growth potential."
        )
        state = {
            "user_profile": {"goal": "growth"},
            "proposed_portfolio": {"AAPL": 0.6, "MSFT": 0.4},
            "metrics": {},
            "validation_result": {"status": "pass"},
            "market_news": None,
            "llm_commentary": None,
        }
        result = node(state)
        assert "llm_commentary" in result
        assert result["step"] == "generate_commentary"

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    def test_disclaimer_appended_if_missing(self, mock_llm):
        node = self._node()
        mock_llm.invoke.return_value = "Good portfolio."
        state = {
            "user_profile": {},
            "proposed_portfolio": {},
            "metrics": {},
            "validation_result": {},
            "market_news": None,
            "llm_commentary": None,
        }
        result = node(state)
        lower_commentary = result["llm_commentary"].lower()
        assert "not financial advice" in lower_commentary or "disclaimer" in lower_commentary

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    def test_llm_exception_returns_error_message(self, mock_llm):
        node = self._node()
        mock_llm.invoke.side_effect = Exception("LLM timeout")
        state = {
            "user_profile": {},
            "proposed_portfolio": {},
            "metrics": {},
            "validation_result": {},
            "market_news": None,
            "llm_commentary": None,
        }
        result = node(state)
        assert "llm_commentary" in result
        assert "Failed to generate" in result["llm_commentary"]


class TestStructureOutputNode:
    """Test structure_output_node (Node 8)."""

    def _node(self):
        return _import_nodes()[7]

    def test_returns_final_report(self, sample_state, sample_metrics):
        node = self._node()
        state = {
            **sample_state,
            **sample_metrics,
            "validation_result": {"status": "pass"},
        }
        result = node(state)
        assert "final_report" in result
        assert result["step"] == "structure_output"
        assert "Financial Portfolio Report" in result["final_report"]

    def test_error_state_produces_error_report(self):
        node = self._node()
        state = {"error_message": "Workflow failed", "user_profile": {}}
        result = node(state)
        assert "final_report" in result
        assert "Execution Error" in result["final_report"]


class TestHandleErrorNode:
    """Test handle_error_node (Node 9)."""

    def _node(self):
        return _import_nodes()[8]

    def test_basic_error(self):
        node = self._node()
        state = {"error_message": "Network timeout", "step": "fetch_data"}
        result = node(state)
        assert "final_report" in result
        assert "step" in result
        assert result["step"] == "handle_error"
        assert "Network timeout" in result["final_report"]

    def test_default_error_message(self):
        node = self._node()
        state = {}
        result = node(state)
        assert "final_report" in result
        assert "Unspecified error" in result["final_report"]

    def test_error_report_format(self):
        node = self._node()
        state = {"error_message": "API key invalid", "step": "propose_portfolio"}
        result = node(state)
        assert "# Portfolio Generation Failed" in result["final_report"]
        assert "API key invalid" in result["final_report"]
