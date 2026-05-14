"""
Tool: fetch_market_news
Fetches relevant market news via Tavily API based on user profile.
"""
import logging
from typing import Dict

from langchain_community.tools.tavily_search.tool import TavilySearchResults

from src.fin_agents.core.config import TAVILY_API_KEY

logger = logging.getLogger(__name__)


def fetch_market_news_tool(state: Dict) -> Dict:
    """
    Tool: fetch_market_news
    Fetches relevant market news via Tavily API based on user profile.
    """
    tavily_tool = TavilySearchResults(max_results=3) if TAVILY_API_KEY else None
    logger.info("Tool: Fetching Market News...")
    if not tavily_tool:
        logger.warning("Tavily not configured, skipping news fetch.")
        return {"market_news": "N/A (Tool not configured)"}
    user_profile = state.get("user_profile", {})
    query = (
        f"Recent market news relevant to investment goal '{user_profile.get('goal', 'general investing')}' "
        f"with risk tolerance '{user_profile.get('risk_tolerance', 'medium')}'"
    )
    if state.get("asset_universe"):
        query += f" focusing on assets like {', '.join(state['asset_universe'])}"
    try:
        news_results = tavily_tool.invoke({"query": query})
        formatted = "\n".join([f"- {item['content']}" for item in news_results]) if news_results else "No news found."
        logger.info(f"News fetched: {formatted[:200]}...")
        return {"market_news": formatted}
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        return {"market_news": f"Failed to fetch news: {e}"}
