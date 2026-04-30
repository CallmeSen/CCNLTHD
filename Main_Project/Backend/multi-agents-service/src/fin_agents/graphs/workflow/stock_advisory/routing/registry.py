"""Central routing registry - maps agent name -> routing function."""
from typing import Callable, Dict


class RoutingRegistry:
    """Maps each agent to its routing decision function.

    Routing functions are registered via the ``@register_routing`` decorator.
    Each routing function takes the post-invoke state and returns
    the name of the next node to visit.
    """

    _routes: Dict[str, Callable] = {}

    @classmethod
    def register(cls, agent_name: str, route_fn: Callable) -> None:
        """Associate a routing function with an agent name."""
        cls._routes[agent_name] = route_fn

    @classmethod
    def get_route(cls, agent_name: str) -> Callable:
        """Return the routing function for an agent, or a default that goes to END."""
        return cls._routes.get(agent_name, lambda state: "END")

    @classmethod
    def list_routes(cls) -> Dict[str, Callable]:
        """Return a copy of all registered routes."""
        return dict(cls._routes)


def register_routing(agent_name: str) -> Callable:
    """Decorator to register a routing function for a specific agent.

    Usage::

        @register_routing("parse_user_request")
        def route_after_parsing(state: StockAdvisoryState) -> str:
            if state.get("error_message"):
                return "handle_error"
            return "fetch_market_news"
    """
    def decorator(fn: Callable) -> Callable:
        RoutingRegistry.register(agent_name, fn)
        return fn
    return decorator
