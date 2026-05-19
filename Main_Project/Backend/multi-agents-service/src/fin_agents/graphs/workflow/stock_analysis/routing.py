"""Routing helpers for the stock analysis workflow."""

from src.fin_agents.graphs.workflow.stock_analysis.state import StockAnalysisState


def route_after_parse(state: StockAnalysisState) -> str:
    if state.get("error_message"):
        return "general_chat_fallback"
    return "resolve_company_names"


def route_after_resolve(state: StockAnalysisState) -> str:
    if state.get("error_message"):
        return "general_chat_fallback"
    if not state.get("tickers"):
        return "general_chat_fallback"
    return "fetch_news"


def route_after_news(state: StockAnalysisState) -> str:
    if state.get("error_message"):
        return "handle_error"
    return "fetch_data"


def route_after_data(state: StockAnalysisState) -> str:
    if state.get("error_message"):
        return "handle_error"
    if not state.get("financial_data"):
        return "handle_error"
    return "calculate_metrics"


def route_after_metrics(state: StockAnalysisState) -> str:
    if state.get("error_message"):
        return "handle_error"
    return "structure_output"
