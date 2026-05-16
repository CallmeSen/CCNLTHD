"""
Unit tests for chat session and message schemas.
"""
import pytest
from datetime import datetime
from pydantic import ValidationError
from src.fin_agents.api.schemas import (
    ChatMessageResponse,
    ChatSessionResponse,
    ChatSessionListItem,
    MessageCreate,
)


class TestChatMessageResponse:
    def test_valid_message_response(self):
        msg = ChatMessageResponse(
            message_id=1,
            session_id="550e8400-e29b-41d4-a716-446655440000",
            role="user",
            content="Phan tich co phieu FPT",
            lang="vi",
            created_at=datetime(2026, 5, 16, 12, 0, 0),
        )
        assert msg.message_id == 1
        assert msg.role == "user"
        assert msg.content == "Phan tich co phieu FPT"
        assert msg.lang == "vi"

    def test_assistant_message_response(self):
        msg = ChatMessageResponse(
            message_id=2,
            session_id="550e8400-e29b-41d4-a716-446655440000",
            role="assistant",
            content="Duoc, toi se phan tich ngay.",
            lang="vi",
            created_at=datetime(2026, 5, 16, 12, 1, 0),
        )
        assert msg.role == "assistant"

    def test_message_without_lang(self):
        msg = ChatMessageResponse(
            message_id=3,
            session_id="550e8400-e29b-41d4-a716-446655440000",
            role="user",
            content="Build a portfolio",
            lang=None,
            created_at=datetime(2026, 5, 16, 12, 0, 0),
        )
        assert msg.lang is None

    def test_message_missing_required_fields(self):
        with pytest.raises(ValidationError):
            ChatMessageResponse(
                message_id=1,
                session_id="550e8400-e29b-41d4-a716-446655440000",
            )


class TestChatSessionListItem:
    def test_valid_session_list_item(self):
        item = ChatSessionListItem(
            session_id="550e8400-e29b-41d4-a716-446655440000",
            user_id="user-123",
            created_at=datetime(2026, 5, 16, 10, 0, 0),
            updated_at=datetime(2026, 5, 16, 12, 0, 0),
            is_active=1,
            message_count=5,
        )
        assert item.session_id == "550e8400-e29b-41d4-a716-446655440000"
        assert item.message_count == 5
        assert item.is_active == 1

    def test_session_without_user_id(self):
        item = ChatSessionListItem(
            session_id="550e8400-e29b-41d4-a716-446655440000",
            user_id=None,
            created_at=datetime(2026, 5, 16, 10, 0, 0),
            updated_at=datetime(2026, 5, 16, 12, 0, 0),
            is_active=0,
            message_count=0,
        )
        assert item.user_id is None
        assert item.message_count == 0

    def test_session_defaults_message_count_to_zero(self):
        item = ChatSessionListItem(
            session_id="550e8400-e29b-41d4-a716-446655440000",
            created_at=datetime(2026, 5, 16, 10, 0, 0),
            updated_at=datetime(2026, 5, 16, 12, 0, 0),
            is_active=1,
        )
        assert item.message_count == 0


class TestChatSessionResponse:
    def test_valid_session_response(self):
        session = ChatSessionResponse(
            session_id="550e8400-e29b-41d4-a716-446655440000",
            user_id="user-123",
            created_at=datetime(2026, 5, 16, 10, 0, 0),
            updated_at=datetime(2026, 5, 16, 12, 0, 0),
            is_active=1,
            messages=[
                ChatMessageResponse(
                    message_id=1,
                    session_id="550e8400-e29b-41d4-a716-446655440000",
                    role="user",
                    content="Phan tich co phieu",
                    lang="vi",
                    created_at=datetime(2026, 5, 16, 10, 5, 0),
                ),
                ChatMessageResponse(
                    message_id=2,
                    session_id="550e8400-e29b-41d4-a716-446655440000",
                    role="assistant",
                    content="Noi dung phan tich",
                    lang="vi",
                    created_at=datetime(2026, 5, 16, 10, 6, 0),
                ),
            ],
        )
        assert len(session.messages) == 2
        assert session.messages[0].role == "user"
        assert session.messages[1].role == "assistant"

    def test_session_with_empty_messages(self):
        session = ChatSessionResponse(
            session_id="550e8400-e29b-41d4-a716-446655440000",
            created_at=datetime(2026, 5, 16, 10, 0, 0),
            updated_at=datetime(2026, 5, 16, 10, 0, 0),
            is_active=1,
            messages=[],
        )
        assert len(session.messages) == 0

    def test_session_missing_required_fields(self):
        with pytest.raises(ValidationError):
            ChatSessionResponse(
                session_id="550e8400-e29b-41d4-a716-446655440000",
                created_at=datetime(2026, 5, 16, 10, 0, 0),
                updated_at=datetime(2026, 5, 16, 10, 0, 0),
            )


class TestMessageCreate:
    def test_message_create_user_message(self):
        msg = MessageCreate(message="Phan tich co phieu VND")
        assert msg.message == "Phan tich co phieu VND"
        assert msg.lang is None

    def test_message_create_with_lang(self):
        msg = MessageCreate(message="Analyze FPT stock", lang="en")
        assert msg.lang == "en"

    def test_message_create_whitespace_message_is_valid(self):
        msg = MessageCreate(message="   ")
        assert msg.message == "   "

    def test_message_create_missing_message(self):
        with pytest.raises(ValidationError):
            MessageCreate()
