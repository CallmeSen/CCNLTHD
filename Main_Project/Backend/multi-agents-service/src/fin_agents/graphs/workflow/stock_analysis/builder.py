"""
Stock Analysis LangGraph workflow.

Purpose: Analyze specific stocks with market data + metrics + news.
Decoupled from the portfolio generation pipeline.

Graph:
    parse_tickers
        +--> general_chat_fallback --> END  (no tickers/company names)
        +--> resolve_company_names
                +--> general_chat_fallback --> END  (lookup failed)
                +--> fetch_news --> fetch_data --> calculate_metrics --> structure_output --> END
"""

import json
import logging
from typing import Any, Dict

from langgraph.graph import StateGraph, END

from src.fin_agents.agents import get_agent
from src.fin_agents.agents.agent_loader import get_shared_llm
from src.fin_agents.core.text_sanitizer import remove_disclaimer_blocks
from src.fin_agents.graphs.workflow.stock_analysis.prompts import (
    PARSE_TICKERS_SYSTEM_EN,
    PARSE_TICKERS_SYSTEM_VI,
    STOCK_ANALYSIS_SYSTEM_EN,
    STOCK_ANALYSIS_SYSTEM_VI,
)
from src.fin_agents.graphs.workflow.stock_analysis.routing import (
    route_after_data,
    route_after_metrics,
    route_after_news,
    route_after_parse,
    route_after_resolve,
)
from src.fin_agents.graphs.workflow.stock_analysis.state import StockAnalysisState
from src.fin_agents.graphs.workflow.intent_router import _extract_ticker_candidates

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

def parse_tickers(state: StockAnalysisState) -> Dict[str, Any]:
    """
    Extract stock tickers and company names from the user message using LLM.

    Returns tickers if found, or company_names for lookup.
    """
    lang = state.get("lang", "en")
    msg = state.get("message", "")
    personalization = state.get("personalization_context", {})
    system_prompt = PARSE_TICKERS_SYSTEM_VI if lang == "vi" else PARSE_TICKERS_SYSTEM_EN

    extra_context = ""
    if personalization.get("mentioned_tickers"):
        extra_context = f"\nNote: user has uploaded files mentioning these tickers: {personalization['mentioned_tickers']}"

    try:
        from pydantic.v1 import BaseModel, Field
        from langchain_core.output_parsers import JsonOutputParser

        _TickerSchema = type("_TickerSchema", (BaseModel,), {
            "tickers": Field(
                default_factory=list,
                description="List of stock ticker symbols (uppercase, e.g. AAPL, VCB, FPT)",
            ),
            "company_names": Field(
                default_factory=list,
                description="List of company names mentioned without tickers (e.g. Apple, Samsung, Vinamilk)",
            ),
            "goal": Field(default="", description="Brief description of what user wants"),
        })
        parser = JsonOutputParser(pydantic_object=_TickerSchema)
        from langchain_core.prompts import ChatPromptTemplate
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "User message: {message}" + extra_context),
        ])
        chain = prompt | get_shared_llm() | parser
        result = chain.invoke({"message": msg})
        tickers = [t.upper().strip().replace(".VN", "") for t in result.get("tickers", []) if t]
        for ticker in _extract_ticker_candidates(msg):
            if ticker not in tickers:
                tickers.append(ticker)
        company_names = [c.strip() for c in result.get("company_names", []) if c.strip()]
        goal = result.get("goal", "")

        logger.info(f"Parsed tickers: {tickers}, company names: {company_names}")
        return {"tickers": tickers, "company_names": company_names, "goal": goal}
    except Exception as e:
        logger.error(f"Ticker parsing failed: {e}")
        tickers = _extract_ticker_candidates(msg)
        if tickers:
            return {
                "tickers": tickers,
                "company_names": [],
                "goal": "stock analysis",
            }
        return {"tickers": [], "company_names": [], "goal": "", "error_message": f"Failed to parse message: {e}"}


def resolve_company_names(state: StockAnalysisState) -> Dict[str, Any]:
    """
    Look up ticker symbols for company names using LLM + known market knowledge.

    Falls back to general_chat if no tickers can be resolved.
    """
    tickers = state.get("tickers", [])
    company_names = state.get("company_names", [])
    lang = state.get("lang", "en")

    if not company_names:
        return {}  # no lookup needed, just pass through

    resolved = list(tickers)
    unresolvable = []

    for name in company_names:
        ticker = _lookup_ticker(name, lang)
        if ticker:
            if ticker not in resolved:
                resolved.append(ticker)
        else:
            unresolvable.append(name)

    if not resolved:
        return {
            "error_message": f"Could not resolve any tickers for: {', '.join(company_names)}",
        }

    logger.info(f"Resolved company names to tickers: {resolved}, unresolvable: {unresolvable}")
    result = {"tickers": resolved}
    if unresolvable:
        unres_str = f" (could not find tickers for: {', '.join(unresolvable)})"
        msg = state.get("message", "")
        result["message"] = msg + unres_str
    return result


def _lookup_ticker(company_name: str, lang: str) -> str | None:
    """
    Look up a ticker symbol for a company name.

    Uses LLM with a curated list of known companies as context.
    Returns None if not found.
    """
    known_companies = {
        "apple": "AAPL", "microsoft": "MSFT", "google": "GOOGL", "alphabet": "GOOGL",
        "amazon": "AMZN", "nvidia": "NVDA", "meta": "META", "facebook": "META",
        "tesla": "TSLA", "netflix": "NFLX", "台积电": "TSM", "tsmc": "TSM",
        "samsung": "005930.KS",
        # Vietnamese
        "fpt": "FPT", "vietinbank": "CTG", "vietcombank": "VCB",
        "vingroup": "VIC", "vinamilk": "VNM", "vpbank": "VPB",
        "techcombank": "TCB", "mbbank": "MBB", "acb": "ACB",
        "ssc": "SSI", "hpg": "HPG", "mwg": "MWG", "pnj": "PNJ",
        "vib": "VIB", "bidv": "BID", "agribank": "ARB",
        "sacombank": "STB", "eximbank": "EIB", "shinhan": "SHB",
        "vietcap": "VCI", "bsc": "BSC", "ksc": "KBC",
    }
    name_lower = company_name.lower().strip()
    if name_lower in known_companies:
        return known_companies[name_lower]

    try:
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.output_parsers import JsonOutputParser
        from pydantic.v1 import BaseModel, Field

        system = (
            "You are a financial ticker lookup assistant. Given a company name, return the stock ticker symbol. "
            "For US stocks use e.g. AAPL, MSFT. For Vietnamese stocks use e.g. FPT, VCB, VNM. "
            "Return JSON: {\"ticker\": \"SYMBOL\"} or {\"ticker\": null} if unknown."
        )
        _LookupSchema = type("_LookupSchema", (BaseModel,), {
            "ticker": Field(default=None, description="Ticker symbol or null"),
        })
        parser = JsonOutputParser(pydantic_object=_LookupSchema)
        prompt = ChatPromptTemplate.from_messages([
            ("system", system),
            ("human", "Company name: {name}"),
        ])
        chain = prompt | get_shared_llm() | parser
        result = chain.invoke({"name": company_name})
        ticker = result.get("ticker")
        if ticker:
            return ticker.upper().strip()
        return None
    except Exception as e:
        logger.warning(f"Ticker lookup failed for '{company_name}': {e}")
        return None


def _remove_disclaimer_lines(text: str) -> str:
    """Remove generic disclaimer lines from stock-analysis chat output."""
    return remove_disclaimer_blocks(text)


def general_chat_fallback(state: StockAnalysisState) -> Dict[str, Any]:
    """
    Called when no tickers could be resolved.
    Generates a friendly response acknowledging the limitation.
    """
    lang = state.get("lang", "en")
    error_msg = state.get("error_message", "Could not identify any stock tickers in your message.")
    msg = state.get("message", "")

    try:
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.output_parsers import StrOutputParser
        from langchain_core.messages import HumanMessage

        system_en = (
            "You are a friendly financial assistant. A user asked for stock analysis "
            "but we could not identify specific stock tickers in their message. "
            "Acknowledge this clearly, ask them to provide a ticker symbol or specific company name "
            "(e.g. AAPL for Apple, FPT for FPT Corporation), and offer brief general guidance. "
            "Keep it short (2-4 sentences). Never make up tickers."
        )
        system_vi = (
            "Bạn là trợ lý tài chính thân thiện. Người dùng yêu cầu phân tích cổ phiếu "
            "nhưng không thể xác định được mã cổ phiếu cụ thể. "
            "Hãy thông báo rõ ràng, yêu cầu họ cung cấp mã cổ phiếu hoặc tên công ty cụ thể "
            "(ví dụ: AAPL cho Apple, FPT cho Tập đoàn FPT), và đưa ra hướng dẫn ngắn gọn. "
            "Giữ ngắn gọn (2-4 câu). Không bịa đặt mã cổ phiếu."
        )
        system = system_vi if lang == "vi" else system_en

        prompt = ChatPromptTemplate.from_messages([
            ("system", system),
            ("human", "User message: {message}\n\nIssue: {error}"),
        ])
        chain = prompt | get_shared_llm() | StrOutputParser()
        response = chain.invoke({"message": msg, "error": error_msg})

        logger.info("General chat fallback triggered for stock_analysis")
        return {"report": response}
    except Exception as e:
        logger.error(f"General chat fallback failed: {e}")
        if lang == "vi":
            return {
                "report": (
                    f"Tôi không thể tìm thấy mã cổ phiếu trong tin nhắn của bạn.\n\n"
                    f"Vui lòng cung cấp mã cổ phiếu cụ thể (ví dụ: FPT, AAPL, VNM) "
                    f"hoặc tên công ty rõ ràng để tôi có thể phân tích."
                )
            }
        return {
            "report": (
                f"I couldn't identify any stock tickers in your message.\n\n"
                f"Please provide a specific ticker symbol (e.g. AAPL, FPT, VNM) "
                f"or a clear company name so I can analyze it."
            )
        }


def fetch_news(state: StockAnalysisState) -> Dict[str, Any]:
    """Fetch relevant market news using the shared news agent."""
    tickers = state.get("tickers", [])
    goal = state.get("goal", "")

    context_state = {
        "user_profile": {"goal": goal, "risk_tolerance": "medium"},
        "asset_universe": tickers,
    }
    return get_agent("fetch_market_news").invoke(context_state)


def fetch_data(state: StockAnalysisState) -> Dict[str, Any]:
    """Fetch financial data for the identified tickers using the shared data agent."""
    tickers = state.get("tickers", [])

    if not tickers:
        return {"financial_data": {}, "error_message": "No tickers to fetch data for."}

    context_state = {
        "asset_universe": tickers,
        "user_profile": {
            "goal": state.get("goal", "stock analysis"),
            "risk_tolerance": "medium",
            "time_horizon": "1y",
        },
    }
    return get_agent("fetch_data").invoke(context_state)


def calculate_metrics(state: StockAnalysisState) -> Dict[str, Any]:
    """Calculate financial metrics using the shared metrics agent."""
    data = state.get("financial_data", {})
    if not data:
        return {"metrics": {}, "error_message": "No financial data to calculate metrics from."}
    context_state = {
        "financial_data": data,
        "proposed_portfolio": None,
    }
    return get_agent("calculate_metrics").invoke(context_state)


def structure_output(state: StockAnalysisState) -> Dict[str, Any]:
    """Generate the final Markdown analysis report."""
    lang = state.get("lang", "en")
    tickers = state.get("tickers", [])
    metrics = state.get("metrics", {})
    news = state.get("market_news", "No news available.")
    personalization = state.get("personalization_context", {})
    goal = state.get("goal", "stock analysis")

    system_prompt = STOCK_ANALYSIS_SYSTEM_VI if lang == "vi" else STOCK_ANALYSIS_SYSTEM_EN

    metrics_json = json.dumps(metrics, indent=2, default=str)
    if len(metrics_json) > 5000:
        metrics_json = metrics_json[:5000] + "\n... (truncated)"

    personalization_text = ""
    if personalization.get("has_context"):
        personalization_text = (
            f"\n\n[Personalization Context from uploaded files]: "
            f"{personalization.get('summary', '')}\n"
            f"Details:\n{personalization.get('combined_text_context', '')}"
        )

    try:
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.output_parsers import StrOutputParser

        llm = get_shared_llm()
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human",
             "Tickers: {tickers}\n"
             "User goal: {goal}\n"
             "Financial metrics:\n{metrics}\n"
             "Market news:\n{news}"
             + personalization_text),
        ])
        parser = StrOutputParser()
        chain = prompt | llm | parser
        report = chain.invoke({
            "tickers": ", ".join(tickers),
            "goal": goal,
            "metrics": metrics_json,
            "news": news,
        })
        report = _remove_disclaimer_lines(report)

        logger.info(f"Stock analysis report generated ({len(report)} chars)")
        return {"report": report}
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        return {"report": f"Analysis generation failed: {e}", "error_message": str(e)}


def handle_error(state: StockAnalysisState) -> Dict[str, Any]:
    """Handle errors gracefully."""
    error = state.get("error_message") or "An unspecified error occurred."
    lang = state.get("lang", "en")
    if lang == "vi":
        return {
            "report": (
                "# Phân Tích Thất Bại\n\n"
                f"Đã xảy ra lỗi: {error}\n\n"
                "Vui lòng thử lại hoặc liên hệ hỗ trợ."
            )
        }
    return {
        "report": (
            "# Analysis Failed\n\n"
            f"An error occurred: {error}\n\n"
            "Please try again or contact support."
        )
    }


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------

def build_stock_analysis_graph() -> StateGraph:
    """Build and return the stock analysis StateGraph."""
    workflow = StateGraph(StockAnalysisState)

    workflow.add_node("parse_tickers", parse_tickers)
    workflow.add_node("resolve_company_names", resolve_company_names)
    workflow.add_node("fetch_news", fetch_news)
    workflow.add_node("fetch_data", fetch_data)
    workflow.add_node("calculate_metrics", calculate_metrics)
    workflow.add_node("structure_output", structure_output)
    workflow.add_node("handle_error", handle_error)
    workflow.add_node("general_chat_fallback", general_chat_fallback)

    workflow.set_entry_point("parse_tickers")

    workflow.add_conditional_edges(
        "parse_tickers",
        route_after_parse,
        {"general_chat_fallback": "general_chat_fallback", "resolve_company_names": "resolve_company_names"},
    )
    workflow.add_conditional_edges(
        "resolve_company_names",
        route_after_resolve,
        {"general_chat_fallback": "general_chat_fallback", "fetch_news": "fetch_news"},
    )
    workflow.add_conditional_edges(
        "fetch_news",
        route_after_news,
        {"handle_error": "handle_error", "fetch_data": "fetch_data"},
    )
    workflow.add_conditional_edges(
        "fetch_data",
        route_after_data,
        {"handle_error": "handle_error", "calculate_metrics": "calculate_metrics"},
    )
    workflow.add_conditional_edges(
        "calculate_metrics",
        route_after_metrics,
        {"handle_error": "handle_error", "structure_output": "structure_output"},
    )

    workflow.add_edge("structure_output", END)
    workflow.add_edge("handle_error", END)
    workflow.add_edge("general_chat_fallback", END)

    return workflow


def compile_stock_analysis_graph():
    """Build and compile the stock analysis graph."""
    return build_stock_analysis_graph().compile()
