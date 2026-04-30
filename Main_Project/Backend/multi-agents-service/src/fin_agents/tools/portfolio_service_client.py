"""
Portfolio Service Client — fetches portfolio snapshots, holdings, and NAV data.

Environment variables
---------------------
PORTFOLIO_SERVICE_URL  : Base URL (default http://localhost:8002)
PORTFOLIO_SERVICE_TOKEN: Bearer token (optional)
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

_BASE_URL = os.getenv("PORTFOLIO_SERVICE_URL", "http://localhost:8002")
_TIMEOUT = 10.0


class PortfolioServiceClient:
    """
    HTTP client for the Portfolio Service.

    Provides a stable interface regardless of the underlying
    REST endpoint structure.
    """

    def __init__(self, base_url: Optional[str] = None, token: Optional[str] = None):
        self._base = base_url or _BASE_URL
        self._token = token or os.getenv("PORTFOLIO_SERVICE_TOKEN", "")
        self._headers = (
            {"Authorization": f"Bearer {self._token}"} if self._token else {}
        )

    # ------------------------------------------------------------------ #
    # Portfolio
    # ------------------------------------------------------------------ #
    def get_portfolio_snapshot(self, portfolio_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch the full portfolio snapshot including holdings.

        Returns
        -------
        {
          "portfolio_id": "PF001",
          "client_id": "CLT001",
          "total_value_inr": 500000,
          "holdings": [
            {
              "fund_id": "MF001",
              "fund_name": "HDFC Top 100",
              "category": "LARGE CAP",
              "units": 1000,
              "nav": 450.25,
              "value_inr": 450250,
              "weight_percent": 45.0,
              "expense_ratio": 0.005,
            },
            ...
          ],
          "snapshot_date": "2026-04-27",
        }
        """
        url = f"{self._base}/portfolios/{portfolio_id}"
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.get(url, headers=self._headers)
                resp.raise_for_status()
                return resp.json()
        except httpx.HTTPStatusError as exc:
            logger.error(f"PortfolioService [{exc.response.status_code}] {url}")
            return None
        except Exception as exc:  # noqa: BLE001
            logger.error(f"PortfolioService error: {exc}")
            return None

    def get_portfolio_list(
        self, client_id: str, skip: int = 0, limit: int = 50
    ) -> Optional[List[Dict[str, Any]]]:
        """List all portfolios for a client."""
        url = f"{self._base}/clients/{client_id}/portfolios"
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.get(
                    url, headers=self._headers, params={"skip": skip, "limit": limit}
                )
                resp.raise_for_status()
                return resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.error(f"PortfolioService list error: {exc}")
            return None

    def get_holdings(self, portfolio_id: str) -> Optional[List[Dict[str, Any]]]:
        """Fetch the holdings list for a portfolio."""
        url = f"{self._base}/portfolios/{portfolio_id}/holdings"
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.get(url, headers=self._headers)
                resp.raise_for_status()
                return resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.error(f"PortfolioService holdings error: {exc}")
            return None

    # ------------------------------------------------------------------ #
    # Mutual Funds
    # ------------------------------------------------------------------ #
    def get_fund(self, fund_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a single mutual fund definition."""
        url = f"{self._base}/funds/{fund_id}"
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.get(url, headers=self._headers)
                resp.raise_for_status()
                return resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.error(f"PortfolioService fund error: {exc}")
            return None

    def get_fund_list(
        self, category: Optional[str] = None, skip: int = 0, limit: int = 100
    ) -> Optional[List[Dict[str, Any]]]:
        """List all funds, optionally filtered by category."""
        url = f"{self._base}/funds"
        params = {"skip": skip, "limit": limit}
        if category:
            params["category"] = category
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.get(url, headers=self._headers, params=params)
                resp.raise_for_status()
                return resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.error(f"PortfolioService fund list error: {exc}")
            return None

    # ------------------------------------------------------------------ #
    # Client (proxied from User Service for convenience)
    # ------------------------------------------------------------------ #
    def get_client_profile(self, client_id: str) -> Optional[Dict[str, Any]]:
        """
        Proxy to the User Service to fetch client profile.
        """
        url = f"{self._base}/clients/{client_id}"
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.get(url, headers=self._headers)
                resp.raise_for_status()
                return resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.error(f"PortfolioService client proxy error: {exc}")
            return None

    # ------------------------------------------------------------------ #
    # Transaction
    # ------------------------------------------------------------------ #
    def record_transaction(
        self, portfolio_id: str, transaction: Dict[str, Any]
    ) -> bool:
        """
        Submit a buy/sell/switch transaction to the portfolio service.

        transaction = {
          "action_type": "BUY",
          "fund_id": "MF001",
          "units": 100,
          "nav": 450.25,
          "value_inr": 45025,
        }
        """
        url = f"{self._base}/portfolios/{portfolio_id}/transactions"
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.post(url, headers=self._headers, json=transaction)
                resp.raise_for_status()
                return True
        except Exception as exc:  # noqa: BLE001
            logger.error(f"PortfolioService transaction error: {exc}")
            return False
