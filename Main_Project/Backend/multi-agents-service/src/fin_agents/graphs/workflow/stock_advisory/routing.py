"""Backward-compat shim — re-exports routing functions from the new routing module.

The canonical routing functions live in routing/ directory.
This file is kept so existing imports don't break during migration.
"""
# Import from routing/__init__.py (which exposes all should_proceed_after_* names)
from src.fin_agents.graphs.workflow.stock_advisory.routing import (
    RoutingRegistry,
    should_proceed_after_parsing,
    should_proceed_after_data_fetch,
    should_proceed_after_proposal,
    should_proceed_after_validation,
)
