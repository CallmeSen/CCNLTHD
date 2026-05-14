"""
Stock Advisory Workflow - LangGraph portfolio generation pipeline.

This module contains the complete stock portfolio generation workflow:
- state: TypedDict state definition
- prompts: System prompts for each node
- routing: Conditional edge functions
- nodes: 9 LangGraph node functions
- builder: Graph assembly and compilation
"""

from src.fin_agents.graphs.workflow.stock_advisory.state import StockAdvisoryState


def build_stock_advisory_graph():
    from src.fin_agents.graphs.workflow.stock_advisory.builder import build_stock_advisory_graph as _build
    return _build()


def compile_stock_advisory_graph():
    from src.fin_agents.graphs.workflow.stock_advisory.builder import compile_stock_advisory_graph as _compile
    return _compile()
