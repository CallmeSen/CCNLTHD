"""FastAPI routes for SSE-based chat sessions.
Provides streaming agent responses for the web UI chat interface.

Architecture:
  - EventBus: thread-safe event bus with per-session asyncio.Queue subscribers
  - POST /sessions/{id}/messages spawns the agent workflow as an asyncio task
  - GET /sessions/{id}/events streams events to the client via SSE
  - ChatSession and ChatMessage are persisted to fin_postgres
"""

import asyncio
import json
import logging
import threading
import uuid
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.orm import Session

from src.fin_agents.api.schemas import (
    MessageCreate,
    ChatSessionResponse,
    ChatSessionListItem,
    ChatMessageResponse,
)
from src.fin_agents.core.orchestrator import OrchestratorService
from src.fin_agents.db.database import get_db, SessionLocal
from src.fin_agents.db.repositories import (
    ChatSessionRepository,
    ChatMessageRepository,
)
from src.fin_agents.db.models import ChatMessage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sessions", tags=["sessions"])


def _normalize_lang(lang: Optional[str]) -> Optional[str]:
    if not lang:
        return None
    normalized = lang.strip().lower()
    return normalized if normalized in {"en", "vi"} else None


# ---------------------------------------------------------------------------
# Event Bus
# ---------------------------------------------------------------------------

_buffers: Dict[str, List[dict]] = {}
_subscribers: Dict[str, List[Dict[str, Any]]] = {}
_event_ids: Dict[str, int] = {}
_lock = threading.Lock()


class EventBus:
    """Thread-safe event bus for SSE event distribution."""

    @staticmethod
    def _get_buffer(session_id: str) -> list:
        with _lock:
            if session_id not in _buffers:
                _buffers[session_id] = []
            return _buffers[session_id]

    @staticmethod
    def _get_subscribers(session_id: str) -> list:
        with _lock:
            if session_id not in _subscribers:
                _subscribers[session_id] = []
            return _subscribers[session_id]

    @staticmethod
    def emit(session_id: str, event_type: str, data: Dict[str, Any]) -> None:
        wrapped = dict(data)
        wrapped["event"] = event_type
        wrapped["type"] = event_type

        with _lock:
            next_id = _event_ids.get(session_id, 0) + 1
            _event_ids[session_id] = next_id
            event = {
                "id": str(next_id),
                "event": "message",
                "data": json.dumps(wrapped, default=str),
            }
            buffer = _buffers.setdefault(session_id, [])
            buffer.append(event)
            if len(buffer) > 500:
                _buffers[session_id] = buffer[-500:]
            subscribers = list(_subscribers.get(session_id, []))

        def _put(q: asyncio.Queue, e: dict) -> None:
            try:
                q.put_nowait(e)
            except (asyncio.QueueFull, RuntimeError):
                pass

        for subscriber in subscribers:
            queue = subscriber["queue"]
            loop = subscriber["loop"]
            try:
                if loop.is_running() and not loop.is_closed():
                    loop.call_soon_threadsafe(_put, queue, event)
            except RuntimeError:
                pass

    @staticmethod
    async def subscribe(
        session_id: str,
        last_event_id: Optional[str] = None,
    ) -> AsyncGenerator[dict, None]:
        queue: asyncio.Queue = asyncio.Queue(maxsize=200)
        loop = asyncio.get_running_loop()
        subscriber = {"queue": queue, "loop": loop}

        with _lock:
            buffer = list(_buffers.setdefault(session_id, []))
            _subscribers.setdefault(session_id, []).append(subscriber)

        replay_after = None
        if last_event_id:
            try:
                replay_after = int(last_event_id)
            except ValueError:
                replay_after = None

        for event in buffer:
            if replay_after is None or int(event.get("id", 0)) > replay_after:
                yield event

        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    if event is None:
                        break
                    yield event
                except asyncio.TimeoutError:
                    yield {"event": "heartbeat", "data": "{}"}
        finally:
            with _lock:
                subscribers = _subscribers.get(session_id, [])
                _subscribers[session_id] = [
                    item for item in subscribers
                    if item.get("queue") is not queue
                ]

    @staticmethod
    def reset_session(session_id: str) -> None:
        """Clear replay buffer for a new user message while keeping subscribers."""
        with _lock:
            _buffers[session_id] = []
            _event_ids[session_id] = 0
            _subscribers.setdefault(session_id, [])

    @staticmethod
    def close_session(session_id: str) -> None:
        with _lock:
            subscribers = list(_subscribers.get(session_id, []))
            _subscribers.pop(session_id, None)
            _buffers.pop(session_id, None)
            _event_ids.pop(session_id, None)

        for subscriber in subscribers:
            queue = subscriber["queue"]
            loop = subscriber["loop"]
            try:
                if loop.is_running() and not loop.is_closed():
                    loop.call_soon_threadsafe(queue.put_nowait, None)
                else:
                    queue.put_nowait(None)
            except RuntimeError:
                pass
            except asyncio.QueueFull:
                try:
                    queue.get_nowait()
                    queue.put_nowait(None)
                except Exception:
                    pass


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("", response_model=dict)
async def create_session(
    body: Optional[dict] = None,
    db: Session = Depends(get_db),
):
    """Create a new chat session and persist it to fin_postgres."""
    session_id = str(uuid.uuid4())
    user_id = None
    if body:
        user_id = body.get("user_id")

    ChatSessionRepository.create(db, {
        "session_id": session_id,
        "user_id": user_id,
        "is_active": 1,
    })

    with _lock:
        _buffers[session_id] = []
        _event_ids[session_id] = 0
        _subscribers.setdefault(session_id, [])

    return {"session_id": session_id}


@router.get("", response_model=List[ChatSessionListItem])
async def list_sessions(
    user_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List chat sessions. If user_id is provided, filter by user."""
    if user_id:
        sessions = ChatSessionRepository.get_by_user(db, user_id, skip, limit)
    else:
        sessions = ChatSessionRepository.list_active(db, skip, limit)

    result = []
    for s in sessions:
        count = db.query(ChatMessage).filter(ChatMessage.session_id == s.session_id).count()
        result.append(ChatSessionListItem(
            session_id=s.session_id,
            user_id=s.user_id,
            created_at=s.created_at,
            updated_at=s.updated_at,
            is_active=s.is_active,
            message_count=count,
        ))
    return result


@router.get("/{session_id}", response_model=ChatSessionResponse)
async def get_session(
    session_id: str,
    db: Session = Depends(get_db),
):
    """Get a session with all its messages."""
    session = ChatSessionRepository.get_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = ChatMessageRepository.get_by_session(db, session_id)
    return ChatSessionResponse(
        session_id=session.session_id,
        user_id=session.user_id,
        created_at=session.created_at,
        updated_at=session.updated_at,
        is_active=session.is_active,
        messages=[
            ChatMessageResponse(
                message_id=m.message_id,
                session_id=m.session_id,
                role=m.role,
                content=m.content,
                lang=m.lang,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


@router.get("/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    db: Session = Depends(get_db),
):
    """Get all messages for a session (used by frontend)."""
    session = ChatSessionRepository.get_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = ChatMessageRepository.get_by_session(db, session_id)
    return ChatSessionResponse(
        session_id=session.session_id,
        user_id=session.user_id,
        created_at=session.created_at,
        updated_at=session.updated_at,
        is_active=session.is_active,
        messages=[
            ChatMessageResponse(
                message_id=m.message_id,
                session_id=m.session_id,
                role=m.role,
                content=m.content,
                lang=m.lang,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


@router.get("/{session_id}/events")
async def session_events(
    session_id: str,
    request: Request,
    token: Optional[str] = Query(
        default=None,
        description="Bearer token for session authentication (alternative to Authorization header)"
    ),
    db: Session = Depends(get_db),
):
    """SSE stream for a session.

    Validates session exists in DB, then streams events via EventBus.
    """
    session = ChatSessionRepository.get_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    with _lock:
        _buffers.setdefault(session_id, [])
        _subscribers.setdefault(session_id, [])

    async def event_generator():
        last_event_id = request.headers.get("last-event-id")
        async for event in EventBus.subscribe(session_id, last_event_id=last_event_id):
            yield event

    return EventSourceResponse(event_generator())


@router.post("/{session_id}/messages")
async def send_message(
    session_id: str,
    payload: MessageCreate,
    db: Session = Depends(get_db),
):
    """Send a user message to the session, persist to DB, and trigger the agent workflow."""
    session = ChatSessionRepository.get_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    message = payload.message.strip()
    lang = _normalize_lang(payload.lang)

    ChatMessageRepository.create(db, {
        "session_id": session_id,
        "role": "user",
        "content": message,
        "lang": lang,
    })
    ChatSessionRepository.update_updated_at(db, session_id)

    EventBus.reset_session(session_id)

    async def run_workflow():
        try:
            def execute_workflow() -> tuple[Dict[str, Any], str]:
                bg_db = SessionLocal()
                try:
                    orchestrator = OrchestratorService(bg_db)

                    def event_callback(event_type: str, data: Dict[str, Any]) -> None:
                        EventBus.emit(session_id, event_type, data)

                    result = orchestrator.run_chat_workflow(
                        session_id=session_id,
                        message=message,
                        lang=lang,
                        event_callback=event_callback,
                    )

                    assistant_content = (
                        result.get("response")
                        or result.get("final_report")
                        or result.get("report")
                        or ""
                    )
                    if assistant_content:
                        ChatMessageRepository.create(bg_db, {
                            "session_id": session_id,
                            "role": "assistant",
                            "content": assistant_content,
                            "lang": lang,
                        })
                        ChatSessionRepository.update_updated_at(bg_db, session_id)
                    return result, assistant_content
                finally:
                    bg_db.close()

            result, assistant_content = await asyncio.to_thread(execute_workflow)

            if result.get("status") == "failed":
                EventBus.emit(session_id, "attempt.failed", {
                    "error": result.get("error") or result.get("error_message") or "Unknown error",
                })
            else:
                completion_payload = {
                    "run_id": result.get("run_id", session_id),
                    "intent": result.get("intent", "unknown"),
                    "status": result.get("status", "completed"),
                    "summary": assistant_content[:200] if assistant_content else "",
                    "response": assistant_content,
                }
                for key in (
                    "final_report",
                    "report",
                    "metrics",
                    "user_profile",
                    "proposed_portfolio",
                    "validation_result",
                    "llm_commentary",
                    "market_news",
                    "visualization_url",
                ):
                    if result.get(key) is not None:
                        completion_payload[key] = result[key]
                EventBus.emit(session_id, "attempt.completed", completion_payload)

        except Exception as exc:
            logger.exception(f"Workflow error for session {session_id}")
            EventBus.emit(session_id, "attempt.failed", {
                "error": str(exc),
            })
        finally:
            EventBus.emit(session_id, "done", {})

    asyncio.create_task(run_workflow())

    return {
        "session_id": session_id,
        "status": "processing",
    }


@router.delete("/{session_id}")
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a session (soft-delete) and clear its event buffers."""
    session = ChatSessionRepository.get_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    ChatSessionRepository.deactivate(db, session_id)
    EventBus.close_session(session_id)

    return {"status": "ok"}
