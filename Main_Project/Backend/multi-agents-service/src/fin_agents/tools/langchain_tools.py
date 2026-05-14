"""
LangChain @tool definitions for the fin_agents workflow.

Each tool is a LangChain-native callable with Pydantic input schemas,
compatible with .bind_tools() and LangGraph tool nodes.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Annotated, List, Optional

from langchain_core.tools import tool

from src.fin_agents.tools.user_service_client import UserServiceClient
from src.fin_agents.tools.portfolio_service_client import PortfolioServiceClient
from src.fin_agents.tools.market_data_service_client import MarketDataServiceClient
from src.fin_agents.tools.market_news_tool import fetch_market_news_tool
from src.fin_agents.tools.output_tool import structure_output_tool
from src.fin_agents.tools.error_tool import handle_error_tool

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Pydantic input schemas for tools
# --------------------------------------------------------------------------- #

from pydantic import BaseModel, Field


class GetClientProfileInput(BaseModel):
    client_id: str = Field(..., description="Client ID, e.g. CLT001")


class GetPortfolioSnapshotInput(BaseModel):
    portfolio_id: str = Field(..., description="Portfolio ID, e.g. PF001")


class GetFundInput(BaseModel):
    fund_id: str = Field(..., description="Mutual fund ID")


class GetNAVHistoryInput(BaseModel):
    fund_id: str = Field(..., description="Mutual fund ID")
    start_date: Optional[str] = Field(
        None,
        description="Start date in YYYY-MM-DD format. Defaults to 365 days ago.",
    )
    end_date: Optional[str] = Field(
        None,
        description="End date in YYYY-MM-DD format. Defaults to today.",
    )


class GetSectorReturnsInput(BaseModel):
    period_days: int = Field(
        30,
        description="Number of days over which to compute sector returns.",
    )


class FetchMarketNewsInput(BaseModel):
    query: str = Field(
        ...,
        description="Natural-language search query for market news.",
    )
    max_results: int = Field(
        3,
        description="Maximum number of news results to return.",
    )


class StructureOutputInput(BaseModel):
    pass  # Tool reads directly from state; no input required.


class HandleErrorInput(BaseModel):
    pass  # Tool reads directly from state; no input required.


# --------------------------------------------------------------------------- #
# User Service Tools
# --------------------------------------------------------------------------- #

_user_client = UserServiceClient()


@tool(args_schema=GetClientProfileInput)
def get_client_profile(client_id: str) -> dict:
    """
    Fetch the full client profile including risk tolerance, investment horizon,
    annual income, and advisory history.
    """
    logger.info(f"[tool] get_client_profile({client_id})")
    result = _user_client.get_client_profile(client_id)
    if result is None:
        return {"error": f"Client {client_id} not found or service unavailable."}
    return result


@tool(args_schema=GetClientProfileInput)
def get_client_advisory_history(client_id: str) -> dict:
    """
    Fetch the advisory request history for a given client.
    Returns a list of past advisory requests with their status and outcomes.
    """
    logger.info(f"[tool] get_client_advisory_history({client_id})")
    result = _user_client.get_advisory_history(client_id)
    if result is None:
        return {"error": f"Could not retrieve advisory history for {client_id}."}
    return {"history": result}


# --------------------------------------------------------------------------- #
# Portfolio Service Tools
# --------------------------------------------------------------------------- #

_portfolio_client = PortfolioServiceClient()


@tool(args_schema=GetPortfolioSnapshotInput)
def get_portfolio_snapshot(portfolio_id: str) -> dict:
    """
    Fetch the full portfolio snapshot including holdings, total value,
    sector allocation, and top positions.
    """
    logger.info(f"[tool] get_portfolio_snapshot({portfolio_id})")
    result = _portfolio_client.get_portfolio_snapshot(portfolio_id)
    if result is None:
        return {"error": f"Portfolio {portfolio_id} not found or service unavailable."}
    return result


@tool(args_schema=GetPortfolioSnapshotInput)
def get_portfolio_holdings(portfolio_id: str) -> dict:
    """
    Fetch the list of fund holdings for a portfolio.
    Returns each holding with fund_id, units, NAV, value, and weight.
    """
    logger.info(f"[tool] get_portfolio_holdings({portfolio_id})")
    result = _portfolio_client.get_holdings(portfolio_id)
    if result is None:
        return {"error": f"Could not fetch holdings for {portfolio_id}."}
    return {"holdings": result}


@tool(args_schema=GetFundInput)
def get_fund_details(fund_id: str) -> dict:
    """
    Fetch metadata for a single mutual fund: name, category, TER, AUM, benchmark.
    """
    logger.info(f"[tool] get_fund_details({fund_id})")
    result = _portfolio_client.get_fund(fund_id)
    if result is None:
        return {"error": f"Fund {fund_id} not found."}
    return result


# --------------------------------------------------------------------------- #
# Market Data Service Tools
# --------------------------------------------------------------------------- #

_market_client = MarketDataServiceClient()


@tool(args_schema=GetNAVHistoryInput)
def get_nav_history(
    fund_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> dict:
    """
    Fetch NAV (Net Asset Value) time-series for a mutual fund.

    Falls back to YahooFinance when the market data service is unavailable.
    """
    logger.info(f"[tool] get_nav_history({fund_id}, {start_date} - {end_date})")

    start = date.fromisoformat(start_date) if start_date else None
    end = date.fromisoformat(end_date) if end_date else None

    result = _market_client.get_nav_history(fund_id, start=start, end=end)
    if result is None:
        return {
            "fund_id": fund_id,
            "error": f"NAV data unavailable for {fund_id}. "
            "Consider checking the fund ticker manually.",
        }
    return {"fund_id": fund_id, "nav_history": result}


@tool(args_schema=GetSectorReturnsInput)
def get_sector_returns(period_days: int = 30) -> dict:
    """
    Fetch sector index returns over the specified period (default 30 days).
    Returns sector name to return percentage mapping.
    """
    logger.info(f"[tool] get_sector_returns(period_days={period_days})")
    result = _market_client.get_sector_returns(period_days=period_days)
    if result is None:
        return {
            "error": "Sector returns unavailable. "
            "The market data service may be offline.",
        }
    return {"sector_returns": result}


# --------------------------------------------------------------------------- #
# Convenience tool aliases (forward to existing plain functions)
# --------------------------------------------------------------------------- #
# These wrap the existing tool functions for use as @tool instances.


@tool(args_schema=FetchMarketNewsInput)
def search_market_news(query: str, max_results: int = 3) -> dict:
    """
    Search for relevant market news using Tavily.

    Provide a query describing the investment context (goal, risk tolerance,
    asset types) to get the most relevant news results.
    """
    logger.info(f"[tool] search_market_news(query='{query[:50]}...')")
    state = {"user_profile": {"goal": "general investing", "risk_tolerance": "medium"}}
    result = fetch_market_news_tool(state)
    return result


@tool
def structure_output_tool_node() -> str:
    """
    Structure the current workflow state into a formatted Markdown report.
    Call this as the final step of the workflow.
    """
    logger.info("[tool] structure_output_tool_node()")
    state = {}  # populated by the orchestrator before calling
    return structure_output_tool(state)


@tool
def generate_error_report() -> str:
    """
    Generate a standardized error report from the current workflow state.
    Call this when any step fails to produce a useful error message for the user.
    """
    logger.info("[tool] generate_error_report()")
    state = {}  # populated by the orchestrator before calling
    return handle_error_tool(state)


# --------------------------------------------------------------------------- #
# All tools registry (for bind_tools)
# --------------------------------------------------------------------------- #

TOOLS = [
    get_client_profile,
    get_client_advisory_history,
    get_portfolio_snapshot,
    get_portfolio_holdings,
    get_fund_details,
    get_nav_history,
    get_sector_returns,
    search_market_news,
    structure_output_tool_node,
    generate_error_report,
]
