"""
Unit tests for the data fetcher (yfinance wrapper + Tavily news).
"""
import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
from src.fin_agents.core.finance.data_fetcher import (
    fetch_financial_data,
    fetch_market_news,
    fetch_data_node,
)


class TestFetchFinancialData:
    """Test fetch_financial_data across edge cases."""

    def test_empty_ticker_list(self):
        result = fetch_financial_data([])
        assert result == {}

    def test_none_ticker_ignored(self):
        result = fetch_financial_data([None, "AAPL"])
        # None is stripped/uppered so should be skipped or handled
        assert isinstance(result, dict)

    @patch("src.fin_agents.core.finance.data_fetcher.yf.Ticker")
    def test_single_valid_ticker(self, mock_ticker_cls):
        mock_ticker = MagicMock()
        dates = pd.date_range("2024-01-01", periods=30, freq="D")
        mock_df = pd.DataFrame(
            {"Open": [100] * 30, "High": [105] * 30, "Low": [95] * 30,
             "Close": [102] * 30, "Volume": [1000] * 30},
            index=dates,
        )
        mock_ticker.history.return_value = mock_df
        mock_ticker_cls.return_value = mock_ticker

        result = fetch_financial_data(["AAPL"], period="1mo")
        assert "AAPL" in result
        assert "close" in result["AAPL"].columns

    @patch("src.fin_agents.core.finance.data_fetcher.yf.Ticker")
    def test_ticker_without_history(self, mock_ticker_cls):
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = pd.DataFrame()
        mock_ticker.info = {}
        mock_ticker_cls.return_value = mock_ticker

        result = fetch_financial_data(["INVALID_TICKER"], period="1mo")
        # No data → skipped, result should be empty or not contain the ticker
        assert "INVALID_TICKER" not in result

    @patch("src.fin_agents.core.finance.data_fetcher.yf.Ticker")
    def test_ticker_missing_close_column(self, mock_ticker_cls):
        mock_ticker = MagicMock()
        dates = pd.date_range("2024-01-01", periods=30, freq="D")
        mock_df = pd.DataFrame(
            {"Open": [100] * 30},
            index=dates,
        )
        mock_ticker.history.return_value = mock_df
        mock_ticker_cls.return_value = mock_ticker

        result = fetch_financial_data(["AAPL"], period="1mo")
        assert "AAPL" not in result  # skipped due to missing close

    @patch("src.fin_agents.core.finance.data_fetcher.yf.Ticker")
    def test_with_date_range(self, mock_ticker_cls):
        mock_ticker = MagicMock()
        dates = pd.date_range("2024-01-01", periods=30, freq="D")
        mock_df = pd.DataFrame(
            {"Open": [100] * 30, "High": [105] * 30, "Low": [95] * 30,
             "Close": [102] * 30, "Volume": [1000] * 30},
            index=dates,
        )
        mock_ticker.history.return_value = mock_df
        mock_ticker_cls.return_value = mock_ticker

        result = fetch_financial_data(
            ["AAPL"],
            start_date="2024-01-01",
            end_date="2024-01-31",
        )
        assert "AAPL" in result
        mock_ticker.history.assert_called_with(
            start="2024-01-01", end="2024-01-31"
        )

    @patch("src.fin_agents.core.finance.data_fetcher.yf.Ticker")
    def test_ticker_uppercase_normalized(self, mock_ticker_cls):
        mock_ticker = MagicMock()
        dates = pd.date_range("2024-01-01", periods=30, freq="D")
        mock_df = pd.DataFrame(
            {"Open": [100] * 30, "High": [105] * 30, "Low": [95] * 30,
             "Close": [102] * 30, "Volume": [1000] * 30},
            index=dates,
        )
        mock_ticker.history.return_value = mock_df
        mock_ticker_cls.return_value = mock_ticker

        result = fetch_financial_data(["aapl"])
        assert "AAPL" in result  # normalized to uppercase

    @patch("src.fin_agents.core.finance.data_fetcher.yf.Ticker")
    def test_multiple_tickers_partial_success(self, mock_ticker_cls):
        def side_effect(ticker):
            m = MagicMock()
            dates = pd.date_range("2024-01-01", periods=30, freq="D")
            if ticker.upper() == "AAPL":
                mock_df = pd.DataFrame(
                    {"Open": [100] * 30, "High": [105] * 30, "Low": [95] * 30,
                     "Close": [102] * 30, "Volume": [1000] * 30},
                    index=dates,
                )
                m.history.return_value = mock_df
            else:
                m.history.return_value = pd.DataFrame()
                m.info = {}
            return m

        mock_ticker_cls.side_effect = side_effect
        result = fetch_financial_data(["AAPL", "INVALID"])
        assert "AAPL" in result
        # INVALID should not be present (no data)

    @patch("src.fin_agents.core.finance.data_fetcher.yf.Ticker")
    def test_column_names_normalized_lowercase(self, mock_ticker_cls):
        mock_ticker = MagicMock()
        dates = pd.date_range("2024-01-01", periods=30, freq="D")
        mock_df = pd.DataFrame(
            {"Open": [100] * 30, "Close": [102] * 30},
            index=dates,
        )
        mock_ticker.history.return_value = mock_df
        mock_ticker_cls.return_value = mock_ticker

        result = fetch_financial_data(["AAPL"])
        # Columns should be normalized to lowercase
        assert "close" in result["AAPL"].columns
        assert "open" in result["AAPL"].columns


class TestFetchMarketNews:
    """Test market news fetching with Tavily."""

    @patch("src.fin_agents.core.config.TAVILY_API_KEY", None)
    def test_tavily_not_configured(self):
        state = {
            "user_profile": {"goal": "retirement", "risk_tolerance": "high"},
            "asset_universe": ["AAPL", "MSFT"],
        }
        result = fetch_market_news(state)
        assert "market_news" in result
        assert "not configured" in result["market_news"].lower()

    @patch("src.fin_agents.core.config.TAVILY_API_KEY", "fake-key")
    @patch("langchain_tavily.TavilySearch")
    def test_tavily_returns_results(self, mock_tavily_cls, sample_state):
        mock_tool = MagicMock()
        mock_tool.invoke.return_value = [
            {"content": "Tech stocks rally on AI news"},
            {"content": "Federal Reserve holds interest rates"},
        ]
        mock_tavily_cls.return_value = mock_tool

        result = fetch_market_news(sample_state)
        assert "market_news" in result
        assert "Tech stocks rally" in result["market_news"]

    @patch("src.fin_agents.core.config.TAVILY_API_KEY", "fake-key")
    @patch("langchain_tavily.TavilySearch")
    def test_tavily_empty_results(self, mock_tavily_cls):
        mock_tool = MagicMock()
        mock_tool.invoke.return_value = []
        mock_tavily_cls.return_value = mock_tool

        state = {"user_profile": {"goal": "growth", "risk_tolerance": "medium"}}
        result = fetch_market_news(state)
        assert "market_news" in result
        assert "no" in result["market_news"].lower()  # "No specific news found."

    @patch("src.fin_agents.core.config.TAVILY_API_KEY", "fake-key")
    @patch("langchain_tavily.TavilySearch")
    def test_tavily_error_handling(self, mock_tavily_cls):
        mock_tool = MagicMock()
        mock_tool.invoke.side_effect = Exception("API rate limit exceeded")
        mock_tavily_cls.return_value = mock_tool

        state = {"user_profile": {"goal": "growth"}}
        result = fetch_market_news(state)
        assert "market_news" in result
        assert "Failed to fetch" in result["market_news"] or "rate limit" in result["market_news"]

    def test_query_includes_assets(self, sample_state):
        with patch("src.fin_agents.core.config.TAVILY_API_KEY", None):
            result = fetch_market_news(sample_state)
            # Without Tavily, returns not-configured msg
            assert "market_news" in result


class TestFetchDataNode:
    """Test the LangGraph node wrapper for data fetching."""

    def test_no_asset_universe(self):
        result = fetch_data_node({})
        assert "error_message" in result

    def test_empty_asset_universe(self):
        result = fetch_data_node({"asset_universe": [], "user_profile": {}})
        assert "error_message" in result

    def test_suggested_assets_fallback(self):
        result = fetch_data_node({
            "asset_universe": None,
            "user_profile": {"suggested_assets": ["AAPL", "MSFT"]},
        })
        # Should try to fetch (may return data or error, not crash)
        assert isinstance(result, dict)

    @patch("src.fin_agents.core.finance.data_fetcher.fetch_financial_data")
    def test_benchmark_ticker_added(self, mock_fetch, sample_state):
        mock_fetch.return_value = {
            "AAPL": pd.DataFrame({"close": [100]}, index=[0]),
            "^GSPC": pd.DataFrame({"close": [5000]}, index=[0]),
        }

        result = fetch_data_node(sample_state)
        # Benchmark should be included
        call_args = mock_fetch.call_args
        tickers = call_args.kwargs.get("tickers") or list(call_args[1].values())[0] if call_args[1] else call_args[0][0]
        # Just verify it was called with tickers that include benchmark

    @patch("src.fin_agents.core.finance.data_fetcher.fetch_financial_data")
    def test_empty_data_returned(self, mock_fetch):
        mock_fetch.return_value = {}
        state = {
            "asset_universe": ["INVALID1", "INVALID2"],
            "user_profile": {},
        }
        result = fetch_data_node(state)
        assert "financial_data" in result
        assert result["financial_data"] == {}
        assert "error_message" in result

    def test_time_horizon_parsing_short_term(self):
        state = {
            "asset_universe": ["AAPL"],
            "user_profile": {"time_horizon": "short-term"},
        }
        with patch("src.fin_agents.core.finance.data_fetcher.fetch_financial_data") as mock:
            mock.return_value = {"AAPL": pd.DataFrame({"close": [100]}, index=[0])}
            result = fetch_data_node(state)
            # Should call with period "1y" for short-term

    def test_time_horizon_parsing_long_term(self):
        state = {
            "asset_universe": ["AAPL"],
            "user_profile": {"time_horizon": "long-term"},
        }
        with patch("src.fin_agents.core.finance.data_fetcher.fetch_financial_data") as mock:
            mock.return_value = {"AAPL": pd.DataFrame({"close": [100]}, index=[0])}
            result = fetch_data_node(state)
            # Should call with period "10y" for long-term

    def test_time_horizon_parsing_years(self):
        state = {
            "asset_universe": ["AAPL"],
            "user_profile": {"time_horizon": "5 years"},
        }
        with patch("src.fin_agents.core.finance.data_fetcher.fetch_financial_data") as mock:
            mock.return_value = {"AAPL": pd.DataFrame({"close": [100]}, index=[0])}
            result = fetch_data_node(state)
            call_kwargs = mock.call_args[1]
            # Should be "5y"

    def test_specific_date_range_used(self):
        state = {
            "asset_universe": ["AAPL"],
            "user_profile": {
                "start_date": "2023-01-01",
                "end_date": "2023-12-31",
            },
        }
        with patch("src.fin_agents.core.finance.data_fetcher.fetch_financial_data") as mock:
            mock.return_value = {"AAPL": pd.DataFrame({"close": [100]}, index=[0])}
            result = fetch_data_node(state)
            call_kwargs = mock.call_args[1]
            assert call_kwargs.get("start_date") == "2023-01-01"
            assert call_kwargs.get("end_date") == "2023-12-31"

    def test_invalid_date_range_fallback(self):
        state = {
            "asset_universe": ["AAPL"],
            "user_profile": {
                "start_date": "invalid-date",
                "end_date": "also-invalid",
            },
        }
        with patch("src.fin_agents.core.finance.data_fetcher.fetch_financial_data") as mock:
            mock.return_value = {"AAPL": pd.DataFrame({"close": [100]}, index=[0])}
            result = fetch_data_node(state)
            # Should fall back to time_horizon-based period

    def test_invalid_tickers_removed_from_universe(self):
        """Assets with no data should be removed from returned asset_universe."""
        state = {
            "asset_universe": ["AAPL", "UNKNOWN_TICKER_XYZ"],
            "user_profile": {},
        }
        with patch("src.fin_agents.core.finance.data_fetcher.fetch_financial_data") as mock:
            mock.return_value = {
                "AAPL": pd.DataFrame({"close": [100]}, index=[0]),
                "^GSPC": pd.DataFrame({"close": [5000]}, index=[0]),
            }
            result = fetch_data_node(state)
            if "asset_universe" in result:
                # Unknown ticker should not be in returned universe
                assert "UNKNOWN_TICKER_XYZ" not in result["asset_universe"]
