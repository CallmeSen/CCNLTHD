"""Partial state: Market data domain."""
from typing import Dict, List, Optional, TypedDict


class MarketState(TypedDict, total=False):
    """State fields related to market data fetching and financial data."""

    asset_universe: Optional[List[str]]
    market_news: Optional[str]
    financial_data: Optional[Dict]
