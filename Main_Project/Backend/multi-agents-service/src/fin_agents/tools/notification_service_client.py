"""
Market Data Service Client — fetches NAV history, fund metadata, and
benchmark indices from the market data microservice.

Environment variables
--------------------
MARKET_DATA_SERVICE_URL  : Base URL (default http://localhost:8003)
MARKET_DATA_SERVICE_TOKEN: Bearer token (optional)
"""

from __future__ import annotations

import logging
import os
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

_BASE_URL = os.getenv("MARKET_DATA_SERVICE_URL", "http://localhost:8003")
_TIMEOUT = 15.0


class NotificationServiceClient:
    """
    HTTP client for the Market Data Service.

    Provides NAV history, fund info, and sector benchmark data.
    Falls back to YahooFinanceClient when this service is unavailable.
    """

    def __init__(self, base_url: Optional[str] = None, token: Optional[str] = None):
        self._base = base_url or _BASE_URL
        self._token = token or os.getenv("MARKET_DATA_SERVICE_TOKEN", "")
        self._headers = (
            {"Authorization": f"Bearer {self._token}"} if self._token else {}
        )

    # ------------------------------------------------------------------ #
    # NAV History
    # ------------------------------------------------------------------ #
    def get_nav_history(
        self,
        fund_id: str,
        start: Optional[date] = None,
        end: Optional[date] = None,
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Fetch NAV time-series for a fund.

        Returns
        -------
        [{"date": "2026-04-01", "nav": 450.25}, ...]
        """
        end = end or date.today()
        start = start or (end - timedelta(days=365))
        url = f"{self._base}/funds/{fund_id}/nav"
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.get(
                    url,
                    headers=self._headers,
                    params={"start": start.isoformat(), "end": end.isoformat()},
                )
                resp.raise_for_status()
                return resp.json()
        except httpx.HTTPStatusError as exc:
            logger.warning(
                f"MarketDataService [{exc.response.status_code}] {fund_id} — "
                "will fall back to YahooFinance"
            )
            return None
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"MarketDataService NAV error: {exc}")
            return None

    def get_bulk_nav(
        self,
        fund_ids: List[str],
        start: Optional[date] = None,
        end: Optional[date] = None,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Fetch NAV history for multiple funds in one call.

        Returns {fund_id: [{"date": ..., "nav": ...}, ...]}
        """
        end = end or date.today()
        start = start or (end - timedelta(days=365))
        url = f"{self._base}/funds/nav/bulk"
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(
                    url,
                    headers=self._headers,
                    json={
                        "fund_ids": fund_ids,
                        "start": start.isoformat(),
                        "end": end.isoformat(),
                    },
                )
                resp.raise_for_status()
                return resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.error(f"MarketDataService bulk NAV error: {exc}")
            return {}

    # ------------------------------------------------------------------ #
    # Fund Info
    # ------------------------------------------------------------------ #
    def get_fund_info(self, fund_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch static fund metadata: name, category, TER, AUM, benchmark, etc.
        """
        url = f"{self._base}/funds/{fund_id}"
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.get(url, headers=self._headers)
                resp.raise_for_status()
                return resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"MarketDataService fund info error: {exc}")
            return None

    # ------------------------------------------------------------------ #
    # Sector / Benchmark
    # ------------------------------------------------------------------ #
    def get_sector_returns(
        self, period_days: int = 30
    ) -> Optional[Dict[str, float]]:
        """
        Get sector index returns over the specified period.

        Returns
        -------
        {"LARGE CAP": 0.0342, "MID CAP": -0.012, ...}
        """
        url = f"{self._base}/sectors/returns"
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.get(
                    url,
                    headers=self._headers,
                    params={"period_days": period_days},
                )
                resp.raise_for_status()
                return resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"MarketDataService sector returns error: {exc}")
            return None

    def get_benchmark_index(
        self, index_id: str = "NIFTY50"
    ) -> Optional[Dict[str, Any]]:
        """Fetch benchmark index data (level, P/E, P/B, etc.)."""
        url = f"{self._base}/indices/{index_id}"
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.get(url, headers=self._headers)
                resp.raise_for_status()
                return resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"MarketDataService index error: {exc}")
            return None
