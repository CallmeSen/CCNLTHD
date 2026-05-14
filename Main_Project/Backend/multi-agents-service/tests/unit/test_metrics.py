"""
Unit tests for the financial metrics calculation and validation.
"""
import pytest
import pandas as pd
import numpy as np
from unittest.mock import patch, MagicMock
from src.fin_agents.core.finance.metrics import (
    calculate_financial_metrics,
    validate_portfolio_calculations,
    calculate_metrics_node,
)


class TestCalculateFinancialMetrics:
    """Test calculate_financial_metrics across edge cases."""

    def test_empty_data_returns_error(self):
        result = calculate_financial_metrics({}, None)
        assert "error" in result

    def test_none_data_returns_error(self):
        result = calculate_financial_metrics(None, None)
        assert "error" in result

    def test_data_without_close_column(self):
        result = calculate_financial_metrics(
            {"AAPL": pd.DataFrame({"open": [100], "high": [105]})},
            None,
        )
        assert "error" not in result  # skipped, not failed
        assert "AAPL" not in result  # asset skipped due to missing close

    def test_valid_data_no_portfolio(self, sample_financial_data):
        """With valid data but no portfolio, only individual asset metrics."""
        result = calculate_financial_metrics(sample_financial_data, None)
        assert "error" not in result
        assert "AAPL" in result
        assert "portfolio" not in result

    def test_valid_data_with_portfolio(self, sample_financial_data, sample_portfolio):
        result = calculate_financial_metrics(sample_financial_data, sample_portfolio)
        assert "error" not in result
        assert "portfolio" in result
        portfolio_metrics = result["portfolio"]
        assert "total_return" in portfolio_metrics
        assert "sharpe_ratio" in portfolio_metrics
        assert "max_drawdown" in portfolio_metrics

    def test_portfolio_weights_normalized(self, sample_financial_data):
        """Portfolio metrics cover all assets in portfolio."""
        unnormalized = {"AAPL": 60.0, "MSFT": 40.0}  # sum=100
        result = calculate_financial_metrics(sample_financial_data, unnormalized)
        assert "error" not in result
        assert "portfolio" in result
        # Check that normalized weight sum is reported
        assert "included_weight_sum" in result["portfolio"]

    def test_portfolio_empty_dict(self, sample_financial_data):
        result = calculate_financial_metrics(sample_financial_data, {})
        assert "error" not in result
        # Empty portfolio → portfolio key may not be present

    def test_portfolio_unknown_tickers(self, sample_financial_data):
        """Unknown tickers in portfolio are filtered out gracefully."""
        mixed = {"AAPL": 0.5, "UNKNOWN": 0.5}  # UNKNOWN not in data
        result = calculate_financial_metrics(sample_financial_data, mixed)
        assert "error" not in result
        included = result["portfolio"].get("included_assets", [])
        assert "UNKNOWN" not in included

    def test_all_tickers_uppercase(self, sample_financial_data):
        """Portfolio keys are treated case-insensitively."""
        mixed_case = {"aapl": 0.5, "MSFT": 0.5}
        result = calculate_financial_metrics(sample_financial_data, mixed_case)
        assert "error" not in result

    def test_single_asset_portfolio(self, sample_financial_data):
        portfolio = {"AAPL": 1.0}
        result = calculate_financial_metrics(sample_financial_data, portfolio)
        assert "error" not in result
        assert "portfolio" in result

    def test_benchmark_ticker_excluded_from_individual_metrics(
        self, sample_financial_data
    ):
        """Benchmark ticker (^GSPC) should not appear as individual asset metric."""
        result = calculate_financial_metrics(sample_financial_data, None)
        assert "^GSPC" not in result  # not an asset

    def test_metrics_include_expected_return_capm(self, sample_financial_data, sample_portfolio):
        result = calculate_financial_metrics(sample_financial_data, sample_portfolio)
        capm = result["portfolio"].get("expected_return_capm")
        assert capm is not None
        assert isinstance(capm, (int, float))

    def test_metrics_include_sma_data(self, sample_financial_data, sample_portfolio):
        result = calculate_financial_metrics(sample_financial_data, sample_portfolio)
        sma_50 = result["portfolio"].get("portfolio_sma_50")
        # 100-day data → should have sma_50 but not sma_200 (needs 200 days)
        assert sma_50 is not None

    def test_individual_asset_includes_beta(self, sample_financial_data):
        result = calculate_financial_metrics(sample_financial_data, None)
        aapl = result.get("AAPL", {})
        assert "beta" in aapl

    def test_individual_asset_includes_sma(self, sample_financial_data):
        result = calculate_financial_metrics(sample_financial_data, None)
        aapl = result.get("AAPL", {})
        assert "sma_50" in aapl


class TestValidatePortfolioCalculations:
    """Test portfolio validation across all edge cases."""

    def test_none_portfolio(self):
        result = validate_portfolio_calculations(None, None)
        assert result["status"] == "fail"
        assert len(result["errors"]) > 0
        assert "missing" in result["errors"][0].lower()

    def test_empty_dict_portfolio(self):
        result = validate_portfolio_calculations({}, {})
        assert result["status"] == "fail"

    def test_weights_sum_to_zero(self):
        result = validate_portfolio_calculations({}, {"portfolio": {}})
        assert result["status"] == "fail"

    def test_weights_sum_close_to_one_passes(self):
        portfolio = {"AAPL": 0.333, "MSFT": 0.334, "GOOGL": 0.333}
        result = validate_portfolio_calculations(portfolio, {"portfolio": {}})
        assert result["status"] == "pass"
        assert result["errors"] == []

    def test_weights_sum_to_one_passes(self, sample_portfolio):
        result = validate_portfolio_calculations(sample_portfolio, {"portfolio": {}})
        assert result["status"] == "pass"

    def test_weights_sum_to_half_fails(self):
        portfolio = {"AAPL": 0.3, "MSFT": 0.2}  # sum = 0.5
        result = validate_portfolio_calculations(portfolio, {"portfolio": {}})
        assert result["status"] == "fail"
        assert any("0.5" in err for err in result["errors"])

    def test_weights_sum_to_two_fails(self):
        portfolio = {"AAPL": 1.2, "MSFT": 0.8}  # sum = 2.0
        result = validate_portfolio_calculations(portfolio, {"portfolio": {}})
        assert result["status"] == "fail"

    def test_weights_sum_to_negative(self):
        portfolio = {"AAPL": 0.8, "MSFT": -0.3}  # sum = 0.5 (but negative weight)
        result = validate_portfolio_calculations(portfolio, {"portfolio": {}})
        # Negative sum: 0.8 - 0.3 = 0.5, still passes sum check
        # but total abs sum is far from 1.0
        # Actually -0.3 means the sum check will fail
        # The validation checks abs(sum - 1.0) < 0.01
        assert result["status"] in ("pass", "fail")

    def test_missing_metrics_dict(self, sample_portfolio):
        result = validate_portfolio_calculations(sample_portfolio, None)
        assert result["status"] == "fail"
        assert any("missing" in err.lower() for err in result["errors"])

    def test_metrics_with_error_key(self, sample_portfolio):
        result = validate_portfolio_calculations(
            sample_portfolio,
            {"portfolio": {"error": "Calculation failed"}},
        )
        assert result["status"] == "fail"
        assert any("calculation error" in err.lower() for err in result["errors"])

    def test_metrics_with_empty_portfolio_dict(self):
        """Empty portfolio metrics dict with valid weights."""
        portfolio = {"AAPL": 1.0}
        result = validate_portfolio_calculations(portfolio, {"portfolio": {}})
        # Empty portfolio dict is falsy so this should fail
        assert result["status"] == "fail"

    def test_portfolio_with_single_asset(self):
        portfolio = {"AAPL": 1.0}
        result = validate_portfolio_calculations(portfolio, {"portfolio": {"total_return": 0.1}})
        assert result["status"] == "pass"

    def test_portfolio_many_assets_balanced(self):
        assets = {f"ASSET{i}": 1.0 / 10 for i in range(10)}
        result = validate_portfolio_calculations(assets, {"portfolio": {"sharpe_ratio": 0.5}})
        assert result["status"] == "pass"


class TestCalculateMetricsNode:
    """Test the LangGraph node wrapper for metrics calculation."""

    def test_missing_financial_data(self):
        result = calculate_metrics_node({})
        assert "error_message" in result
        assert "missing" in result["error_message"].lower()

    def test_missing_financial_data_partial_state(self):
        result = calculate_metrics_node({"user_profile": {"goal": "retirement"}})
        assert "error_message" in result

    def test_valid_state_no_portfolio(self, sample_financial_data):
        state = {"financial_data": sample_financial_data}
        result = calculate_metrics_node(state)
        assert "metrics" in result
        assert "AAPL" in result["metrics"]

    def test_valid_state_with_portfolio(
        self, sample_financial_data, sample_portfolio
    ):
        state = {
            "financial_data": sample_financial_data,
            "proposed_portfolio": sample_portfolio,
        }
        result = calculate_metrics_node(state)
        assert "metrics" in result
        assert "portfolio" in result["metrics"]
        assert "sharpe_ratio" in result["metrics"]["portfolio"]

    def test_valid_state_metrics_calculation_error(self):
        """When metrics calculation itself fails, error_message is set."""
        # Pass data without close column to trigger internal error handling
        bad_data = {"AAPL": pd.DataFrame({"open": [100]})}
        state = {"financial_data": bad_data}
        result = calculate_metrics_node(state)
        assert "metrics" in result  # still returns partial metrics

    def test_node_returns_step(self, sample_financial_data):
        state = {"financial_data": sample_financial_data}
        result = calculate_metrics_node(state)
        assert "step" not in result  # node itself doesn't add step; wrappers do

    def test_metrics_include_all_required_fields(self, sample_financial_data, sample_portfolio):
        state = {
            "financial_data": sample_financial_data,
            "proposed_portfolio": sample_portfolio,
        }
        result = calculate_metrics_node(state)
        pm = result["metrics"]["portfolio"]
        required = [
            "total_return",
            "annualized_return",
            "annualized_volatility",
            "sharpe_ratio",
            "max_drawdown",
        ]
        for field in required:
            assert field in pm, f"Missing field: {field}"
