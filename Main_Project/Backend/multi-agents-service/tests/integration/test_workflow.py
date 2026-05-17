"""
Integration tests for the full LangGraph workflow.
All external calls (LLM, yfinance, Tavily) are mocked.
"""
import json
import pytest
from unittest.mock import MagicMock, patch
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableLambda

_PARSE_LLM     = "fin_agents.graphs.workflow.stock_advisory.agents.parse_agent.get_shared_llm"
_PORTFOLIO_LLM = "fin_agents.graphs.workflow.stock_advisory.agents.portfolio_agent.get_shared_llm"
_COMMENTARY_LLM = "fin_agents.graphs.workflow.stock_advisory.agents.commentary_agent.get_shared_llm"
_TAVILY        = "langchain_tavily.TavilySearch"
_DATA_FETCHER  = "src.fin_agents.core.finance.data_fetcher.fetch_financial_data"


def _json_llm(data: dict) -> RunnableLambda:
    def _call(msgs, **kw): return AIMessage(content=json.dumps(data))
    return RunnableLambda(_call)


def _str_llm(text: str) -> RunnableLambda:
    def _call(msgs, **kw): return AIMessage(content=text)
    return RunnableLambda(_call)


_PARSE_RESPONSE = {
    "goal": "long_term_growth",
    "risk_tolerance": "moderate",
    "time_horizon": "5 years",
    "initial_capital": 50000,
    "preferences": "technology",
    "specific_preferences": None,
    "suggested_assets": ["AAPL", "MSFT", "GOOGL"],
    "start_date": None,
    "end_date": None,
}

_PORTFOLIO_RESPONSE = {
    "portfolio_allocation": {"AAPL": 0.40, "MSFT": 0.35, "GOOGL": 0.25},
    "reasoning": "Diversified tech portfolio with strong Sharpe ratios.",
}

_COMMENTARY_TEXT = (
    "This portfolio is well-balanced for a moderate-risk investor. "
    "AAPL leads with the highest allocation due to strong fundamentals. "
    "This is not financial advice."
)


@pytest.mark.integration
class TestFullWorkflow:

    def _run_graph(self, request: str, lang: str, sample_financial_data):
        """Helper: compile and invoke the full graph with all externals mocked."""
        from fin_agents.graphs.workflow.stock_advisory.builder import compile_stock_advisory_graph

        tavily_mock = MagicMock()
        tavily_mock.return_value.invoke.return_value = [
            {"content": "Market update: Tech stocks rally.", "url": "https://example.com"}
        ]

        with (
            patch(_PARSE_LLM, return_value=_json_llm(_PARSE_RESPONSE)),
            patch(_PORTFOLIO_LLM, return_value=_json_llm(_PORTFOLIO_RESPONSE)),
            patch(_COMMENTARY_LLM, return_value=_str_llm(_COMMENTARY_TEXT)),
            patch(_TAVILY, tavily_mock),
            patch(_DATA_FETCHER, return_value=sample_financial_data),
        ):
            graph = compile_stock_advisory_graph()
            final_state = graph.invoke({"initial_request": request, "lang": lang})

        return final_state

    def test_happy_path_english(self, sample_financial_data):
        state = self._run_graph(
            "I want to invest $50,000 in technology stocks with moderate risk.",
            "en",
            sample_financial_data,
        )
        assert state.get("final_report") is not None
        assert "Portfolio" in state["final_report"] or "portfolio" in state["final_report"].lower()
        assert state.get("proposed_portfolio") is not None
        weights = state["proposed_portfolio"]
        assert abs(sum(weights.values()) - 1.0) < 0.02

    # def test_happy_path_vietnamese(self, sample_financial_data):
    #     state = self._run_graph(
    #         "Tôi muốn đầu tư 50 triệu đồng vào cổ phiếu công nghệ, rủi ro vừa phải.",
    #         "vi",
    #         sample_financial_data,
    #     )
    #     assert state.get("final_report") is not None

    def test_validation_result_present(self, sample_financial_data):
        state = self._run_graph(
            "Build me a diversified portfolio with $100k.",
            "en",
            sample_financial_data,
        )
        assert state.get("validation_result") is not None
        assert state["validation_result"].get("status") is not None

    # def test_empty_request_produces_error_report(self, sample_financial_data):
    #     from fin_agents.graphs.workflow.stock_advisory.builder import compile_stock_advisory_graph
    #
    #     with (
    #         patch(_PARSE_LLM, return_value=_json_llm({})),
    #         patch(_PORTFOLIO_LLM, return_value=_json_llm(_PORTFOLIO_RESPONSE)),
    #         patch(_COMMENTARY_LLM, return_value=_str_llm(_COMMENTARY_TEXT)),
    #         patch(_TAVILY, MagicMock()),
    #         patch(_DATA_FETCHER, return_value=sample_financial_data),
    #     ):
    #         graph = compile_stock_advisory_graph()
    #         state = graph.invoke({"initial_request": "", "lang": "en"})
    #
    #     assert state.get("final_report") is not None
    #     report = state["final_report"].lower()
    #     assert "error" in report or "failed" in report

    def test_metrics_included_in_final_state(self, sample_financial_data):
        state = self._run_graph(
            "I want a balanced portfolio.",
            "en",
            sample_financial_data,
        )
        assert state.get("metrics") is not None
        metrics = state["metrics"]
        non_portfolio_assets = [k for k in metrics if k != "portfolio"]
        assert len(non_portfolio_assets) > 0
