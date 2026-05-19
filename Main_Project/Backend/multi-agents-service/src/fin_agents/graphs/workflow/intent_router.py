"""
Intent router for chat workflow routing.

Routes user messages to one of:
  - general_chat: conversational, no structured analysis needed
  - stock_analysis: asks about specific stocks/assets
  - portfolio: asks for allocation, generation, or rebalancing
"""

import json
import logging
import re
import unicodedata
from typing import Literal

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate

from src.fin_agents.agents.agent_loader import get_shared_llm

logger = logging.getLogger(__name__)

Intent = Literal["general_chat", "stock_analysis", "portfolio", "unknown"]

KNOWN_TICKERS = {
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA",
    "NFLX", "FPT", "VCB", "VNM", "HPG", "MWG", "SSI", "BID", "CTG",
    "VPB", "TCB", "MBB", "ACB", "VIC", "VHM", "VRE", "PNJ", "STB",
    "EIB", "SHB", "VCI", "KBC", "VN30", "VN100", "VNINDEX",
}

COMMON_WORDS = {
    "AND", "THE", "FOR", "WITH", "CAN", "YOU", "PLEASE", "WHAT", "HOW",
    "WHY", "BUY", "SELL", "HOLD", "CHAT", "HELP",
}

TICKER_PATTERN = re.compile(r"\b[A-Za-z]{2,5}(?:\.[A-Za-z]{2})?\b")

INTENT_SYSTEM_PROMPT_EN = """You are an intent classifier for a financial chatbot. Classify the user message into exactly one intent:

1. "general_chat" - casual conversation, greetings, or topics not needing stock/portfolio analysis.
2. "stock_analysis" - asks about specific tickers, companies, stock prices, history, financials, or performance.
3. "portfolio" - explicitly asks for portfolio generation, allocation, rebalancing, or recommendations across assets.
4. "unknown" - cannot classify confidently.

Return JSON only: {{"intent": "general_chat|stock_analysis|portfolio|unknown"}}.
If a stock ticker or company is mentioned, prefer stock_analysis. Only use portfolio when the user explicitly asks for a portfolio or allocation."""

INTENT_SYSTEM_PROMPT_VI = """Ban la bo phan loai y dinh cho chatbot tai chinh. Hay phan loai tin nhan nguoi dung thanh dung mot intent:

1. "general_chat" - hoi thoai thong thuong, chao hoi, hoac cau hoi khong can phan tich co phieu/danh muc.
2. "stock_analysis" - hoi ve ma co phieu, cong ty cu the, gia, lich su, tai chinh, hieu suat.
3. "portfolio" - yeu cau tao danh muc, phan bo, tai can bang, hoac khuyen nghi tren nhieu tai san.
4. "unknown" - khong phan loai duoc.

Chi tra ve JSON: {{"intent": "general_chat|stock_analysis|portfolio|unknown"}}.
Neu co ma co phieu hoac ten cong ty, uu tien stock_analysis. Chi dung portfolio khi nguoi dung noi ro ve danh muc hoac phan bo."""


def _normalize_text(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text.lower())
    without_marks = "".join(
        char for char in normalized
        if unicodedata.category(char) != "Mn"
    )
    return without_marks.replace("đ", "d")


def _extract_ticker_candidates(message: str) -> list[str]:
    """Extract obvious ticker symbols without relying on an LLM."""
    tickers: list[str] = []
    for match in TICKER_PATTERN.findall(message):
        ticker = match.upper().strip().replace(".VN", "")
        if ticker in COMMON_WORDS:
            continue
        is_known = ticker in KNOWN_TICKERS
        is_visibly_ticker = match.strip() == match.strip().upper() and len(ticker) >= 3
        if (is_known or is_visibly_ticker) and ticker not in tickers:
            tickers.append(ticker)
    return tickers


def classify_intent(
    message: str,
    conversation_history: list | None = None,
    lang: str = "en",
) -> Intent:
    """Classify user intent using the LLM, falling back to deterministic routing."""
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
                description="Intent: general_chat, stock_analysis, portfolio, unknown",
                default="unknown",
            ),
        })
        parser = _IntentParser(pydantic_object=_schema_class)
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
        if intent_str not in ("general_chat", "stock_analysis", "portfolio") or intent_str == "unknown":
            intent_str = _fallback_intent(message)
        logger.info("Intent classified: %s (message: %s)", intent_str, message[:80])
        return intent_str  # type: ignore[return-value]
    except Exception as e:
        logger.warning("Intent classification failed: %s, using fallback", e)
        return _fallback_intent(message)


def _fallback_intent(message: str) -> Intent:
    """Simple keyword and ticker based fallback when LLM classification fails."""
    msg_lower = message.lower()
    msg_normalized = _normalize_text(message)

    portfolio_keywords = [
        "portfolio", "allocation", "rebalance", "build portfolio",
        "danh muc", "phan bo", "tai can bang", "tao danh muc",
        "xay dung danh muc", "phan bo von",
    ]
    stock_keywords = [
        "stock", "ticker", "analyze", "analysis", "price", "perform",
        "co phieu", "ma co phieu", "phan tich", "gia", "hieu suat",
        "chung khoan", "doanh nghiep",
    ]

    for keyword in portfolio_keywords:
        if keyword in msg_lower or keyword in msg_normalized:
            return "portfolio"

    if _extract_ticker_candidates(message):
        return "stock_analysis"

    for keyword in stock_keywords:
        if keyword in msg_lower or keyword in msg_normalized:
            return "stock_analysis"

    return "general_chat"
