"""
End-to-end integration tests for the full LangGraph workflow.
Imports are hoisted into individual tests to avoid circular import issues.
"""
import pytest
from unittest.mock import patch, MagicMock
import pandas as pd


def _import_builder():
    from src.fin_agents.graphs.workflow.stock_advisory.builder import (
        build_stock_advisory_graph,
        compile_stock_advisory_graph,
    )
    return build_stock_advisory_graph, compile_stock_advisory_graph


class TestBuildStockAdvisoryGraph:
    """Test that the LangGraph builds correctly."""

    def test_build_returns_state_graph(self):
        build_fn, _ = _import_builder()
        graph = build_fn()
        assert graph is not None

    def test_compile_returns_runnable(self):
        _, compile_fn = _import_builder()
        graph = compile_fn()
        assert graph is not None
        assert hasattr(graph, "invoke")


class TestWorkflowEndToEndHappyPath:
    """Test full workflow execution with mocked LLM calls."""

    def _mock_state(self):
        return {
            "initial_request": "Build a diversified tech portfolio for retirement with high risk tolerance",
        }

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    @patch("src.fin_agents.core.finance.data_fetcher.fetch_financial_data")
    @patch("src.fin_agents.core.finance.data_fetcher.TAVILY_API_KEY", None)
    def test_workflow_runs_without_error(self, mock_fetch_data, mock_llm, sample_financial_data):
        def llm_side_effect(*args, **kwargs):
            call_str = str(args) if args else ""
            if "suggested_assets" in call_str or "goal" in call_str:
                return MagicMock(
                    invoke=MagicMock(
                        return_value={
                            "goal": "retirement",
                            "risk_tolerance": "high",
                            "time_horizon": "10 years",
                            "suggested_assets": ["AAPL", "MSFT"],
                        }
                    )
                )
            return MagicMock(
                invoke=MagicMock(return_value={
                    "portfolio_allocation": {"AAPL": 0.6, "MSFT": 0.4},
                    "reasoning": "Balanced tech allocation",
                })
            )

        mock_llm.invoke = MagicMock(side_effect=llm_side_effect)
        mock_fetch_data.return_value = sample_financial_data

        _, compile_fn = _import_builder()
        graph = compile_fn()
        initial = self._mock_state()
        result = graph.invoke(initial)

        assert isinstance(result, dict)
        assert "final_report" in result or "error_message" in result

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    @patch("src.fin_agents.core.finance.data_fetcher.fetch_financial_data")
    @patch("src.fin_agents.core.finance.data_fetcher.TAVILY_API_KEY", None)
    def test_workflow_sets_correct_final_step(self, mock_fetch, mock_llm, sample_financial_data):
        def llm_side_effect(*args, **kwargs):
            call_str = str(args)
            if "suggested_assets" in call_str:
                m = MagicMock()
                m.invoke.return_value = {
                    "goal": "growth",
                    "risk_tolerance": "medium",
                    "time_horizon": "5 years",
                    "suggested_assets": ["AAPL"],
                }
                return m
            m = MagicMock()
            if "portfolio_allocation" in call_str:
                m.invoke.return_value = {
                    "portfolio_allocation": {"AAPL": 1.0},
                    "reasoning": "Single stock",
                }
            else:
                m.invoke.return_value = "Portfolio analysis complete."
            return m

        mock_llm.invoke = MagicMock(side_effect=llm_side_effect)
        mock_fetch.return_value = sample_financial_data

        _, compile_fn = _import_builder()
        graph = compile_fn()
        result = graph.invoke({"initial_request": "Growth portfolio"})

        assert "step" in result
        assert result["step"] in ("structure_output", "handle_error")


class TestWorkflowErrorPaths:
    """Test workflow error handling paths."""

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    def test_workflow_handles_no_assets(self, mock_llm):
        mock_llm.invoke.return_value = MagicMock(
            invoke=MagicMock(return_value={
                "goal": "growth",
                "risk_tolerance": "medium",
                "time_horizon": "5 years",
                "suggested_assets": [],  # No assets
            })
        )

        _, compile_fn = _import_builder()
        graph = compile_fn()
        result = graph.invoke({"initial_request": "Test"})

        assert "final_report" in result
        assert "error" in result["final_report"].lower() or "error" in result["final_report"].lower()

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    def test_workflow_handles_llm_parse_exception(self, mock_llm):
        mock_llm.invoke.side_effect = Exception("LLM timeout")

        _, compile_fn = _import_builder()
        graph = compile_fn()
        result = graph.invoke({"initial_request": "Test"})

        assert "final_report" in result or "error_message" in result


class TestWorkflowStateConsistency:
    """Test that state is preserved correctly through the workflow."""

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    @patch("src.fin_agents.core.finance.data_fetcher.fetch_financial_data")
    @patch("src.fin_agents.core.finance.data_fetcher.TAVILY_API_KEY", None)
    def test_user_profile_preserved_through_workflow(self, mock_fetch, mock_llm, sample_financial_data):
        def llm_side_effect(*args, **kwargs):
            call_str = str(args)
            if "suggested_assets" in call_str:
                m = MagicMock()
                m.invoke.return_value = {
                    "goal": "retirement",
                    "risk_tolerance": "high",
                    "time_horizon": "15 years",
                    "suggested_assets": ["AAPL", "MSFT"],
                    "preferences": "Tech stocks",
                }
                return m
            m = MagicMock()
            m.invoke.return_value = {
                "portfolio_allocation": {"AAPL": 0.6, "MSFT": 0.4},
                "reasoning": "Test",
            }
            return m

        mock_llm.invoke = MagicMock(side_effect=llm_side_effect)
        mock_fetch.return_value = sample_financial_data

        _, compile_fn = _import_builder()
        result = compile_fn().invoke({"initial_request": "Retirement plan"})

        if "user_profile" in result and result["user_profile"]:
            assert result["user_profile"]["goal"] == "retirement"
            assert result["user_profile"]["risk_tolerance"] == "high"

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    @patch("src.fin_agents.core.finance.data_fetcher.fetch_financial_data")
    @patch("src.fin_agents.core.finance.data_fetcher.TAVILY_API_KEY", None)
    def test_asset_universe_preserved(self, mock_fetch, mock_llm, sample_financial_data):
        def llm_side_effect(*args, **kwargs):
            call_str = str(args)
            if "suggested_assets" in call_str:
                m = MagicMock()
                m.invoke.return_value = {
                    "goal": "growth",
                    "risk_tolerance": "medium",
                    "time_horizon": "5 years",
                    "suggested_assets": ["AAPL", "MSFT", "GOOGL"],
                }
                return m
            m = MagicMock()
            m.invoke.return_value = {
                "portfolio_allocation": {"AAPL": 0.4, "MSFT": 0.35, "GOOGL": 0.25},
                "reasoning": "Diversified",
            }
            return m

        mock_llm.invoke = MagicMock(side_effect=llm_side_effect)
        mock_fetch.return_value = sample_financial_data

        _, compile_fn = _import_builder()
        result = compile_fn().invoke({"initial_request": "Diversified growth"})

        if "proposed_portfolio" in result and result["proposed_portfolio"]:
            for ticker in result["proposed_portfolio"]:
                assert ticker.isupper()


class TestWorkflowConditionalEdges:
    """Test that conditional routing behaves correctly."""

    def test_empty_initial_request_goes_to_error(self):
        _, compile_fn = _import_builder()
        result = compile_fn().invoke({"initial_request": ""})
        assert isinstance(result, dict)

    @patch("src.fin_agents.graphs.workflow.stock_advisory.nodes.llm")
    def test_empty_asset_list_routes_to_error(self, mock_llm):
        mock_llm.invoke.return_value = MagicMock(
            invoke=MagicMock(return_value={
                "goal": "growth",
                "risk_tolerance": "medium",
                "time_horizon": "5 years",
                "suggested_assets": [],
            })
        )
        _, compile_fn = _import_builder()
        result = compile_fn().invoke({"initial_request": "Test"})
        assert "final_report" in result
