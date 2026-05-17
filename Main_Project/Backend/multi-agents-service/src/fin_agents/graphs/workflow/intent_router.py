"""
Intent router for chat workflow routing.

Classifies user intent using an LLM to route to the appropriate workflow:
  - general_chat  : conversational, no structured analysis needed
  - stock_analysis: user asks about specific stock(s) or wants analysis
  - portfolio     : user wants portfolio generation/rebalancing
  - unknown       : cannot determine intent
"""

import json
import logging
import re
from typing import Literal

import structlog

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from src.fin_agents.graphs.workflow.stock_advisory.agents.agent_loader import get_shared_llm

logger = logging.getLogger(__name__)

Intent = Literal["general_chat", "stock_analysis", "portfolio", "unknown"]

INTENT_SYSTEM_PROMPT_EN = """You are an intent classifier for a financial chatbot. Given a user message, classify it into exactly ONE of the following intents:

1. "general_chat" - The user is making casual conversation, asking non-financial questions, greeting, or asking about topics unrelated to investing/stocks/portfolios.
2. "stock_analysis" - The user mentions one or more specific stock tickers (e.g., AAPL, FPT, VNM), wants to analyze a stock's performance, asks about price/history/financials of a specific company, or asks about a particular asset.
3. "portfolio" - The user explicitly asks for portfolio generation, allocation, rebalancing, or investment recommendation across multiple assets.
4. "unknown" - Cannot confidently classify the message.

IMPORTANT: When in doubt, lean toward "stock_analysis" if ANY stock ticker or company name is mentioned, or toward "general_chat" if the message is clearly conversational.
Never suggest portfolio allocation unless the user explicitly asks for it."""

INTENT_SYSTEM_PROMPT_VI = """Bạn là bộ phân loại ý định cho chatbot tài chính. Dựa trên tin nhắn của người dùng, phân loại thành ĐÚNG MỘT trong các ý định sau:

1. "general_chat" - Người dùng nói chuyện thông thường, hỏi câu hỏi không liên quan tài chính, chào hỏi, hoặc hỏi về chủ đề không liên quan đến đầu tư/cổ phiếu/danh mục.
2. "stock_analysis" - Người dùng đề cập một hoặc nhiều mã cổ phiếu cụ thể (ví dụ: AAPL, FPT, VNM), muốn phân tích cổ phiếu, hỏi về giá/lịch sử/tài chính của công ty cụ thể, hoặc hỏi về tài sản cụ thể.
3. "portfolio" - Người dùng yêu cầu tạo danh mục đầu tư, phân bổ, cân bằng lại, hoặc khuyến nghị đầu tư.
4. "unknown" - Không thể phân loại.

QUAN TRỌNG: Khi nghi ngờ, hãy chọn "stock_analysis" nếu có mã cổ phiếu hoặc tên công ty được đề cập, hoặc "general_chat" nếu tin nhắn rõ ràng là hội thoại."""


def classify_intent(
    message: str,
    conversation_history: list | None = None,
    lang: str = "en",
) -> Intent:
    """
    Classify user intent using an LLM.

    Parameters
    ----------
    message : str
        The current user message.
    conversation_history : list, optional
        Prior messages in the session for context.
    lang : str
        Language code ("en" or "vi").

    Returns
    -------
    Intent
        One of: "general_chat", "stock_analysis", "portfolio", "unknown"
    """
    system_prompt = INTENT_SYSTEM_PROMPT_VI if lang == "vi" else INTENT_SYSTEM_PROMPT_EN

    history_text = ""
    if conversation_history:
        history_lines = []
        for msg in conversation_history[-6:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")[:300]
            history_lines.append(f"{role}: {content}")
        history_text = "\n".join(history_lines)

    human_template = "{message}"
    if history_text:
        human_template = (
            "Conversation history:\n"
            "{history}\n\n"
            "Current message:\n"
            "{message}"
        )

    class _IntentSchema:
        pass

    class _IntentParser(JsonOutputParser):
        def parse(self, text: str) -> dict:
            try:
                return super().parse(text)
            except Exception:
                fences = re.findall(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
                if fences:
                    return json.loads(fences[0].strip())
                return {"intent": _fallback_intent(message)}

    try:
        from pydantic.v1 import BaseModel, Field
        _schema_class = type("_IntentSchema", (BaseModel,), {
            "intent": Field(
                description=f"Intent: {', '.join(['general_chat', 'stock_analysis', 'portfolio', 'unknown'])}",
                default="unknown",
            ),
        })
        parser = JsonOutputParser(pydantic_object=_schema_class)
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_template),
        ])
        chain = prompt | get_shared_llm() | parser
        params = {"message": message}
        if history_text:
            params["history"] = history_text
        result = chain.invoke(params)
        intent_str = result.get("intent", "unknown")
        if intent_str not in ("general_chat", "stock_analysis", "portfolio"):
            intent_str = "unknown"
        logger.info(f"Intent classified: {intent_str} (message: {message[:80]})")
        return intent_str  # type: ignore[return-value]
    except Exception as e:
        logger.warning(f"Intent classification failed: {e}, using fallback")
        return _fallback_intent(message)


def _fallback_intent(message: str) -> Intent:
    """Simple keyword-based fallback when LLM classification fails."""
    msg_lower = message.lower()
    portfolio_keywords = [
        "portfolio", "danh mục", "phân bổ", "đầu tư", "allocation",
        "rebalance", "recommend", "khuyến nghị", "mua gì", "nên đầu tư",
        "build portfolio", "tạo danh mục",
    ]
    stock_keywords = [
        "stock", "cổ phiếu", "ticker", "phân tích", "analyze",
        "price", "giá", "perform", "hiệu suất", "AAPL", "FPT", "VNM",
        "VCB", "HPG", "MWG", "SSI", "BID", "CTG", "VPB", "TCB", "MBB",
        "VN30", "VN100", "VNINDEX",
    ]

    for kw in portfolio_keywords:
        if kw in msg_lower:
            return "portfolio"
    for kw in stock_keywords:
        if kw in msg_lower:
            return "stock_analysis"
    return "general_chat"
