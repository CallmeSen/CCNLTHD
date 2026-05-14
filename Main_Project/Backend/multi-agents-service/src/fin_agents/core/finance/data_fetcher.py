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


def _is_vn_ticker(ticker: str) -> bool:
    """Detect Vietnam Exchange tickers."""
    t = ticker.upper().strip()
    if t.endswith(".VN"):
        return True
    VN_COMMON = {
        "HPG", "VCB", "VNM", "FPT", "SSI", "BID", "CTG", "MBB", "TPB",
        "STB", "ACB", "VPB", "TCB", "MSB", "NLG", "PNJ", "REE", "PVT",
        "GAS", "PVD", "PLX", "BSR", "VIC", "VHM", "NVL", "BCM", "MWG",
        "DGW", "FTM", "DRC", "VHC", "GMD", "VJC", "HVN", "SKG", "SBT",
        "VRE", "VND", "OGN", "CTS", "VDS", "VDB", "SHS", "HCM", "SSI",
        "VN30", "VN100", "VNMID", "VNSML", "HNX", "HNX30", "UPCOM",
        "VNINDEX", "VN30F", "DAF", "E1VFVN30",
    }
    return t in VN_COMMON


# yfinance suffix mapping for VN exchanges
# HOSE (Ho Chi Minh Stock Exchange) -> .HM
# HNX (Hanoi Stock Exchange) -> .HN
# UPCOM -> .VN
_VN_YF_SUFFIX_MAP = {
    # HOSE blue chips / large cap
    "VNM": "VNM.HM",
    "HPG": "HPG.HM",
    "FPT": "FPT.HM",
    "VCB": "VCB.HM",
    "BID": "BID.HM",
    "CTG": "CTG.HM",
    "VPB": "VPB.HM",
    "TCB": "TCB.HM",
    "MBB": "MBB.HM",
    "ACB": "ACB.HM",
    "STB": "STB.HM",
    "SSI": "SSI.HM",
    "TPB": "TPB.HM",
    "MSB": "MSB.HM",
    "GAS": "GAS.HM",
    "PLX": "PLX.HM",
    "BSR": "BSR.HM",
    "PVD": "PVD.HM",
    "VIC": "VIC.HM",
    "VHM": "VHM.HM",
    "NVL": "NVL.HM",
    "BCM": "BCM.HM",
    "MWG": "MWG.HM",
    "NLG": "NLG.HM",
    "PNJ": "PNJ.HM",
    "REE": "REE.HM",
    "PVT": "PVT.HM",
    "DGW": "DGW.HM",
    "DRC": "DRC.HM",
    "VHC": "VHC.HM",
    "VJC": "VJC.HM",
    "SKG": "SKG.HM",
    "SBT": "SBT.HM",
    "VRE": "VRE.HM",
    "VND": "VND.HM",
    "OGN": "OGN.HM",
    "CTS": "CTS.HM",
    "HCM": "HCM.HM",
    "FTM": "FTM.HM",
    # HNX
    "SHB": "SHB.HN",
    "KLS": "KLS.HN",
    "VNDH": "VND.HN",
    "HDB": "HDB.HN",
    # UPCOM
    "E1VFVN30": "E1VFVN30.VN",
}


def _vn_to_yf_ticker(ticker: str) -> str:
    """Convert a VN ticker to yfinance format with exchange suffix."""
    t = ticker.upper().strip().replace(".VN", "").replace(".HM", "").replace(".HN", "")
    return _VN_YF_SUFFIX_MAP.get(t, f"{t}.HM")


def _fetch_vnstock_data(
    ticker: str,
    period: Optional[str],
    start_date: Optional[str],
    end_date: Optional[str],
) -> pd.DataFrame:
    """Fetch historical data for a Vietnam ticker using vnstock with 60s timeout."""

    def _do_fetch() -> pd.DataFrame:
        import sys
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        from vnstock.api.quote import Quote

        symbol = ticker.upper().strip().replace(".VN", "")

        if start_date and end_date:
            df = Quote(symbol=symbol, source="VCI").history(
                start=start_date, end=end_date
            )
            if df is not None and not df.empty:
                df = df.copy()
                df.index = pd.to_datetime(df.index, errors="coerce")
                df.columns = [c.lower() for c in df.columns]
                return df

        if period:
            import datetime as dt

            today = dt.date.today()
            try:
                p = int(period.replace("y", ""))
                start = (today - dt.timedelta(days=p * 365)).strftime("%Y-%m-%d")
                end = today.strftime("%Y-%m-%d")
            except Exception:
                start, end = None, None
            if start and end:
                df = Quote(symbol=symbol, source="VCI").history(
                    start=start, end=end
                )
                if df is not None and not df.empty:
                    df = df.copy()
                    df.index = pd.to_datetime(df.index, errors="coerce")
                    df.columns = [c.lower() for c in df.columns]
                    return df

        return pd.DataFrame()

    from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout

    try:
        with ThreadPoolExecutor(max_workers=1) as ex:
            return ex.submit(_do_fetch).result(timeout=60)
    except FuturesTimeout:
        logger.warning(f"vnstock timeout for {ticker}")
        return pd.DataFrame()
    except Exception as e:
        logger.warning(f"vnstock error for {ticker}: {e}")
        return pd.DataFrame()


def _fetch_yfinance_data(
    ticker: str,
    period: Optional[str],
    start_date: Optional[str],
    end_date: Optional[str],
) -> pd.DataFrame:
    """Fetch historical data using yfinance."""
    try:
        tkr = yf.Ticker(ticker)
        hist = pd.DataFrame()
        if start_date and end_date:
            hist = tkr.history(start=start_date, end=end_date)
        elif period:
            hist = tkr.history(period=period)
        if hist.empty:
            try:
                info = tkr.info
                if not info or ("symbol" not in info and "longName" not in info):
                    return pd.DataFrame()
            except Exception:
                return pd.DataFrame()
        hist.index = pd.to_datetime(hist.index).tz_localize(None)
        if isinstance(hist.columns, pd.MultiIndex):
            hist.columns = [col[0].lower() for col in hist.columns]
        else:
            hist.columns = hist.columns.str.lower()
        return hist
    except Exception:
        return pd.DataFrame()


def fetch_financial_data(
    tickers: List[str],
    period: str = "1y",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Dict[str, pd.DataFrame]:
    """Fetches historical stock data. Uses vnstock for VN tickers, yfinance for others."""
    fetch_method_info = f"Start: {start_date}, End: {end_date}" if start_date and end_date else f"Period: {period}"
    logger.info(f"Fetching Financial Data for: {tickers} ({fetch_method_info})")
    data: Dict[str, pd.DataFrame] = {}
    fetch_errors: List[str] = []
    if not tickers:
        logger.warning("No tickers provided for fetching data.")
        return data
    try:
        for ticker in tickers:
            raw_ticker = ticker.upper().strip()
            if _is_vn_ticker(raw_ticker):
                logger.info(f"Detected VN ticker: {raw_ticker} — using vnstock")
                hist = _fetch_vnstock_data(raw_ticker, period, start_date, end_date)
                if hist.empty or "close" not in hist.columns:
                    yf_ticker = _vn_to_yf_ticker(raw_ticker)
                    logger.info(f"vnstock failed for {raw_ticker}, falling back to yfinance as {yf_ticker}")
                    hist = _fetch_yfinance_data(yf_ticker, period, start_date, end_date)
            else:
                hist = _fetch_yfinance_data(raw_ticker, period, start_date, end_date)

            if hist.empty or "close" not in hist.columns:
                fetch_errors.append(f"{raw_ticker}: no data found")
                logger.warning(f"No data for {raw_ticker}.")
                continue

            data[raw_ticker] = hist
            logger.info(f"Successfully fetched data for {raw_ticker}.")
            time.sleep(0.5)

        logger.info(f"Successfully fetched data for: {list(data.keys())}")
        if not data:
            err_msg = f"Failed to fetch valid data for ALL requested tickers. Errors: {'; '.join(fetch_errors) if fetch_errors else 'unknown'}"
            logger.error(err_msg)
            return {"__error__": err_msg}
        return data
    except Exception as e:
        logger.error(f"Error during financial data fetching process: {e}")
        return {"__error__": str(e)}


def fetch_market_news(state: TypedDict) -> Dict:
    """Fetches relevant market news using Tavily based on user profile."""
    from langchain_tavily import TavilySearch
    from src.fin_agents.core.config import TAVILY_API_KEY

    tavily_tool = TavilySearch(max_results=3) if TAVILY_API_KEY else None
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
        if not news_results:
            formatted_news = "No specific news found."
        elif isinstance(news_results, str):
            formatted_news = news_results
        elif isinstance(news_results, list):
            formatted_news = "\n".join([f"- {item['content']}" for item in news_results if isinstance(item, dict) and "content" in item])
        else:
            formatted_news = str(news_results)
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
            result = fetch_financial_data(tickers=tickers_to_fetch, start_date=start_date_str, end_date=end_date_str)
            if "__error__" in result:
                return {"financial_data": {}, "error_message": result["__error__"]}
            data = result
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
        result = fetch_financial_data(tickers=tickers_to_fetch, period=period)
        if "__error__" in result:
            return {"financial_data": {}, "error_message": result["__error__"]}
        data = result

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
