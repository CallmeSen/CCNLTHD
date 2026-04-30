"""
Tavily News client for real-time market and fund-related news.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

_TAVILY_BASE = "https://api.tavily.com/search"


class TavilyNewsClient:
    """
    Client for the Tavily News Search API.

    Environment variables
    ---------------------
    TAVILY_API_KEY : str
        Your Tavily API key. Get one at https://tavily.com
    """

    def __init__(self, api_key: Optional[str] = None):
        self._api_key = api_key or os.getenv("TAVILY_API_KEY", "")

    def search(
        self,
        query: str,
        max_results: int = 5,
        topics: str = "finance",
        **kwargs,
    ) -> List[Dict[str, Any]]:
        """
        Search for news articles.

        Parameters
        ----------
        query : str
            Search query (e.g. "HDFC Top 100 mutual fund news").
        max_results : int
            Number of results to return (default 5).
        topics : str
            Tavily topic filter: "news", "finance", "sports", etc.

        Returns
        -------
        List of dicts with keys: title, url, source, published_date, content, sentiment
        """
        if not self._api_key:
            logger.warning("TAVILY_API_KEY not set — skipping news fetch")
            return []

        payload = {
            "api_key": self._api_key,
            "query": query,
            "max_results": max_results,
            "topic": topics,
            "language": "en",
            "kwargs": kwargs,
        }

        try:
            with httpx.Client(timeout=15.0) as client:
                response = client.post(_TAVILY_BASE, json=payload)
                response.raise_for_status()
                data = response.json()

            results: List[Dict[str, Any]] = []
            for item in data.get("results", [])[:max_results]:
                sentiment = self._classify_sentiment(item.get("content", ""))
                results.append(
                    {
                        "headline": item.get("title", ""),
                        "url": item.get("url", ""),
                        "source": item.get("source", ""),
                        "published_date": item.get("published_date", ""),
                        "content": item.get("content", ""),
                        "sentiment": sentiment,
                    }
                )
            return results

        except httpx.HTTPStatusError as exc:
            logger.error(f"Tavily HTTP error: {exc.response.status_code}")
            return []
        except Exception as exc:  # noqa: BLE001
            logger.error(f"Tavily request failed: {exc}")
            return []

    def _classify_sentiment(self, content: str) -> str:
        """
        Simple keyword-based sentiment classification.
        Returns "POSITIVE", "NEGATIVE", or "NEUTRAL".
        """
        text = content.lower()
        positive = sum(
            1
            for w in [
                "gain", "rise", "surge", "rally", "profit", "grow", "high", "best", "outperform"
            ]
            if w in text
        )
        negative = sum(
            1
            for w in [
                "loss", "fall", "drop", "crash", "risk", "downgrade", "decline", "weak", "worst"
            ]
            if w in text
        )
        if positive > negative:
            return "POSITIVE"
        if negative > positive:
            return "NEGATIVE"
        return "NEUTRAL"
