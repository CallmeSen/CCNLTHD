"""Partial state: Risk & analysis domain."""
from typing import Dict, Optional, TypedDict


class RiskState(TypedDict, total=False):
    """State fields related to risk analysis, user profile, and metrics."""

    user_profile: Optional[dict]
    metrics: Optional[dict]
    validation_result: Optional[dict]
