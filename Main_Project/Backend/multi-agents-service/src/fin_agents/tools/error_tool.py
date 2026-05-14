"""
Tool: handle_error
Centralized error handling for the portfolio generation workflow.
"""
import logging
from typing import Dict

logger = logging.getLogger(__name__)


def handle_error_tool(state: Dict) -> Dict:
    """
    Tool: handle_error
    Centralized error handling. Generates a standardized error report
    and logs the error for audit purposes.
    """
    error = state.get("error_message", "An unspecified error occurred.")
    node = state.get("step", "unknown")
    logger.error(f"Error at node '{node}': {error}")
    error_report = (
        f"# Portfolio Generation Failed\n\n"
        f"An error occurred during the '{node}' step:\n\n"
        f"```\n{error}\n```\n\n"
        "Please review your input or contact support if the problem persists."
    )
    return {
        "final_report": error_report,
        "error_logged": True,
        "step": "handle_error",
    }
