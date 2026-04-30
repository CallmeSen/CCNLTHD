"""Agent 4: Calculate financial metrics."""
import logging
from typing import Any, Dict

from ..states.workflow_state import StockAdvisoryState
from src.fin_agents.core.finance.metrics import calculate_metrics_node as _calculate_metrics_node

logger = logging.getLogger(__name__)


class MetricsAgent:
    """Computes CAPM, Sharpe, Beta, SMA, Drawdown for each asset."""

    name = "calculate_metrics"
    description = "Computes CAPM, Sharpe ratio, Beta, SMA, and drawdown metrics"

    def __init__(self, config: Dict = None):
        self._config = config or {}

    def invoke(self, state: StockAdvisoryState) -> Dict[str, Any]:
        result = _calculate_metrics_node(state)
        if not result:
            return {"metrics": None, "step": self.name}
        result["step"] = self.name
        return result

    @property
    def output_keys(self) -> tuple[str, ...]:
        return ("metrics", "step")

    def route_next(self, state: StockAdvisoryState) -> str:
        if state.get("error_message"):
            return "handle_error"
        metrics = state.get("metrics")
        if not metrics or not isinstance(metrics, dict) or not any(k for k in metrics if k not in ("portfolio", "error")):
            return "handle_error"
        return "propose_portfolio"
