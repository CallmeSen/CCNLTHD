"""State model for the general chat workflow."""

from typing import Any, Dict, List, TypedDict


class GeneralChatState(TypedDict, total=False):
    """State for conversational requests that do not need structured analysis."""

    message: str
    lang: str
    conversation_history: List[Dict[str, str]]
    personalization_context: Dict[str, Any]
    response: str
