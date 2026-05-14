"""Agent registry - single source of truth for all agents."""
from typing import Dict, List

from .base import AgentProtocol


class AgentRegistry:
    """Central registry for all agents in the stock advisory workflow.

    Agents self-register at import time. The registry provides
    lookup, listing, and execution-order capabilities.
    """

    _agents: Dict[str, AgentProtocol] = {}

    @classmethod
    def register(cls, agent: AgentProtocol) -> None:
        """Register an agent instance by its name."""
        cls._agents[agent.name] = agent

    @classmethod
    def get(cls, name: str) -> AgentProtocol:
        """Retrieve an agent by name. Raises KeyError if not found."""
        if name not in cls._agents:
            available = ", ".join(cls._agents.keys())
            raise KeyError(f"Agent '{name}' not found. Available: {available}")
        return cls._agents[name]

    @classmethod
    def list_agents(cls) -> List[str]:
        """Return names of all registered agents."""
        return list(cls._agents.keys())

    @classmethod
    def get_execution_order(cls) -> List[str]:
        """Return the canonical ordered list of agent names for the stock advisory pipeline."""
        return [
            "parse_user_request",
            "fetch_market_news",
            "fetch_data",
            "calculate_metrics",
            "propose_portfolio",
            "validate_portfolio",
            "generate_commentary",
            "structure_output",
            "handle_error",
        ]

    @classmethod
    def clear(cls) -> None:
        """Clear all registered agents. Primarily for testing."""
        cls._agents.clear()
