"""Agent 8: Structure final output report."""
from typing import Any, Dict

from ..states.workflow_state import StockAdvisoryState
from src.fin_agents.core.finance.report import structure_output_report


class ReportAgent:
    """Assembles the final Markdown report from the complete workflow state."""

    name = "structure_output"
    description = "Structures and formats the final Markdown portfolio report"

    def __init__(self, config: Dict = None):
        self._config = config or {}

    def invoke(self, state: StockAdvisoryState) -> Dict[str, Any]:
        return {"final_report": structure_output_report(state), "step": self.name}

    @property
    def output_keys(self) -> tuple[str, ...]:
        return ("final_report", "step")


class ErrorAgent:
    """Handles any error encountered in the workflow pipeline."""

    name = "handle_error"
    description = "Formats error state into a user-friendly failure report"

    def __init__(self, config: Dict = None):
        self._config = config or {}

    def invoke(self, state: StockAdvisoryState) -> Dict[str, Any]:
        error = state.get("error_message") or state.get("error") or "An unspecified error occurred."
        error_report = (
            f"# Portfolio Generation Failed\n\nAn error occurred:\n\n```\n{error}\n```\n\n"
            "Please review the input or contact support."
        )
        return {"final_report": error_report, "step": self.name}

    @property
    def output_keys(self) -> tuple[str, ...]:
        return ("final_report", "step")
