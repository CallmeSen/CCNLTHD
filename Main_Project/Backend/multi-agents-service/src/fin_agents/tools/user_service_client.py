"""
User Service Client — fetches client / user profile data.

Environment variables
---------------------
USER_SERVICE_URL  : Base URL of the user service (default http://localhost:8001)
USER_SERVICE_TOKEN: Bearer token for service-to-service auth (optional)
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

_BASE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:8001")
_TIMEOUT = 10.0


class UserServiceClient:
    """
    Thin HTTP client for the User Service REST API.

    All methods return a dict on success, None on failure.
    """

    def __init__(self, base_url: Optional[str] = None, token: Optional[str] = None):
        self._base = base_url or _BASE_URL
        self._token = token or os.getenv("USER_SERVICE_TOKEN", "")
        self._headers = (
            {"Authorization": f"Bearer {self._token}"} if self._token else {}
        )

    # ------------------------------------------------------------------ #
    # Client profile
    # ------------------------------------------------------------------ #
    def get_client_profile(self, client_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch the full client profile.

        Returns
        -------
        {
          "client_id": "CLT001",
          "name": "...",
          "age": 45,
          "risk_tolerance": "MODERATE",
          "investment_horizon_years": 5,
          "annual_income_inr": 2000000,
          ...
        }
        """
        url = f"{self._base}/clients/{client_id}"
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.get(url, headers=self._headers)
                resp.raise_for_status()
                return resp.json()
        except httpx.HTTPStatusError as exc:
            logger.error(f"UserService [{exc.response.status_code}] {url}")
            return None
        except Exception as exc:  # noqa: BLE001
            logger.error(f"UserService error: {exc}")
            return None

    def get_client_list(
        self, skip: int = 0, limit: int = 100
    ) -> Optional[list[Dict[str, Any]]]:
        """Fetch a paginated list of clients."""
        url = f"{self._base}/clients"
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.get(
                    url, headers=self._headers, params={"skip": skip, "limit": limit}
                )
                resp.raise_for_status()
                return resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.error(f"UserService list error: {exc}")
            return None

    def update_client_risk_profile(
        self, client_id: str, updates: Dict[str, Any]
    ) -> bool:
        """
        Update mutable fields on a client profile (e.g. risk_tolerance).

        Returns True on success, False on failure.
        """
        url = f"{self._base}/clients/{client_id}"
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.patch(url, headers=self._headers, json=updates)
                resp.raise_for_status()
                return True
        except Exception as exc:  # noqa: BLE001
            logger.error(f"UserService update error: {exc}")
            return False

    def get_advisory_history(self, client_id: str) -> Optional[list[Dict[str, Any]]]:
        """Fetch the advisory request history for a client."""
        url = f"{self._base}/clients/{client_id}/advisory-history"
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.get(url, headers=self._headers)
                resp.raise_for_status()
                return resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.error(f"UserService advisory history error: {exc}")
            return None
