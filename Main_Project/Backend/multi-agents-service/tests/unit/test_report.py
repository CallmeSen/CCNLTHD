"""
Unit tests for the Markdown report formatter.
"""
import pytest
from src.fin_agents.core.finance.report import structure_output_report


class TestStructureOutputReport:
    """Test structure_output_report across all state combinations."""

    def test_empty_state(self):
        """Empty state should still produce a report (degraded)."""
        report = structure_output_report({})
        assert "# Financial Portfolio Report" in report
        assert "User Profile Summary" in report

    def test_error_state(self):
        """Error message should appear prominently."""
        state = {
            "error_message": "Network timeout while fetching data",
            "user_profile": {},
        }
        report = structure_output_report(state)
        assert "Execution Error" in report
        assert "Network timeout" in report

    def test_user_profile_all_fields(self, sample_state):
        """All user profile fields should appear in report."""
        report = structure_output_report(sample_state)
        assert "retirement" in report
        assert "high" in report  # risk tolerance
        assert "10 years" in report

    def test_user_profile_with_capital(self):
        """Initial capital should be formatted with $ sign."""
        state = {
            "user_profile": {
                "goal": "retirement",
                "risk_tolerance": "high",
                "time_horizon": "10 years",
                "initial_capital": 50000.0,
            },
            "proposed_portfolio": {},
            "metrics": {},
            "validation_result": {},
            "llm_commentary": "Test.",
        }
        report = structure_output_report(state)
        assert "$50,000.00" in report

    def test_user_profile_with_specific_preferences(self):
        state = {
            "user_profile": {
                "goal": "growth",
                "specific_preferences": "ESG-focused companies only",
            },
            "proposed_portfolio": {},
            "metrics": {},
            "validation_result": {},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        assert "ESG-focused" in report

    def test_user_profile_with_list_preferences(self):
        state = {
            "user_profile": {
                "goal": "income",
                "preferences": ["Dividend stocks", "Bond funds"],
            },
            "proposed_portfolio": {},
            "metrics": {},
            "validation_result": {},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        assert "Dividend stocks" in report

    def test_market_news_section(self):
        state = {
            "user_profile": {},
            "market_news": "Tech sector rallied 3% today amid positive earnings.",
            "proposed_portfolio": {},
            "metrics": {},
            "validation_result": {},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        assert "Recent Market News Context" in report
        assert "Tech sector rallied" in report

    def test_proposed_portfolio_table(self, sample_portfolio, sample_metrics):
        state = {
            "user_profile": {"goal": "retirement"},
            "proposed_portfolio": sample_portfolio,
            "metrics": sample_metrics,
            "validation_result": {"status": "pass"},
            "llm_commentary": "Diversified allocation.",
        }
        report = structure_output_report(state)
        assert "Proposed Portfolio Allocation" in report
        assert "| AAPL |" in report or "| AAPL |" in report  # table rows
        assert "40.00%" in report or "0.40" in report  # weights displayed

    def test_proposed_portfolio_empty(self):
        state = {
            "user_profile": {"goal": "growth"},
            "proposed_portfolio": {},
            "metrics": {},
            "validation_result": {},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        assert "No valid portfolio" in report

    def test_proposed_portfolio_none(self):
        state = {
            "user_profile": {"goal": "growth"},
            "proposed_portfolio": None,
            "metrics": {},
            "validation_result": {},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        assert "No valid portfolio" in report

    def test_proposed_portfolio_non_dict(self):
        state = {
            "user_profile": {},
            "proposed_portfolio": [],  # non-dict falsy value
            "metrics": {},
            "validation_result": {},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        assert "No valid portfolio" in report

    def test_portfolio_metrics_table(self, sample_portfolio, sample_metrics):
        state = {
            "user_profile": {},
            "proposed_portfolio": sample_portfolio,
            "metrics": sample_metrics,
            "validation_result": {},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        assert "Portfolio Performance Metrics" in report
        assert "Sharpe Ratio" in report
        assert "Max Drawdown" in report
        assert "Expected Return (CAPM)" in report

    def test_portfolio_metrics_with_error(self):
        state = {
            "user_profile": {},
            "proposed_portfolio": {"AAPL": 1.0},
            "metrics": {"portfolio": {"error": "Data unavailable"}},
            "validation_result": {},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        assert "Metrics Calculation Error" in report

    def test_individual_asset_metrics_table(self, sample_portfolio, sample_metrics):
        state = {
            "user_profile": {},
            "proposed_portfolio": sample_portfolio,
            "metrics": sample_metrics,
            "validation_result": {},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        assert "Individual Asset Metrics" in report
        assert "AAPL" in report
        assert "Sharpe" in report  # column header

    def test_individual_asset_metrics_missing_in_data(self):
        """If asset is in portfolio but metrics missing, table shows N/A."""
        state = {
            "user_profile": {},
            "proposed_portfolio": {"AAPL": 1.0},
            "metrics": {},  # no individual metrics
            "validation_result": {},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        assert "Individual Asset Metrics" in report

    def test_validation_pass(self):
        state = {
            "user_profile": {},
            "proposed_portfolio": {"AAPL": 1.0},
            "metrics": {"portfolio": {"total_return": 0.1}},
            "validation_result": {"status": "pass", "errors": []},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        assert "PASS" in report
        assert "Issues Found" not in report

    def test_validation_fail_with_errors(self):
        state = {
            "user_profile": {},
            "proposed_portfolio": {"AAPL": 1.0},
            "metrics": {"portfolio": {}},
            "validation_result": {
                "status": "fail",
                "errors": [
                    "Portfolio weights sum to 0.5",
                    "Missing required metrics",
                ],
            },
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        assert "FAIL" in report
        assert "Portfolio weights" in report

    def test_validation_missing(self):
        state = {
            "user_profile": {},
            "proposed_portfolio": {},
            "metrics": {},
            "validation_result": {},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        assert "Validation Status" in report

    def test_llm_commentary_section(self):
        state = {
            "user_profile": {},
            "proposed_portfolio": {},
            "metrics": {},
            "validation_result": {},
            "llm_commentary": "The portfolio is well-diversified across sectors.",
        }
        report = structure_output_report(state)
        assert "LLM Commentary" in report
        assert "well-diversified" in report

    def test_llm_commentary_default_when_empty(self):
        state = {
            "user_profile": {},
            "proposed_portfolio": {},
            "metrics": {},
            "validation_result": {},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        assert "No commentary" in report

    def test_llm_commentary_default_when_none(self):
        state = {
            "user_profile": {},
            "proposed_portfolio": {},
            "metrics": {},
            "validation_result": {},
            "llm_commentary": None,
        }
        report = structure_output_report(state)
        assert "No commentary" in report

    def test_disclaimer_present(self):
        state = {
            "user_profile": {},
            "proposed_portfolio": {},
            "metrics": {},
            "validation_result": {},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        assert "Disclaimer" in report or "disclaimer" in report.lower()

    def test_capm_parameters_included(self, sample_portfolio, sample_metrics):
        state = {
            "user_profile": {},
            "proposed_portfolio": sample_portfolio,
            "metrics": sample_metrics,
            "validation_result": {},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        assert "Rf=" in report or "CAPM" in report

    def test_all_metrics_formatted(self, sample_portfolio, sample_metrics):
        """All numeric values should be formatted (not raw Python repr)."""
        state = {
            "user_profile": {},
            "proposed_portfolio": sample_portfolio,
            "metrics": sample_metrics,
            "validation_result": {},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        # Should not have raw Python float representations
        assert "0.1" not in report.split("Total Return")[-1].split("\n")[0]  # formatted as %
        assert "sharpe_ratio" not in report  # not raw key name
        assert "annualized_return" not in report  # not raw key name

    def test_weight_percentage_formatting(self, sample_portfolio):
        """Portfolio weights should be shown as percentages."""
        state = {
            "user_profile": {},
            "proposed_portfolio": sample_portfolio,
            "metrics": {},
            "validation_result": {},
            "llm_commentary": "",
        }
        report = structure_output_report(state)
        # Look for percentage patterns
        lines = report.split("\n")
        pct_lines = [l for l in lines if "%" in l]
        assert len(pct_lines) > 0, "No percentage formatting found"
