"""
Data fetching services: yfinance wrapper and Tavily news.
"""
import logging
import time
import datetime
from typing import Dict, List, Optional, TypedDict

import pandas as pd
import yfinance as yf

from src.fin_agents.core.config import BENCHMARK_TICKER, DEFAULT_PERIOD

logger = logging.getLogger(__name__)


def fetch_financial_data(
    tickers: List[str],
    period: str = "1y",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Dict[str, pd.DataFrame]:
    """Fetches historical stock data using yfinance."""
    fetch_method_info = f"Start: {start_date}, End: {end_date}" if start_date and end_date else f"Period: {period}"
    logger.info(f"Fetching Financial Data for: {tickers} ({fetch_method_info})")
    data: Dict[str, pd.DataFrame] = {}
    if not tickers:
        logger.warning("No tickers provided for fetching data.")
        return data
    try:
        for ticker in tickers:
            ticker = ticker.upper().strip()
            tkr = yf.Ticker(ticker)
            hist = pd.DataFrame()
            if start_date and end_date:
                hist = tkr.history(start=start_date, end=end_date)
                if hist.empty:
                    logger.warning(f"No history data found for {ticker} between {start_date} and {end_date}.")
            else:
                hist = tkr.history(period=period)
                if hist.empty:
                    logger.warning(f"No history data found for {ticker} for period: {period}.")
            if hist.empty:
                try:
                    info = tkr.info
                    if not info or ("symbol" not in info and "longName" not in info):
                        logger.warning(f"Ticker {ticker} might be invalid or delisted. Skipping.")
                        continue
                    else:
                        logger.info(f"Info found for {ticker}, but no history. Skipping.")
                        continue
                except Exception as info_e:
                    logger.warning(f"Could not verify ticker {ticker} info: {info_e}. Skipping.")
                    continue
            hist.index = pd.to_datetime(hist.index).tz_localize(None)
            # yfinance may return multi-index columns like (Close, ACB) — flatten them
            if isinstance(hist.columns, pd.MultiIndex):
                hist.columns = [col[0].lower() for col in hist.columns]
            else:
                hist.columns = hist.columns.str.lower()
            if "close" not in hist.columns:
                logger.warning(f"'close' column missing for {ticker}. Skipping.")
                continue
            data[ticker] = hist
            logger.info(f"Successfully fetched data for {ticker}.")
            time.sleep(0.5)
        logger.info(f"Successfully fetched data for: {list(data.keys())}")
        if not data:
            logger.warning("Failed to fetch valid data for ALL requested tickers.")
        return data
    except Exception as e:
        logger.error(f"Error during financial data fetching process: {e}")
        return data


def fetch_market_news(state: TypedDict) -> Dict:
    """Fetches relevant market news using Tavily based on user profile."""
    from langchain_community.tools.tavily_search.tool import TavilySearchResults
    from src.fin_agents.core.config import TAVILY_API_KEY

    tavily_tool = TavilySearchResults(max_results=3) if TAVILY_API_KEY else None
    logger.info("Fetching Market News...")
    if not tavily_tool:
        logger.warning("Tavily tool not available. Skipping market news.")
        return {"market_news": "N/A (Tool not configured)"}

    user_profile = state.get("user_profile", {})
    query = (
        f"Recent market news relevant to investment goal '{user_profile.get('goal', 'general investing')}' "
        f"with risk tolerance '{user_profile.get('risk_tolerance', 'medium')}'"
    )
    if state.get("asset_universe"):
        query += f" focusing on potential assets like {', '.join(state['asset_universe'])}"

    try:
        news_results = tavily_tool.invoke({"query": query})
        formatted_news = "\n".join([f"- {item['content']}" for item in news_results]) if news_results else "No specific news found."
        logger.info(f"News Query: {query}\nNews Found: {formatted_news[:200]}...")
        return {"market_news": formatted_news}
    except Exception as e:
        logger.error(f"Error fetching market news: {e}")
        return {"market_news": f"Failed to fetch news: {e}"}


def fetch_data_node(state: TypedDict) -> Dict:
    """Node to call financial data fetching, ensuring benchmark data is included."""
    asset_universe = state.get("asset_universe")
    user_profile = state.get("user_profile", {})
    if not asset_universe:
        asset_universe = user_profile.get("suggested_assets")
        if not asset_universe:
            logger.error("No asset universe identified to fetch data for.")
            return {"error_message": "Cannot fetch data: No assets were identified."}

    benchmark_ticker = BENCHMARK_TICKER
    tickers_to_fetch = list(asset_universe)
    if benchmark_ticker.upper() not in [t.upper() for t in tickers_to_fetch]:
        tickers_to_fetch.append(benchmark_ticker)
        logger.info(f"Added benchmark ticker {benchmark_ticker} for Beta calculation.")

    start_date_str = user_profile.get("start_date")
    end_date_str = user_profile.get("end_date")
    data: Dict[str, pd.DataFrame] = {}
    data_fetched_with_range = False

    if start_date_str and end_date_str:
        try:
            datetime.datetime.strptime(start_date_str, "%Y-%m-%d")
            datetime.datetime.strptime(end_date_str, "%Y-%m-%d")
            logger.info(f"Using specific date range: {start_date_str} to {end_date_str}")
            data = fetch_financial_data(tickers=tickers_to_fetch, start_date=start_date_str, end_date=end_date_str)
            data_fetched_with_range = True
        except ValueError:
            logger.warning(f"Invalid date format. Falling back to time_horizon-based period.")

    if not data_fetched_with_range:
        time_horizon_input = user_profile.get("time_horizon")
        period = "5y"
        years: Optional[int] = None
        if isinstance(time_horizon_input, str):
            if "year" in time_horizon_input.lower():
                try:
                    parts = time_horizon_input.lower().split("year")[0].strip()
                    years_str = parts.split("-")[-1].strip() if "-" in parts else parts.split()[-1].strip()
                    years = int(years_str)
                except Exception:
                    logger.warning(f"Could not parse years from '{time_horizon_input}'. Using default.")
            elif "long-term" in time_horizon_input.lower():
                years = 10
            elif "medium-term" in time_horizon_input.lower():
                years = 5
            elif "short-term" in time_horizon_input.lower():
                years = 1
            else:
                try:
                    years = int(time_horizon_input.strip())
                except ValueError:
                    logger.warning(f"Could not parse time_horizon '{time_horizon_input}'. Using default.")
        elif isinstance(time_horizon_input, int):
            years = time_horizon_input
        if years and years > 0:
            period = f"{years}y"
            logger.info(f"Setting data fetching period to: {period}")
        data = fetch_financial_data(tickers=tickers_to_fetch, period=period)

    if benchmark_ticker.upper() not in data or data[benchmark_ticker.upper()].empty:
        logger.error(f"Failed to fetch benchmark data ({benchmark_ticker}). Manual Beta calculation will be disabled.")

    if not data:
        return {"financial_data": data, "error_message": f"Failed to fetch ANY valid data."}

    valid_assets_in_universe = [t for t in asset_universe if t.upper() in data and t.upper() != benchmark_ticker.upper()]
    removed_assets = set(a.upper() for a in asset_universe) - set(data.keys()) - {benchmark_ticker.upper()}
    if removed_assets:
        logger.warning(f"Only fetched data for {len(valid_assets_in_universe)} out of {len(asset_universe)} assets. Missing: {removed_assets}")

    if not valid_assets_in_universe:
        return {
            "financial_data": data,
            "asset_universe": [],
            "error_message": f"Failed to fetch valid data for any of the requested assets ({list(set(a.upper() for a in asset_universe))}). Please verify the tickers are valid and try again.",
        }

    return {"financial_data": data, "asset_universe": valid_assets_in_universe}
