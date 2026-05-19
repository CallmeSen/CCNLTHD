"""
LangGraph builder for the stock advisory workflow.

Uses composition pattern: agents are loaded from AgentRegistry,
routing functions are loaded from RoutingRegistry, and the graph
is assembled programmatically from registered components.
"""

import logging

from langgraph.graph import StateGraph, END

from src.fin_agents.graphs.workflow.stock_advisory.states.workflow_state import StockAdvisoryState
from src.fin_agents.agents import AgentRegistry, load_agents
from src.fin_agents.graphs.workflow.stock_advisory.routing import RoutingRegistry

logger = logging.getLogger(__name__)


def build_stock_advisory_graph(agents=None) -> StateGraph:
    """
    Build and return the LangGraph StateGraph for stock advisory.

    Uses composition pattern:
    - Nodes are registered via AgentRegistry
    - Routing is resolved via RoutingRegistry

    Graph structure:
    ---------------
    parse_user_request
        ├─→ fetch_market_news ──→ fetch_data ──→ calculate_metrics
        │                                              │
        └─→ handle_error ←─────────────────────────────┤
                                                       │
    calculate_metrics ──→ propose_portfolio
                                  │
                    ├─→ handle_error
                    └─→ validate_portfolio
                                          │
                              ├─→ handle_error
                              └─→ generate_commentary
                                                    │
                                          ├─→ structure_output ──→ END
                                          └─→ handle_error ──→ END

    Returns StateGraph ready for compilation.
    """
    if agents is None:
        agents = load_agents()

    workflow = StateGraph(StockAdvisoryState)

    # ── Register nodes from AgentRegistry ────────────────────────────── #
    for agent_name in AgentRegistry.get_execution_order():
        try:
            agent = AgentRegistry.get(agent_name)
            workflow.add_node(agent.name, agent.invoke)
        except KeyError:
            logger.warning(f"Agent '{agent_name}' not found in registry, skipping.")

    # ── Entry point ──────────────────────────────────────────────────── #
    workflow.set_entry_point("parse_user_request")

    # ── Static edges ──────────────────────────────────────────────────── #
    workflow.add_edge("fetch_market_news", "fetch_data")
    workflow.add_edge("calculate_metrics", "propose_portfolio")
    workflow.add_edge("generate_commentary", "structure_output")
    workflow.add_edge("structure_output", END)
    workflow.add_edge("handle_error", END)

    # ── Conditional edges (resolved from RoutingRegistry) ────────────── #
    conditional_edges = [
        "parse_user_request",
        "fetch_data",
        "propose_portfolio",
        "validate_portfolio",
    ]

    for agent_name in conditional_edges:
        route_fn = RoutingRegistry.get_route(agent_name)
        workflow.add_conditional_edges(
            agent_name,
            route_fn,
            {
                "handle_error": "handle_error",
                "fetch_market_news": "fetch_market_news",
                "calculate_metrics": "calculate_metrics",
                "validate_portfolio": "validate_portfolio",
                "generate_commentary": "generate_commentary",
                "END": END,
            },
        )

    return workflow


def compile_stock_advisory_graph():
    """
    Build and compile the workflow graph.

    Returns
    -------
    CompiledStateGraph
        Runnable graph ready for invocation.
    """
    graph = build_stock_advisory_graph()
    return graph.compile()
