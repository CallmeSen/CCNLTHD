"""Routing after propose_portfolio node."""
from ..states.workflow_state import StockAdvisoryState
from .registry import register_routing


@register_routing("propose_portfolio")
def route_after_proposal(state: StockAdvisoryState) -> str:
    """Route after portfolio proposal: go to validate, or handle_error."""
    if state.get("error_message"):
        return "handle_error"
    if not state.get("proposed_portfolio"):
        state["error_message"] = "No portfolio proposed."
        return "handle_error"
    return "validate_portfolio"
