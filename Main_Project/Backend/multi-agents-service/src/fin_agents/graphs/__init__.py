"""
Graphs Package - LangGraph workflow components.

Provides centralized access to all workflows via the registry.
"""

from src.fin_agents.graphs.registry import (
    WORKFLOWS,
    get_workflow,
    list_workflows,
    auto_detect_workflow,
    WorkflowEntry,
)
