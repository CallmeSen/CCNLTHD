"""Agent 6: Validate portfolio against risk constraints."""
import logging
from typing import Any, Dict

from src.fin_agents.core.finance.metrics import (
    validate_portfolio_calculations,
    calculate_financial_metrics,
)

logger = logging.getLogger(__name__)


class ValidationAgent:
    """Validates the proposed portfolio for risk alignment and weight correctness."""

    name = "validate_portfolio"
    description = "Validates portfolio weights, sums to 1.0, and risk alignment"

    def __init__(self, config: Dict = None):
        self._config = config or {}

    def invoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        portfolio = state.get("proposed_portfolio")
        metrics = state.get("metrics")
        financial_data = state.get("financial_data")
        recalculated_metrics: Dict = {}

        if portfolio and financial_data:
            portfolio_metrics_update = calculate_financial_metrics(
                data=financial_data, portfolio=portfolio
            )
            if "portfolio" in portfolio_metrics_update:
                if metrics is None:
                    metrics = {}
                metrics["portfolio"] = portfolio_metrics_update["portfolio"]
                recalculated_metrics = {"metrics": metrics}
            elif "error" in portfolio_metrics_update:
                if metrics is None:
                    metrics = {}
                metrics["portfolio"] = {"error": portfolio_metrics_update["error"]}
                recalculated_metrics = {"metrics": metrics}

        validation_result = validate_portfolio_calculations(portfolio=portfolio, metrics=metrics)
        final_update = recalculated_metrics.copy()
        final_update["validation_result"] = validation_result
        if not final_update:
            return {"validation_result": None, "step": self.name}
        final_update["step"] = self.name
        return final_update

    @property
    def output_keys(self) -> tuple[str, ...]:
        return ("validation_result", "metrics", "step")

    def route_next(self, state: Dict[str, Any]) -> str:
        if state.get("error_message"):
            return "handle_error"
        validation = state.get("validation_result", {})
        if isinstance(validation, dict) and validation.get("status", "pass").lower() != "pass":
            state["error_message"] = f"Portfolio validation failed: {validation.get('errors', 'Unknown error')}"
            return "handle_error"
        return "generate_commentary"
