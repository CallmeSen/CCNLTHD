"""
Tools Package - External service clients and LangChain @tool definitions.
"""
from src.fin_agents.tools.user_service_client import UserServiceClient
from src.fin_agents.tools.portfolio_service_client import (
    PortfolioServiceClient,
)
from src.fin_agents.tools.market_data_service_client import (
    MarketDataServiceClient,
)
from src.fin_agents.tools.notification_service_client import (
    NotificationServiceClient,
)
from src.fin_agents.tools.market_news_tool import fetch_market_news_tool
from src.fin_agents.tools.output_tool import structure_output_tool
from src.fin_agents.tools.error_tool import handle_error_tool
from src.fin_agents.tools.langchain_tools import (
    TOOLS,
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
)

__all__ = [
    # HTTP clients
    "UserServiceClient",
    "PortfolioServiceClient",
    "MarketDataServiceClient",
    "NotificationServiceClient",
    # Plain function tools
    "fetch_market_news_tool",
    "structure_output_tool",
    "handle_error_tool",
    # LangChain @tool definitions
    "TOOLS",
    "get_client_profile",
    "get_client_advisory_history",
    "get_portfolio_snapshot",
    "get_portfolio_holdings",
    "get_fund_details",
    "get_nav_history",
    "get_sector_returns",
    "search_market_news",
    "structure_output_tool_node",
    "generate_error_report",
]
