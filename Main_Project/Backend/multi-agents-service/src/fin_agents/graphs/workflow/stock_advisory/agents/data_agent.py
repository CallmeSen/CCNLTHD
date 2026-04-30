"""Agent 3: Fetch financial data for assets."""
import logging
from typing import Any, Dict

from ..states.workflow_state import StockAdvisoryState
from src.fin_agents.core.finance.data_fetcher import fetch_data_node

logger = logging.getLogger(__name__)


class DataAgent:
    """Fetches OHLCV and fundamental data for each asset in the universe."""

    name = "fetch_data"
    description = "Fetches financial data (OHLCV, fundamentals) for asset universe"

    def __init__(self, config: Dict = None):
        self._config = config or {}

    def invoke(self, state: StockAdvisoryState) -> Dict[str, Any]:
        result = fetch_data_node(state)
        if not result:
            return {"financial_data": None, "step": self.name}
        result["step"] = self.name
        return result

    @property
    def output_keys(self) -> tuple[str, ...]:
        return ("financial_data", "step")

    def route_next(self, state: StockAdvisoryState) -> str:
        if state.get("error_message"):
            return "handle_error"
        if not state.get("financial_data"):
            return "handle_error"
        return "calculate_metrics"
