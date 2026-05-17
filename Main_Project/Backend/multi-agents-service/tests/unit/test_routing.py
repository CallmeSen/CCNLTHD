"""
Unit tests for workflow routing functions.
Import hoisted into individual tests to avoid circular import via graphs/__init__.py.
"""
import pytest


class TestShouldProceedAfterParsing:
    """Test routing after user request parsing."""

    def test_has_error_routes_to_handle_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_parsing,
        )
        state = {
            "error_message": "Parse failed",
            "asset_universe": ["AAPL"],
        }
        assert should_proceed_after_parsing(state) == "handle_error"

    def test_empty_asset_universe_routes_to_handle_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_parsing,
        )
        state = {"asset_universe": []}
        result = should_proceed_after_parsing(state)
        assert result == "handle_error"
        assert "error_message" in state

    def test_none_asset_universe_routes_to_handle_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_parsing,
        )
        state = {"asset_universe": None}
        result = should_proceed_after_parsing(state)
        assert result == "handle_error"

    def test_valid_asset_universe_routes_to_fetch_news(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_parsing,
        )
        state = {"asset_universe": ["AAPL", "MSFT"]}
        assert should_proceed_after_parsing(state) == "fetch_market_news"

    def test_no_error_message_on_success(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_parsing,
        )
        state = {"asset_universe": ["AAPL"]}
        should_proceed_after_parsing(state)
        assert "error_message" not in state

    def test_error_already_set_preserved(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_parsing,
        )
        state = {"error_message": "Existing error", "asset_universe": ["AAPL"]}
        assert should_proceed_after_parsing(state) == "handle_error"


class TestShouldProceedAfterDataFetch:
    """Test routing after data fetching."""

    def test_has_error_routes_to_handle_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_data_fetch,
        )
        state = {"error_message": "Network timeout", "financial_data": {}}
        assert should_proceed_after_data_fetch(state) == "handle_error"

    def test_no_financial_data_routes_to_handle_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_data_fetch,
        )
        state = {"financial_data": {}}
        result = should_proceed_after_data_fetch(state)
        assert result == "handle_error"

    def test_none_financial_data_routes_to_handle_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_data_fetch,
        )
        state = {"financial_data": None}
        assert should_proceed_after_data_fetch(state) == "handle_error"

    def test_valid_data_routes_to_calculate_metrics(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_data_fetch,
        )
        from unittest.mock import MagicMock
        state = {"financial_data": {"AAPL": MagicMock()}}
        assert should_proceed_after_data_fetch(state) == "calculate_metrics"

    def test_error_message_set_when_no_data(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_data_fetch,
        )
        state = {"financial_data": {}}
        should_proceed_after_data_fetch(state)
        assert "error_message" in state
        assert "No financial data fetched" in state["error_message"]


class TestShouldProceedAfterProposal:
    """Test routing after portfolio proposal."""

    def test_has_error_routes_to_handle_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_proposal,
        )
        state = {"error_message": "LLM failed", "proposed_portfolio": {}}
        assert should_proceed_after_proposal(state) == "handle_error"

    def test_no_portfolio_routes_to_handle_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_proposal,
        )
        state = {"proposed_portfolio": {}}
        result = should_proceed_after_proposal(state)
        assert result == "handle_error"

    def test_none_portfolio_routes_to_handle_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_proposal,
        )
        state = {"proposed_portfolio": None}
        assert should_proceed_after_proposal(state) == "handle_error"

    def test_empty_portfolio_dict_routes_to_handle_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_proposal,
        )
        state = {"proposed_portfolio": {}}
        result = should_proceed_after_proposal(state)
        assert result == "handle_error"
        assert "No portfolio proposed" in state["error_message"]

    def test_valid_portfolio_routes_to_validate(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_proposal,
        )
        state = {"proposed_portfolio": {"AAPL": 0.5, "MSFT": 0.5}}
        assert should_proceed_after_proposal(state) == "validate_portfolio"

    def test_portfolio_with_zero_weights_routes_to_validate(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_proposal,
        )
        # Non-empty dict is truthy — routing does not check zero weights, goes to validate
        state = {"proposed_portfolio": {"AAPL": 0.0, "MSFT": 0.0}}
        result = should_proceed_after_proposal(state)
        assert result == "validate_portfolio"


class TestShouldProceedAfterValidation:
    """Test routing after portfolio validation."""

    def test_has_error_routes_to_handle_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_validation,
        )
        state = {"error_message": "Previous error", "validation_result": {"status": "pass"}}
        assert should_proceed_after_validation(state) == "handle_error"

    def test_validation_pass_routes_to_generate_commentary(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_validation,
        )
        state = {"validation_result": {"status": "pass", "errors": []}}
        assert should_proceed_after_validation(state) == "generate_commentary"

    def test_validation_fail_routes_to_handle_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_validation,
        )
        state = {
            "validation_result": {
                "status": "fail",
                "errors": ["Weights do not sum to 1.0"],
            },
        }
        result = should_proceed_after_validation(state)
        assert result == "handle_error"
        assert "Portfolio validation failed" in state["error_message"]

    def test_validation_status_case_insensitive_pass(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_validation,
        )
        state = {"validation_result": {"status": "PASS"}}
        assert should_proceed_after_validation(state) == "generate_commentary"

    def test_validation_status_case_insensitive_fail(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_validation,
        )
        state = {"validation_result": {"status": "FAIL"}}
        result = should_proceed_after_validation(state)
        assert result == "handle_error"

    def test_validation_missing_status_defaults_to_pass(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_validation,
        )
        state = {"validation_result": {}}
        assert should_proceed_after_validation(state) == "generate_commentary"

    def test_validation_none_routes_to_generate_commentary(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_validation,
        )
        state = {"validation_result": None}
        assert should_proceed_after_validation(state) == "generate_commentary"

    def test_validation_pass_with_errors_still_passes(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_validation,
        )
        state = {"validation_result": {"status": "pass", "errors": ["Minor warning"]}}
        assert should_proceed_after_validation(state) == "generate_commentary"

    def test_validation_unknown_status_defaults_to_handle_error(self):
        from src.fin_agents.graphs.workflow.stock_advisory.routing import (
            should_proceed_after_validation,
        )
        # routing checks status != "pass" strictly — unknown routes to handle_error
        state = {"validation_result": {"status": "unknown_status"}}
        assert should_proceed_after_validation(state) == "handle_error"
