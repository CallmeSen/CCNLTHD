"""State model for the stock analysis workflow."""

from typing import Any, Dict, TypedDict


class StockAnalysisState(TypedDict, total=False):
    """State for analysis of one or more stock tickers."""

    message: str
    lang: str
    tickers: list[str]
    company_names: list[str]
    goal: str
    personalization_context: Dict[str, Any]
    market_news: str
    financial_data: Dict[str, Any]
    metrics: Dict[str, Any]
    report: str
    error_message: str
