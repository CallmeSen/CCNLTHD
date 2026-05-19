import asyncio
import json
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest


def test_intent_fallback_routes_general_stock_and_portfolio():
    from src.fin_agents.graphs.workflow.intent_router import _fallback_intent

    assert _fallback_intent("xin chao ban") == "general_chat"
    assert _fallback_intent("Analyze AAPL for me") == "stock_analysis"
    assert _fallback_intent("Phân tích cổ phiếu FPT giúp tôi") == "stock_analysis"
    assert _fallback_intent("Tao danh muc dau tu cho toi") == "portfolio"


def test_stock_analysis_parse_tickers_falls_back_without_llm(monkeypatch):
    from src.fin_agents.graphs.workflow.stock_analysis import builder

    monkeypatch.setattr(
        builder,
        "get_shared_llm",
        MagicMock(side_effect=RuntimeError("LLM unavailable")),
    )

    result = builder.parse_tickers({
        "message": "Phân tích cổ phiếu FPT giúp tôi",
        "lang": "vi",
    })

    assert result["tickers"] == ["FPT"]
    assert "error_message" not in result


@pytest.mark.asyncio
async def test_event_bus_replays_events_emitted_before_subscribe():
    from src.fin_agents.api.sessions import EventBus

    session_id = "replay-test-session"
    EventBus.close_session(session_id)
    EventBus.reset_session(session_id)
    EventBus.emit(session_id, "text_delta", {"text": "hello"})

    stream = EventBus.subscribe(session_id)
    try:
        event = await asyncio.wait_for(anext(stream), timeout=1.0)
    finally:
        await stream.aclose()
        EventBus.close_session(session_id)

    payload = json.loads(event["data"])
    assert event["id"] == "1"
    assert payload["event"] == "text_delta"
    assert payload["text"] == "hello"


@pytest.mark.asyncio
async def test_send_message_uses_background_db_and_emits_full_completion(monkeypatch):
    import src.fin_agents.api.sessions as sessions
    from src.fin_agents.api.schemas import MessageCreate

    session_id = "message-route-test-session"
    request_db = MagicMock(name="request_db")
    background_db = MagicMock(name="background_db")
    fake_session = SimpleNamespace(session_id=session_id)
    full_response = "FULL RESPONSE BODY " * 30

    sessions.EventBus.close_session(session_id)

    get_by_id = MagicMock(return_value=fake_session)
    create_message = MagicMock()
    update_session = MagicMock()
    orchestrator_instance = MagicMock()
    orchestrator_instance.run_chat_workflow.return_value = {
        "status": "completed",
        "response": full_response,
        "intent": "general_chat",
        "run_id": "run-1",
    }
    orchestrator_cls = MagicMock(return_value=orchestrator_instance)

    monkeypatch.setattr(sessions.ChatSessionRepository, "get_by_id", get_by_id)
    monkeypatch.setattr(sessions.ChatSessionRepository, "update_updated_at", update_session)
    monkeypatch.setattr(sessions.ChatMessageRepository, "create", create_message)
    monkeypatch.setattr(sessions, "SessionLocal", MagicMock(return_value=background_db))
    monkeypatch.setattr(sessions, "OrchestratorService", orchestrator_cls)

    response = await sessions.send_message(
        session_id,
        MessageCreate(message="hello", lang="en"),
        db=request_db,
    )
    assert response["status"] == "processing"

    await asyncio.sleep(0.1)

    orchestrator_cls.assert_called_once_with(background_db)
    assert create_message.call_args_list[0].args[0] is request_db
    assert create_message.call_args_list[1].args[0] is background_db
    background_db.close.assert_called_once()

    stream = sessions.EventBus.subscribe(session_id)
    completion = None
    try:
        for _ in range(3):
            event = await asyncio.wait_for(anext(stream), timeout=1.0)
            payload = json.loads(event["data"])
            if payload["event"] == "attempt.completed":
                completion = payload
                break
    finally:
        await stream.aclose()
        sessions.EventBus.close_session(session_id)

    assert completion is not None
    assert completion["response"] == full_response
    assert len(completion["summary"]) == 200
