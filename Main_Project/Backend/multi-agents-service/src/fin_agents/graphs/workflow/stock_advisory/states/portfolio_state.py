"""Partial state: Portfolio domain."""
from typing import Dict, Optional, TypedDict


class PortfolioState(TypedDict, total=False):
    """State fields related to portfolio allocation and generation."""

    proposed_portfolio: Optional[Dict[str, float]]
    llm_commentary: Optional[str]
