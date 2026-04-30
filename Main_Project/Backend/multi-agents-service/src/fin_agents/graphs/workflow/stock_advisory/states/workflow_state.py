"""Composed workflow state + base fields."""
from typing import TypedDict, Optional

from .market_state import MarketState
from .risk_state import RiskState
from .portfolio_state import PortfolioState


class BaseWorkflowState(TypedDict, total=False):
    """Base workflow fields used across the entire pipeline."""

    initial_request: str
    final_report: Optional[str]
    error_message: Optional[str]
    step: Optional[str]


class StockAdvisoryState(MarketState, RiskState, PortfolioState, BaseWorkflowState):
    """Full composed state for the stock advisory workflow.

    Inherits from all partial states to produce a single flat TypedDict
    that covers every field used by every node in the graph.
    """

    pass
