"""
Personalization context builder.

Aggregates all uploaded files for a session into a structured context dict
that can be injected into LangGraph workflow state for personalized responses.
"""

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from src.fin_agents.db.repositories import FileStoreRepository, ChatMessageRepository

logger = logging.getLogger(__name__)


def build_personalization_context(
    db: Session,
    session_id: str,
) -> Dict[str, Any]:
    """
    Build a personalization context dict from all uploaded files in a session.

    Returns a dict with keys:
    - files: list of file summaries
    - combined_text_context: concatenated text from all documents
    - ticker_mentions: list of tickers mentioned across files
    - key_metrics: aggregated key metrics from files
    - summary: human-readable summary of all uploaded content
    """
    files = FileStoreRepository.get_by_session(db, session_id)

    if not files:
        return {"has_context": False, "files": [], "summary": None}

    file_summaries = []
    combined_text_parts = []
    all_tickers: List[str] = []
    all_metrics: Dict[str, Any] = {}

    for f in files:
        ctx = f.extracted_context_json or {}
        summary_line = f"[{f.mime_type.split('/')[-1].upper()}] {f.file_name}"

        if ctx.get("summary"):
            summary_line += f": {ctx['summary']}"

        file_summaries.append({
            "file_id": f.file_id,
            "file_name": f.file_name,
            "mime_type": f.mime_type,
            "summary": ctx.get("summary"),
            "key_data": ctx.get("key_data"),
        })

        if ctx.get("mentioned_tickers"):
            all_tickers.extend(ctx["mentioned_tickers"])

        if ctx.get("key_metrics"):
            all_metrics[f.file_name] = ctx["key_metrics"]

        if ctx.get("type") in ("document", "spreadsheet"):
            text = ctx.get("summary", "")
            if text:
                combined_text_parts.append(text)

    combined_text_context = "\n---\n".join(combined_text_parts)

    return {
        "has_context": True,
        "files": file_summaries,
        "file_count": len(files),
        "combined_text_context": combined_text_context,
        "mentioned_tickers": list(set(all_tickers)),
        "key_metrics": all_metrics,
        "summary": (
            f"User has uploaded {len(files)} file(s) providing additional context. "
            f"Tickers mentioned: {', '.join(set(all_tickers)) if all_tickers else 'none'}."
        ),
    }


def build_conversation_context(
    db: Session,
    session_id: str,
    limit: int = 20,
) -> List[Dict[str, str]]:
    """
    Build conversation history for LLM context.

    Returns a list of message dicts with 'role' and 'content' keys,
    capped at `limit` most recent messages.
    """
    messages = ChatMessageRepository.get_by_session(db, session_id, limit=limit)
    return [
        {
            "role": m.role,
            "content": m.content,
        }
        for m in messages
    ]
