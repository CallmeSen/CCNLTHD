"""FastAPI routes for SSE-based chat sessions.
Provides streaming agent responses for the web UI chat interface.

Architecture:
  - EventBus: thread-safe event bus with per-session asyncio.Queue subscribers
  - POST /sessions/{id}/messages spawns the agent workflow as an asyncio task
  - GET /sessions/{id}/events streams events to the client via SSE
"""

import asyncio
import json
import logging
import threading
import uuid
from typing import Any, Dict, Optional

import sse_starlette
from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.orm import Session

from src.fin_agents.api.schemas import MessageCreate
from src.fin_agents.core.orchestrator import OrchestratorService
from src.fin_agents.db.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sessions", tags=["sessions"])

# ---------------------------------------------------------------------------
# Event Bus
# ---------------------------------------------------------------------------

_sessions: Dict[str, Dict[str, Any]] = {}
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
        # Wrap event type inside data so EventSource.onmessage fires.
        # Browser's EventSource only dispatches 'message' events via onmessage;
        # custom event types (tool_call, tool_result) are silently dropped otherwise.
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


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("")
async def create_session():
    """Create a new chat session and return its ID."""
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "id": session_id,
        "messages": [],
        "created_at": None,
    }
    _buffers[session_id] = []
    _subscribers[session_id] = []
    return {"session_id": session_id}


@router.get("/{session_id}/events")
async def session_events(session_id: str):
    """SSE stream for a session."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        async for event in EventBus.subscribe(session_id):
            if event is None:
                break
            yield event

    return EventSourceResponse(event_generator())


@router.post("/{session_id}/messages")
async def send_message(
    session_id: str,
    payload: MessageCreate,
    db: Session = Depends(get_db),
):
    """Send a user message to the session and trigger the agent workflow."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    message = payload.message.strip()
    lang = payload.lang or "en"

    _sessions[session_id]["messages"].append({"role": "user", "content": message})

    async def run_workflow():
        try:
            orchestrator = OrchestratorService(db)

            def event_callback(event_type: str, data: Dict[str, Any]) -> None:
                EventBus.emit(session_id, event_type, data)

            # Run sync workflow in a thread so the event loop stays free
            # to deliver SSE events immediately as they're emitted.
            result = await asyncio.to_thread(
                orchestrator.run_stock_workflow,
                initial_request=message,
                lang=lang,
                event_callback=event_callback,
            )

            assistant_content = result.get("final_report") or result.get("report") or ""
            _sessions[session_id]["messages"].append(
                {"role": "assistant", "content": assistant_content}
            )

            if result.get("status") == "failed":
                EventBus.emit(session_id, "attempt.failed", {
                    "error": result.get("error", "Unknown error"),
                })
            else:
                EventBus.emit(session_id, "attempt.completed", {
                    "run_dir": result.get("run_id"),
                    "summary": assistant_content,
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
async def delete_session(session_id: str):
    """Delete a session and clear its history."""
    EventBus.close_session(session_id)
    if session_id in _sessions:
        del _sessions[session_id]
    with _lock:
        _buffers.pop(session_id, None)
        _subscribers.pop(session_id, None)
    return {"status": "ok"}
