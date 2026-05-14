"""Agents module for the stock advisory workflow.

Each agent is a self-contained unit that:
- Has a unique ``name`` and ``description``
- Implements ``invoke(state) -> Dict`` returning state updates
- Declares ``output_keys``
- Provides ``route_next(state) -> str`` for per-agent routing

Import agents through this module or via AgentRegistry.
"""
from .base import AgentProtocol
from .registry import AgentRegistry
from .agent_loader import load_agents

__all__ = [
    "AgentProtocol",
    "AgentRegistry",
    "load_agents",
]
