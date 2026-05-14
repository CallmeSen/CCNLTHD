"""Backward-compat shim — re-exports from the new states module.

The canonical StockAdvisoryState lives in states/workflow_state.py.
This file is kept so existing imports don't break during migration.
"""
from src.fin_agents.graphs.workflow.stock_advisory.states.workflow_state import (
    StockAdvisoryState,
)
