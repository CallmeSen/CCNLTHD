"""
Central workflow registry - single source of truth for all LangGraph workflows.

Provides centralized registry of available workflows with dynamic discovery,
routing, and orchestration capabilities.
"""
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Optional
import logging

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class WorkflowEntry:
    """Metadata and factory for a single LangGraph workflow."""

    id: str
    name: str
    description: str
    compile_fn: Callable[..., Any]
    state_class: type
    required_fields: tuple[str, ...] = field(default_factory=tuple)
    api_path: Optional[str] = None
    cache_enabled: bool = True


WORKFLOWS: Dict[str, WorkflowEntry] = {}


def register_workflow(entry: WorkflowEntry) -> None:
    """Register a workflow entry in the global registry."""
    WORKFLOWS[entry.id] = entry
    logger.info(f"Registered workflow: {entry.id} ({entry.name})")


def get_workflow(workflow_id: str) -> WorkflowEntry:
    """Lookup workflow by ID. Raises KeyError if not found."""
    if workflow_id not in WORKFLOWS:
        available = ", ".join(WORKFLOWS)
        raise KeyError(
            f"Workflow '{workflow_id}' not found. Available: {available}"
        )
    return WORKFLOWS[workflow_id]


def list_workflows() -> list[dict]:
    """Return lightweight metadata for all registered workflows."""
    return [
        {
            "id": w.id,
            "name": w.name,
            "description": w.description,
            "api_path": w.api_path,
            "required_fields": w.required_fields,
        }
        for w in WORKFLOWS.values()
    ]


def auto_detect_workflow(request_data: dict) -> WorkflowEntry:
    """
    Auto-detect the appropriate workflow from request data.

    Priority:
    1. Explicit ``workflow_id`` field
    2. Required fields match (first match wins)
    """
    if wid := request_data.get("workflow_id"):
        return get_workflow(wid)

    for wf in WORKFLOWS.values():
        if all(request_data.get(f) is not None for f in wf.required_fields):
            logger.info(f"Auto-detected workflow: {wf.id} ({wf.name})")
            return wf

    available = ", ".join(w.name for w in WORKFLOWS.values())
    raise ValueError(
        f"Cannot auto-detect workflow. "
        f"Please specify 'workflow_id' or provide required fields. "
        f"Available: {available}"
    )


def auto_discover_workflows() -> None:
    """Auto-register the stock_advisory workflow."""
    from src.fin_agents.graphs.workflow.stock_advisory.states.workflow_state import (
        StockAdvisoryState,
    )
    register_workflow(
        WorkflowEntry(
            id="stock_advisory",
            name="Stock Portfolio Generation",
            description="Tạo portfolio mới từ natural language request - stock screener, allocation, CAPM metrics",
            compile_fn=lambda: __import__(
                "src.fin_agents.graphs.workflow.stock_advisory.builder",
                fromlist=["compile_stock_advisory_graph"],
            ).compile_stock_advisory_graph(),
            state_class=StockAdvisoryState,
            required_fields=("initial_request",),
            api_path="/portfolio/analyze",
        )
    )


# Auto-discover workflows on import
auto_discover_workflows()
