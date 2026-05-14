"""Routing after parse_user_request node."""
from ..states.workflow_state import StockAdvisoryState
from .registry import register_routing


@register_routing("parse_user_request")
def route_after_parsing(state: StockAdvisoryState) -> str:
    """Route after parsing: go to news, or handle_error."""
    if state.get("error_message"):
        return "handle_error"
    if not state.get("asset_universe"):
        state["error_message"] = "No assets were identified."
        return "handle_error"
    return "fetch_market_news"
