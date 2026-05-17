"""
Unit tests for the stock advisory workflow state (TypedDict).
"""
import pytest


def _import_state():
    from src.fin_agents.graphs.workflow.stock_advisory.states.workflow_state import (
        StockAdvisoryState,
    )
    return StockAdvisoryState


class TestStockAdvisoryState:
    """Test StockAdvisoryState TypedDict structure."""

    def test_empty_state(self):
        State = _import_state()
        state: State = {}
        assert state == {}

    def test_minimal_valid_state(self):
        State = _import_state()
        state: State = {"initial_request": "Build a portfolio"}
        assert state["initial_request"] == "Build a portfolio"

    def test_full_state(self, sample_state):
        _import_state()
        assert sample_state["initial_request"] is not None
        assert sample_state["user_profile"]["goal"] == "retirement"
        assert len(sample_state["asset_universe"]) == 5

    def test_state_with_financial_data(self):
        State = _import_state()
        state: State = {
            "financial_data": {"AAPL": {}},
            "metrics": {"portfolio": {}},
        }
        assert "financial_data" in state
        assert "metrics" in state

    def test_state_with_proposed_portfolio(self):
        State = _import_state()
        state: State = {
            "proposed_portfolio": {"AAPL": 0.5, "MSFT": 0.5},
            "validation_result": {"status": "pass", "errors": []},
        }
        assert sum(state["proposed_portfolio"].values()) == pytest.approx(1.0)

    def test_state_with_error(self):
        State = _import_state()
        state: State = {
            "error_message": "Failed to fetch data",
            "step": "fetch_data",
        }
        assert state["error_message"] is not None
        assert state["step"] == "fetch_data"

    def test_state_with_final_report(self):
        State = _import_state()
        state: State = {
            "final_report": "# Financial Portfolio Report\n\n...",
            "step": "structure_output",
        }
        assert isinstance(state["final_report"], str)
        assert len(state["final_report"]) > 0

    def test_state_all_optional_fields_none(self):
        State = _import_state()
        state: State = {
            "initial_request": "test",
            "user_profile": None,
            "asset_universe": None,
            "market_news": None,
            "financial_data": None,
            "metrics": None,
            "proposed_portfolio": None,
            "validation_result": None,
            "llm_commentary": None,
            "final_report": None,
            "error_message": None,
            "step": None,
        }
        assert state["initial_request"] == "test"
        assert state["user_profile"] is None

    def test_state_partial_update(self):
        State = _import_state()
        state: State = {}
        state["user_profile"] = {"goal": "growth"}
        state["proposed_portfolio"] = {"AAPL": 1.0}
        assert state["user_profile"]["goal"] == "growth"
        assert state["proposed_portfolio"]["AAPL"] == 1.0

    def test_state_weights_are_floats(self, sample_portfolio):
        State = _import_state()
        state: State = {"proposed_portfolio": sample_portfolio}
        for ticker, weight in state["proposed_portfolio"].items():
            assert isinstance(weight, float)
            assert 0.0 <= weight <= 1.0
