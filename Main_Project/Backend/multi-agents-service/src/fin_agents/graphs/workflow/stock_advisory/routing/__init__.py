"""Routing module - per-agent routing functions.

Each file implements routing logic for a specific agent.
Routing functions are auto-registered via the @register_routing decorator
when this module is imported.

Backward-compat re-exports:
    should_proceed_after_parsing     -> parse_routing.route_after_parsing
    should_proceed_after_data_fetch -> data_routing.route_after_data_fetch
    should_proceed_after_proposal   -> portfolio_routing.route_after_proposal
    should_proceed_after_validation -> validation_routing.route_after_validation
"""
from . import parse_routing    # noqa: F401 — triggers @register_routing
from . import data_routing     # noqa: F401
from . import portfolio_routing  # noqa: F401
from . import validation_routing  # noqa: F401

from .registry import RoutingRegistry, register_routing

# Backward-compat re-exports so existing code importing from
# "stock_advisory.routing" still works (e.g. tests, old nodes.py).
from .parse_routing import route_after_parsing as should_proceed_after_parsing
from .data_routing import route_after_data_fetch as should_proceed_after_data_fetch
from .portfolio_routing import route_after_proposal as should_proceed_after_proposal
from .validation_routing import route_after_validation as should_proceed_after_validation

__all__ = [
    "RoutingRegistry",
    "register_routing",
    "should_proceed_after_parsing",
    "should_proceed_after_data_fetch",
    "should_proceed_after_proposal",
    "should_proceed_after_validation",
]
