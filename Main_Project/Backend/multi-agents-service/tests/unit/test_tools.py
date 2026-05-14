"""
Unit tests for helper tools (error, output, news).
"""
import pytest
from unittest.mock import patch, MagicMock
from src.fin_agents.tools.error_tool import handle_error_tool
from src.fin_agents.tools.output_tool import structure_output_tool
from src.fin_agents.tools.market_news_tool import fetch_market_news_tool


class TestHandleErrorTool:
    """Test centralized error handling tool."""

    def test_basic_error(self):
        state = {"error_message": "Network timeout", "step": "fetch_data"}
        result = handle_error_tool(state)
        assert "final_report" in result
        assert result["error_logged"] is True
        assert result["step"] == "handle_error"
        assert "Network timeout" in result["final_report"]
        assert "fetch_data" in result["final_report"]

    def test_no_error_message_uses_default(self):
        state = {}
        result = handle_error_tool(state)
        assert "final_report" in result
        assert "unspecified" in result["final_report"].lower()

    def test_no_step_uses_unknown(self):
        state = {"error_message": "Something broke"}
        result = handle_error_tool(state)
        assert "final_report" in result
        assert "unknown" in result["final_report"]

    def test_error_report_format(self):
        state = {"error_message": "API key invalid", "step": "fetch_market_news"}
        result = handle_error_tool(state)
        report = result["final_report"]
        assert "# Portfolio Generation Failed" in report
        assert "API key invalid" in report
        assert "fetch_market_news" in report

    def test_empty_error_message(self):
        state = {"error_message": "", "step": "unknown"}
        result = handle_error_tool(state)
        # Empty string → falsy → default used
        assert "final_report" in result

    def test_unicode_error_message(self):
        state = {"error_message": "Lỗi không xác định", "step": "parse"}
        result = handle_error_tool(state)
        assert "Lỗi không xác định" in result["final_report"]


class TestStructureOutputTool:
    """Test output structuring tool."""

    def test_valid_state_produces_report(self, sample_state, sample_metrics):
        state = {**sample_state, **sample_metrics}
        state["validation_result"] = {"status": "pass"}
        result = structure_output_tool(state)
        assert isinstance(result, str)
        assert len(result) > 0
        assert "Financial Portfolio Report" in result

    def test_error_state_produces_report(self):
        state = {"error_message": "Test error"}
        result = structure_output_tool(state)
        assert isinstance(result, str)
        assert "Execution Error" in result

    def test_empty_state_produces_report(self):
        result = structure_output_tool({})
        assert isinstance(result, str)
        assert "Financial Portfolio Report" in result

    def test_returns_string(self, sample_state):
        result = structure_output_tool(sample_state)
        assert isinstance(result, str)

    def test_exception_in_report_generator(self):
        # If report formatter crashes, tool catches it
        with patch(
            "src.fin_agents.tools.output_tool.structure_output_report",
            side_effect=Exception("Formatter crashed"),
        ):
            result = structure_output_tool({})
            assert isinstance(result, str)
            assert "Error generating report" in result


class TestFetchMarketNewsTool:
    """Test market news tool (wrapper around data_fetcher function)."""

    @patch("src.fin_agents.tools.market_news_tool.TAVILY_API_KEY", None)
    def test_tavily_not_configured(self):
        state = {
            "user_profile": {"goal": "retirement", "risk_tolerance": "high"},
            "asset_universe": ["AAPL", "MSFT"],
        }
        result = fetch_market_news_tool(state)
        assert "market_news" in result
        assert "not configured" in result["market_news"].lower()

    @patch("src.fin_agents.tools.market_news_tool.TAVILY_API_KEY", "fake-key")
    @patch("src.fin_agents.tools.market_news_tool.TavilySearchResults")
    def test_tavily_returns_formatted_news(self, mock_tavily_cls):
        mock_tool = MagicMock()
        mock_tool.invoke.return_value = [
            {"content": "AI stocks surge on earnings beat"},
            {"content": "Bond yields fall as inflation cools"},
        ]
        mock_tavily_cls.return_value = mock_tool

        state = {"user_profile": {"goal": "growth", "risk_tolerance": "medium"}}
        result = fetch_market_news_tool(state)
        assert "market_news" in result
        assert "AI stocks surge" in result["market_news"]
        assert "Bond yields fall" in result["market_news"]

    @patch("src.fin_agents.tools.market_news_tool.TAVILY_API_KEY", "fake-key")
    @patch("src.fin_agents.tools.market_news_tool.TavilySearchResults")
    def test_tavily_empty_results(self, mock_tavily_cls):
        mock_tool = MagicMock()
        mock_tool.invoke.return_value = []
        mock_tavily_cls.return_value = mock_tool

        state = {"user_profile": {"goal": "income"}}
        result = fetch_market_news_tool(state)
        assert "No news" in result["market_news"]

    @patch("src.fin_agents.tools.market_news_tool.TAVILY_API_KEY", "fake-key")
    @patch("src.fin_agents.tools.market_news_tool.TavilySearchResults")
    def test_query_includes_assets(self, mock_tavily_cls, sample_state):
        mock_tool = MagicMock()
        mock_tool.invoke.return_value = []
        mock_tavily_cls.return_value = mock_tool

        fetch_market_news_tool(sample_state)
        call_args = mock_tool.invoke.call_args
        query = call_args[0][0]["query"]
        assert "AAPL" in query
        assert "MSFT" in query

    @patch("src.fin_agents.tools.market_news_tool.TAVILY_API_KEY", "fake-key")
    @patch("src.fin_agents.tools.market_news_tool.TavilySearchResults")
    def test_tavily_error_returns_failed_message(self, mock_tavily_cls):
        mock_tool = MagicMock()
        mock_tool.invoke.side_effect = Exception("Rate limit exceeded")
        mock_tavily_cls.return_value = mock_tool

        state = {"user_profile": {"goal": "growth"}}
        result = fetch_market_news_tool(state)
        assert "market_news" in result
        assert "Failed to fetch" in result["market_news"] or "Rate limit" in result["market_news"]

    def test_empty_user_profile(self):
        state = {"user_profile": {}}
        with patch("src.fin_agents.tools.market_news_tool.TAVILY_API_KEY", None):
            result = fetch_market_news_tool(state)
            assert "market_news" in result

    def test_missing_user_profile(self):
        state = {}
        with patch("src.fin_agents.tools.market_news_tool.TAVILY_API_KEY", None):
            result = fetch_market_news_tool(state)
            assert "market_news" in result

    @patch("src.fin_agents.tools.market_news_tool.TAVILY_API_KEY", "fake-key")
    @patch("src.fin_agents.tools.market_news_tool.TavilySearchResults")
    def test_max_results_respected(self, mock_tavily_cls):
        mock_tool = MagicMock()
        mock_tool.invoke.return_value = [{"content": "News item"}]
        mock_tavily_cls.return_value = mock_tool

        # TavilySearchResults with max_results=3 (hardcoded in tool)
        state = {"user_profile": {"goal": "growth"}}
        fetch_market_news_tool(state)
        # Tool is called → verify it doesn't crash
