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


def test_intent_prompts_escape_json_braces():
    from langchain_core.prompts import ChatPromptTemplate

    from src.fin_agents.graphs.workflow.intent_router import (
        INTENT_SYSTEM_PROMPT_EN,
        INTENT_SYSTEM_PROMPT_VI,
    )

    for system_prompt in (INTENT_SYSTEM_PROMPT_EN, INTENT_SYSTEM_PROMPT_VI):
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{message}"),
        ])
        formatted = prompt.format_messages(message="hello")
        assert '"intent"' in formatted[0].content


def test_chat_language_detection_handles_vietnamese_and_english():
    from src.fin_agents.core.orchestrator import _detect_lang

    assert _detect_lang("chào bạn") == "vi"
    assert _detect_lang("xin chao ban") == "vi"
    assert _detect_lang("hello friend") == "en"
    assert _detect_lang("Analyze AAPL for me") == "en"


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


def test_stock_analysis_removes_generic_disclaimer_lines():
    from src.fin_agents.graphs.workflow.stock_analysis.builder import _remove_disclaimer_lines

    text = (
        "# Report\n\n"
        "Useful analysis.\n\n"
        "**Disclaimer:** This analysis is for informational purposes only and does not constitute financial advice.\n"
        "**Tuyên bố miễn trừ trách nhiệm:** Phân tích này chỉ nhằm mục đích thông tin và không cấu thành lời khuyên tài chính."
    )

    cleaned = _remove_disclaimer_lines(text)

    assert "Useful analysis" in cleaned
    assert "Disclaimer" not in cleaned
    assert "miễn trừ trách nhiệm" not in cleaned


def test_general_and_stock_analysis_have_state_and_routing_modules():
    from src.fin_agents.graphs.workflow.general_chat.routing import route_after_chat
    from src.fin_agents.graphs.workflow.general_chat.state import GeneralChatState
    from src.fin_agents.graphs.workflow.stock_analysis.routing import (
        route_after_parse,
        route_after_resolve,
    )
    from src.fin_agents.graphs.workflow.stock_analysis.state import StockAnalysisState

    general_state: GeneralChatState = {"message": "hello"}
    stock_state: StockAnalysisState = {"tickers": ["FPT"]}

    assert route_after_chat(general_state) == "END"
    assert route_after_parse({"error_message": "missing ticker"}) == "general_chat_fallback"
    assert route_after_resolve(stock_state) == "fetch_news"


def test_stock_analysis_reuses_shared_market_agents(monkeypatch):
    from src.fin_agents.graphs.workflow.stock_analysis import builder

    calls = []

    class StubAgent:
        def __init__(self, name):
            self.name = name

        def invoke(self, state):
            calls.append((self.name, state))
            if self.name == "fetch_market_news":
                return {"market_news": "news"}
            if self.name == "fetch_data":
                return {"financial_data": {"FPT": "data"}}
            if self.name == "calculate_metrics":
                return {"metrics": {"FPT": {"sharpe_ratio": 1.0}}}
            return {}

    monkeypatch.setattr(builder, "get_agent", lambda name: StubAgent(name))

    assert builder.fetch_news({"tickers": ["FPT"], "goal": "analysis"}) == {"market_news": "news"}
    assert builder.fetch_data({"tickers": ["FPT"], "goal": "analysis"}) == {"financial_data": {"FPT": "data"}}
    assert builder.calculate_metrics({"financial_data": {"FPT": "data"}}) == {
        "metrics": {"FPT": {"sharpe_ratio": 1.0}}
    }
    assert [name for name, _ in calls] == [
        "fetch_market_news",
        "fetch_data",
        "calculate_metrics",
    ]


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
