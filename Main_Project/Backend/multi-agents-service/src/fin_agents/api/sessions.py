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
from typing import Any, Dict, List, Optional

import sse_starlette
from fastapi import APIRouter, Depends, HTTPException, Query
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.orm import Session

from src.fin_agents.api.schemas import (
    MessageCreate,
    ChatSessionResponse,
    ChatSessionListItem,
    ChatMessageResponse,
)
from src.fin_agents.core.orchestrator import OrchestratorService
from src.fin_agents.db.database import get_db
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

_buffers: Dict[str, list] = {}
_subscribers: Dict[str, list] = {}
_lock = threading.Lock()
_loop: Optional[asyncio.AbstractEventLoop] = None


def _get_loop() -> asyncio.AbstractEventLoop:
    global _loop
    if _loop is None:
        try:
            _loop = asyncio.get_running_loop()
        except RuntimeError:
            _loop = asyncio.new_event_loop()
    return _loop


class EventBus:
    """Thread-safe event bus for SSE event distribution."""

    @staticmethod
    def _get_buffer(session_id: str) -> list:
        with _lock:
            if session_id not in _buffers:
                _buffers[session_id] = []
            return _buffers[session_id]

    @staticmethod
    def _get_queues(session_id: str) -> list:
        with _lock:
            if session_id not in _subscribers:
                _subscribers[session_id] = []
            return _subscribers[session_id]

    @staticmethod
    def emit(session_id: str, event_type: str, data: Dict[str, Any]) -> None:
        wrapped = {"event": event_type, **data}
        event = {"event": "message", "data": json.dumps(wrapped)}
        buffer = EventBus._get_buffer(session_id)
        with _lock:
            buffer.append(event)
            if len(buffer) > 500:
                _buffers[session_id] = buffer[-500:]
        queues = EventBus._get_queues(session_id)
        loop = _get_loop()

        def _enqueue(q: asyncio.Queue) -> None:
            try:
                if loop.is_running():
                    loop.call_soon_threadsafe(lambda: _put(q, event))
                else:
                    q.put_nowait(event)
            except RuntimeError:
                pass

        def _put(q: asyncio.Queue, e: dict) -> None:
            try:
                q.put_nowait(e)
            except RuntimeError:
                pass

        for queue in queues:
            _enqueue(queue)

    @staticmethod
    async def subscribe(session_id: str, last_event_id: Optional[str] = None) -> sse_starlette.sse.EventSourceResponse:
        queue: asyncio.Queue = asyncio.Queue(maxsize=200)
        buffer = EventBus._get_buffer(session_id)

        with _lock:
            _subscribers.setdefault(session_id, []).append(queue)

        if last_event_id:
            idx = int(last_event_id)
            if idx < len(buffer):
                for event in buffer[idx:]:
                    yield event

        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
                if event is None:
                    break
                yield event
            except asyncio.TimeoutError:
                yield {"event": "heartbeat", "data": "{}"}

    @staticmethod
    def close_session(session_id: str) -> None:
        with _lock:
            if session_id in _subscribers:
                for q in _subscribers[session_id]:
                    try:
                        q.put_nowait(None)
                    except RuntimeError:
                        pass
                del _subscribers[session_id]
            _buffers.pop(session_id, None)


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
        async for event in EventBus.subscribe(session_id):
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

    with _lock:
        _buffers.setdefault(session_id, [])
        _subscribers.setdefault(session_id, [])

    async def run_workflow():
        try:
            orchestrator = OrchestratorService(db)

            def event_callback(event_type: str, data: Dict[str, Any]) -> None:
                EventBus.emit(session_id, event_type, data)

            result = await asyncio.to_thread(
                orchestrator.run_chat_workflow,
                session_id=session_id,
                message=message,
                lang=lang,
                event_callback=event_callback,
            )

            assistant_content = result.get("response") or result.get("final_report") or ""
            ChatMessageRepository.create(db, {
                "session_id": session_id,
                "role": "assistant",
                "content": assistant_content,
                "lang": lang,
            })
            ChatSessionRepository.update_updated_at(db, session_id)

            if result.get("status") == "failed":
                EventBus.emit(session_id, "attempt.failed", {
                    "error": result.get("error") or result.get("error_message") or "Unknown error",
                })
            else:
                EventBus.emit(session_id, "attempt.completed", {
                    "run_id": result.get("run_id", session_id),
                    "intent": result.get("intent", "unknown"),
                    "summary": assistant_content[:200] if assistant_content else "",
                })

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
