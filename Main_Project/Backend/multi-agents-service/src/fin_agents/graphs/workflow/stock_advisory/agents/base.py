"""Base Protocol for all agents in the stock advisory workflow."""
from typing import Any, Dict, Protocol, runtime_checkable


@runtime_checkable
class AgentProtocol(Protocol):
    """Protocol that every agent must implement.

    Agents are self-contained units that:
    - Have a unique name and description
    - Produce deterministic state updates via invoke()
    - Declare their output keys
    - Provide their own routing decision
    """

    name: str
    description: str

    def invoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the agent logic and return state update dict."""
        ...

    @property
    def output_keys(self) -> tuple[str, ...]:
        """Keys that this agent writes into the state."""
        ...

    def route_next(self, state: Dict[str, Any]) -> str:
        """Given the (post-invoke) state, return the name of the next agent."""
        ...
