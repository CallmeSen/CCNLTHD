"""Routing after fetch_data node."""
from ..states.workflow_state import StockAdvisoryState
from .registry import register_routing


@register_routing("fetch_data")
def route_after_data_fetch(state: StockAdvisoryState) -> str:
    """Route after data fetch: go to calculate_metrics, or handle_error."""
    if state.get("error_message"):
        return "handle_error"
    if not state.get("financial_data"):
        state["error_message"] = "No financial data fetched."
        return "handle_error"
    return "calculate_metrics"
