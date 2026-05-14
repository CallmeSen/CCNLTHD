"""Routing after validate_portfolio node."""
from ..states.workflow_state import StockAdvisoryState
from .registry import register_routing


@register_routing("validate_portfolio")
def route_after_validation(state: StockAdvisoryState) -> str:
    """Route after validation: go to generate_commentary, or handle_error."""
    if state.get("error_message"):
        return "handle_error"
    validation = state.get("validation_result", {})
    if isinstance(validation, dict) and validation.get("status", "pass").lower() != "pass":
        state["error_message"] = (
            f"Portfolio validation failed: {validation.get('errors', 'Unknown error')}"
        )
        return "handle_error"
    return "generate_commentary"
