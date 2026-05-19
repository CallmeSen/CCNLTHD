"""Shared agents for financial workflows.

Each agent is a self-contained unit that:
- Has a unique ``name`` and ``description``
- Implements ``invoke(state) -> Dict`` returning state updates
- Declares ``output_keys``
- Provides ``route_next(state) -> str`` for per-agent routing

Workflows should import agents through this module or via AgentRegistry so
instances can be reused instead of recreated.
"""
from .base import AgentProtocol
from .registry import AgentRegistry
from .agent_loader import get_agent, load_agents

__all__ = [
    "AgentProtocol",
    "AgentRegistry",
    "get_agent",
    "load_agents",
]
