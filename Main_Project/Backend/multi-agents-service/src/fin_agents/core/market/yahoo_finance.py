"""
Yahoo Finance client for NAV history and sector benchmark data.

Fetches historical NAV / price data for mutual fund tickers and
computes 1-month sector index returns.
"""

from __future__ import annotations

import logging
import os
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple

import yfinance as yf

logger = logging.getLogger(__name__)

# Map fund categories to approximate Yahoo Finance index tickers
_SECTOR_TICKERS: Dict[str, str] = {
    "LARGE CAP": "^NSEI",          # Nifty 50
    "MID CAP": "^NSEMDCP50",       # Nifty MidCap 150
    "SMALL CAP": "^NSESMCP100",    # Nifty SmallCap 100
    "EQUITY": "^NSEI",
    "DEBT": "^NSEI",               # Proxy for debt — use G-Sec index ideally
    "HYBRID": "^NSEI",
    "LIQUID": "^NSEILIQ",          # Nifty Liquid
}


class YahooFinanceClient:
    """
    Thin client around yfinance for NAV series and sector benchmarks.

    Parameters
    ----------
    cache_ttl_hours : int
        How long to cache results (default 1 hour).
    """

    def __init__(self, cache_ttl_hours: int = 1):
        self._cache: Dict[str, Tuple[List[Tuple[str, float]], date]] = {}
        self._cache_ttl = timedelta(hours=cache_ttl_hours)

    # ------------------------------------------------------------------ #
    # NAV History
    # ------------------------------------------------------------------ #
    def get_nav_series(
        self,
        fund_id: str,
        start: Optional[date] = None,
        end: Optional[date] = None,
    ) -> List[Tuple[str, float]]:
        """
        Fetch NAV time-series for a fund.

        Parameters
        ----------
        fund_id : str
            Ticker symbol (e.g. "0P0000X5J7.BO" for a BSE-listed fund).
        start, end : date
            Date range (default: last 365 days).

        Returns
        -------
        [(date_str, nav), ...]
            Sorted ascending by date.
        """
        end = end or date.today()
        start = start or (end - timedelta(days=365))

        cache_key = f"nav_{fund_id}_{start}_{end}"
        cached = self._cache_get(cache_key)
        if cached is not None:
            return cached

        try:
            ticker = yf.Ticker(fund_id)
            hist = ticker.history(start=start, end=end + timedelta(days=1))
            if hist.empty:
                logger.warning(f"No data returned for {fund_id}")
                return []

            result: List[Tuple[str, float]] = [
                (row.name.strftime("%Y-%m-%d"), round(float(row["Close"]), 4))
                for _, row in hist.iterrows()
            ]
            self._cache_set(cache_key, result)
            return result

        except Exception as exc:  # noqa: BLE001
            logger.error(f"yfinance error for {fund_id}: {exc}")
            return []

    # ------------------------------------------------------------------ #
    # Sector Benchmarks
    # ------------------------------------------------------------------ #
    def get_sector_indices(self) -> Dict[str, float]:
        """
        Compute 1-month returns for each sector index.

        Returns
        -------
        {sector_name: return_fraction}
            e.g. {"LARGE CAP": 0.0342} for +3.42% in the last month.
        """
        result: Dict[str, float] = {}
        end = date.today()
        start = end - timedelta(days=30)

        for sector, ticker in _SECTOR_TICKERS.items():
            try:
                t = yf.Ticker(ticker)
                hist = t.history(start=start, end=end + timedelta(days=1))
                if len(hist) < 2:
                    continue
                start_price = float(hist.iloc[0]["Close"])
                end_price = float(hist.iloc[-1]["Close"])
                if start_price > 0:
                    ret = (end_price - start_price) / start_price
                    result[sector] = round(ret, 4)
            except Exception as exc:  # noqa: BLE001
                logger.warning(f"Sector index error for {sector} ({ticker}): {exc}")
                continue

        return result

    # ------------------------------------------------------------------ #
    # Single-fund metrics
    # ------------------------------------------------------------------ #
    def get_fund_info(self, fund_id: str) -> dict:
        """
        Fetch basic fund metadata from Yahoo Finance.
        """
        try:
            ticker = yf.Ticker(fund_id)
            info = ticker.info or {}
            return {
                "name": info.get("longName") or info.get("shortName", ""),
                "category": info.get("category", ""),
                "expense_ratio": info.get("expenseRatio", 0.0),
                "aum": info.get("totalAssets", 0),
                "nav": info.get("navPrice", info.get("regularMarketPrice", 0.0)),
                "ytd_return": info.get("ytdReturn", 0.0),
                "beta": info.get("beta", 0.0),
            }
        except Exception as exc:  # noqa: BLE001
            logger.error(f"Fund info error for {fund_id}: {exc}")
            return {}

    # ------------------------------------------------------------------ #
    # Cache helpers
    # ------------------------------------------------------------------ #
    def _cache_get(self, key: str) -> Optional[List[Tuple[str, float]]]:
        if key not in self._cache:
            return None
        data, cached_at = self._cache[key]
        if date.today() - cached_at > self._cache_ttl:
            del self._cache[key]
            return None
        return data

    def _cache_set(self, key: str, data: List[Tuple[str, float]]) -> None:
        self._cache[key] = (data, date.today())
