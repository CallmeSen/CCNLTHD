"""Agent 2: Fetch market news."""
import logging
from typing import Any, Dict

from src.fin_agents.core.finance.data_fetcher import fetch_market_news

logger = logging.getLogger(__name__)


class NewsAgent:
    """Fetches relevant market news via Tavily API."""

    name = "fetch_market_news"
    description = "Fetches relevant market news for the asset universe"

    def __init__(self, config: Dict = None):
        self._config = config or {}

    def invoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        result = fetch_market_news(state)
        if not result:
            return {"market_news": None, "step": self.name}
        result["step"] = self.name
        return result

    @property
    def output_keys(self) -> tuple[str, ...]:
        return ("market_news", "step")

    def route_next(self, state: Dict[str, Any]) -> str:
        return "fetch_data"
