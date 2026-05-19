"""
OrchestratorService — central API-level coordinator for all LangGraph workflows.

Responsibilities:
  - Invoke the appropriate workflow (stock_advisory)
  - Persist workflow results into the DB (RiskAssessment, Decision, GeneratedReport, AuditLog)
  - Update AdvisoryRequest status (PENDING -> PROCESSING -> COMPLETED/FAILED)
  - Provide a unified entry point for all workflow execution
  - Emit SSE events (text_delta, tool_call, tool_result) for real-time UI streaming
"""

import json
import logging
import os
import re
import time
import unicodedata
from datetime import datetime
from typing import Any, Callable, Dict, Optional

VIETNAMESE_CHARS = re.compile(r'[\u00C0-\u024F\u1EA0-\u1EF9]')


def _normalize_for_lang_detection(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text.lower())
    without_marks = "".join(
        char for char in normalized
        if unicodedata.category(char) != "Mn"
    )
    return without_marks.replace("\u0111", "d")


def _detect_lang(text: str) -> str:
    """Detect Vietnamese vs English from text. Returns 'vi' or 'en'."""
    if VIETNAMESE_CHARS.search(text):
        return "vi"
    words_lower = text.lower()
    normalized_words = _normalize_for_lang_detection(text)
    vi_keywords = [
        "phân tích", "cổ phiếu", "đầu tư", "danh mục", "rủi ro", "lợi nhuận",
        "thị trường", "chứng khoán", "tài chính", "vốn", "ngân hàng",
        "mua", "bán", "giá", "cổ tức", "lãi suất", "cho tôi", "tôi muốn",
        "tạo", "tổng hợp", "báo cáo", "xem", "biết", "nào", "các", "những",
        "và", "của", "là", "có", "không", "với", "để", "cho", "năm",
        "tháng", "ngày", "tuổi", "sinh", "năm", "trong", "ra", "vào",
    ]
    vi_ascii_keywords = [
        "xin chao", "chao ban", "chao", "cam on", "ban oi",
        "phan tich", "co phieu", "dau tu", "danh muc", "rui ro", "loi nhuan",
        "thi truong", "chung khoan", "tai chinh", "ngan hang", "co tuc",
        "lai suat", "cho toi", "toi muon", "tao", "tong hop", "bao cao",
        "tu van", "giup toi", "giup minh", "minh muon", "toi can", "nen mua", "nen ban",
    ]
    en_keywords = [
        "analyze", "stock", "invest", "portfolio", "risk", "return",
        "market", "financial", "capital", "bank", "buy", "sell", "price",
        "dividend", "interest", "create", "generate", "report", "show",
        "what", "which", "give", "me", "and", "the", "is", "are", "for",
        "with", "want", "need", "help", "please", "can", "you", "i",
    ]
    vi_count = sum(1 for kw in vi_keywords if kw in words_lower)
    vi_count += sum(1 for kw in vi_ascii_keywords if kw in normalized_words)
    en_count = sum(1 for kw in en_keywords if kw in words_lower)
    if vi_count > en_count:
        return "vi"
    return "en"

from sqlalchemy.orm import Session

from src.fin_agents.db.repositories import (
    AdvisoryRequestRepository,
    RiskAssessmentRepository,
    GeneratedReportRepository,
    AuditLogRepository,
)

logger = logging.getLogger(__name__)

STORAGE_BASE = os.getenv("STORAGE_BASE", "./storage")
STORAGE_REPORTS = os.path.join(STORAGE_BASE, "reports")
STORAGE_PORTFOLIOS = os.path.join(STORAGE_BASE, "portfolios")


def _ensure_storage():
    os.makedirs(STORAGE_REPORTS, exist_ok=True)
    os.makedirs(STORAGE_PORTFOLIOS, exist_ok=True)


def _log_audit(
    db: Session,
    request_id: str,
    agent_name: str,
    action: str,
    payload: Dict[str, Any],
):
    """Append an audit log entry. Silently skips on DB errors."""
    try:
        AuditLogRepository.log(db, request_id, agent_name, action, payload)
    except Exception as e:
        logger.warning(f"AuditLog write failed ({request_id}): {e}")


class OrchestratorService:
    """
    Central service that coordinates LangGraph workflow execution and
    persists all results into the database.
    """

    def __init__(self, db: Session):
        self.db = db

    def run_stock_workflow(
        self,
        initial_request: str,
        lang: Optional[str] = None,
        request_id: Optional[str] = None,
        event_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    ) -> Dict[str, Any]:
        """
        Run the stock_advisory (portfolio generation) LangGraph workflow.

        Steps
        -----
        1. Generate run_id / request_id
        2. Log START to AuditLog
        3. Load and compile the graph via builder
        4. Stream execution with event emissions (if callback provided)
        5. Persist to DB (RiskAssessment, GeneratedReport, AdvisoryRequest)
        6. Save report and portfolio to disk
        7. Return full result dict

        Parameters
        ----------
        event_callback: Optional[Callable[[str, Dict[str, Any]], None]]
            If provided, called with (event_type, data) for each workflow step.
            Supported event types:
              - "tool_call": emitted when a workflow node begins execution
              - "tool_result": emitted when a workflow node completes
              - "text_delta": emitted for streaming text chunks (if supported)

        Returns
        -------
        Dict with keys: run_id, status, final_report, user_profile,
                        proposed_portfolio, metrics, validation_result
        """
        _ensure_storage()

        lang = lang or _detect_lang(initial_request)

        if not request_id:
            request_id = f"STK{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

        _log_audit(self.db, request_id, "orchestrator", "WORKFLOW_START", {
            "workflow": "stock_advisory",
            "lang": lang,
        })

        def emit(event_type: str, data: Dict[str, Any]) -> None:
            if event_callback:
                try:
                    event_callback(event_type, data)
                except Exception:
                    pass

        try:
            initial_state: Dict[str, Any] = {"initial_request": initial_request, "lang": lang}

            graph = self._load_stock_graph()
            result: Dict[str, Any] = {}

            for step in graph.stream(initial_state, stream_mode="updates"):
                for node_name, node_output in step.items():
                    emit("tool_call", {
                        "tool": node_name,
                        "arguments": {"lang": lang},
                    })

                    emit("tool_result", {
                        "tool": node_name,
                        "status": "ok",
                        "preview": self._summarize_node_output(node_name, node_output),
                        "elapsed_ms": 0,
                    })

                    if isinstance(node_output, dict):
                        result.update(node_output)

            final_report = result.get("final_report", "# No report generated")
            status = "completed" if result.get("final_report") else "failed"

            self._save_report_file(request_id, final_report)
            self._save_portfolio_file(request_id, result.get("proposed_portfolio"))

            AdvisoryRequestRepository.create(self.db, {
                "request_id": request_id,
                "client_id": None,
                "portfolio_id": None,
                "question": initial_request,
                "status": "COMPLETED" if status == "completed" else "FAILED",
            })
            self._persist_stock_result(request_id, result)

            _log_audit(self.db, request_id, "orchestrator", "WORKFLOW_COMPLETED", {
                "status": status,
            })

            return {
                "run_id": request_id,
                "status": status,
                "final_report": final_report,
                "user_profile": result.get("user_profile"),
                "proposed_portfolio": result.get("proposed_portfolio"),
                "metrics": result.get("metrics"),
                "validation_result": result.get("validation_result"),
                "llm_commentary": result.get("llm_commentary"),
                "market_news": result.get("market_news"),
                "lang": lang,
            }

        except Exception as e:
            logger.exception(f"[{request_id}] Stock workflow failed: {e}")
            _log_audit(self.db, request_id, "orchestrator", "WORKFLOW_FAILED", {
                "error": str(e),
            })
            err_msg = str(e)
            error_report = (
                f"# Portfolio Generation Failed\n\n"
                f"An error occurred:\n\n"
                f"```\n{err_msg}\n```\n\n"
                "Please review the input or contact support if the problem persists."
            )
            return {
                "run_id": request_id,
                "status": "failed",
                "final_report": error_report,
                "error_message": err_msg,
                "llm_commentary": None,
                "market_news": None,
                "lang": lang,
                "error": err_msg,
            }

    def _persist_stock_result(self, request_id: str, result: Dict[str, Any]):
        """Write stub RiskAssessment and GeneratedReport for the stock workflow."""
        if result.get("proposed_portfolio"):
            RiskAssessmentRepository.create(self.db, {
                "request_id": request_id,
                "portfolio_id": None,
                "metrics_json": result.get("metrics", {}),
                "flags": {},
            })

        if result.get("final_report"):
            GeneratedReportRepository.create(self.db, {
                "request_id": request_id,
                "report_text": result["final_report"],
                "report_json": {
                    "proposed_portfolio": result.get("proposed_portfolio"),
                    "metrics": result.get("metrics"),
                    "user_profile": result.get("user_profile"),
                    "validation_result": result.get("validation_result"),
                    "llm_commentary": result.get("llm_commentary"),
                    "market_news": result.get("market_news"),
                },
                "file_path": os.path.join(STORAGE_REPORTS, f"{request_id}.md"),
            })

    def _save_report_file(self, request_id: str, report_text: str):
        path = os.path.join(STORAGE_REPORTS, f"{request_id}.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write(report_text or "")

    def _save_portfolio_file(self, request_id: str, portfolio_data: Any):
        if not portfolio_data:
            return
        import json
        path = os.path.join(STORAGE_PORTFOLIOS, f"{request_id}_context.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(portfolio_data, f, indent=2, default=str)

    def _update_status(self, request_id: str, status: str):
        AdvisoryRequestRepository.update_status(self.db, request_id, status)

    @staticmethod
    def _summarize_node_output(node_name: str, output: Any) -> str:
        """Create a short preview string for a node's output."""
        if output is None:
            return "No output"
        if isinstance(output, dict):
            if "final_report" in output:
                text = output["final_report"]
                return text[:300] + "..." if len(text) > 300 else text
            if "proposed_portfolio" in output:
                return f"Portfolio: {len(output.get('proposed_portfolio', []))} assets"
            if "metrics" in output:
                return f"Metrics: {output.get('metrics', {})}"
            if "user_profile" in output:
                return f"Profile: {output.get('user_profile', {})}"
            if "validation_result" in output:
                return f"Validation: {output.get('validation_result', {})}"
            if "llm_commentary" in output:
                return output["llm_commentary"][:200] if output["llm_commentary"] else "No commentary"
            if "market_news" in output:
                count = len(output.get("market_news", []))
                return f"{count} news items fetched"
            return str(output)[:200]
        return str(output)[:200]

    @staticmethod
    def _load_stock_graph():
        """Load and compile the stock advisory graph."""
        from src.fin_agents.graphs.workflow.stock_advisory.builder import (
            compile_stock_advisory_graph,
        )
        return compile_stock_advisory_graph()

    def run_chat_workflow(
        self,
        session_id: str,
        message: str,
        lang: Optional[str] = None,
        event_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    ) -> Dict[str, Any]:
        """
        Route a chat message to the appropriate workflow based on intent classification.

        Flow:
        1. Detect language
        2. Classify intent (general_chat | stock_analysis | portfolio)
        3. Build personalization context from uploaded files
        4. Load and run the appropriate workflow
        5. Return result dict with response text and metadata
        """
        lang = lang or _detect_lang(message)

        def emit(event_type: str, data: Dict[str, Any]) -> None:
            if event_callback:
                try:
                    event_callback(event_type, data)
                except Exception:
                    pass

        try:
            from src.fin_agents.graphs.workflow.intent_router import classify_intent
            from src.fin_agents.core.ingestion.context_builder import (
                build_personalization_context,
                build_conversation_context,
            )

            history = build_conversation_context(self.db, session_id)
            personalization = build_personalization_context(self.db, session_id)
            intent = classify_intent(message, history, lang)

            emit("intent", {"intent": intent, "lang": lang})
            logger.info(f"Chat workflow: intent={intent}, session={session_id}")

            if intent == "general_chat":
                return self._run_general_chat(
                    message, lang, history, personalization, emit,
                )
            elif intent == "stock_analysis":
                return self._run_stock_analysis(
                    message, lang, personalization, emit,
                )
            elif intent == "portfolio":
                result = self.run_stock_workflow(initial_request=message, lang=lang, event_callback=emit)
                result["intent"] = "portfolio"
                return result
            else:
                return self._run_general_chat(
                    message, lang, history, personalization, emit,
                )

        except Exception as e:
            logger.exception(f"Chat workflow failed: {e}")
            return {
                "status": "failed",
                "response": (
                    "I'm sorry, I encountered an error processing your message. "
                    "Please try again."
                ),
                "error": str(e),
                "lang": lang,
            }

    def _run_general_chat(
        self,
        message: str,
        lang: str,
        history: list,
        personalization: Dict[str, Any],
        emit: Callable,
    ) -> Dict[str, Any]:
        """Run the general chat workflow."""
        from src.fin_agents.graphs.workflow.general_chat.builder import (
            compile_general_chat_graph,
        )

        graph = compile_general_chat_graph()
        initial_state = {
            "message": message,
            "lang": lang,
            "conversation_history": history,
            "personalization_context": personalization,
        }

        result = graph.invoke(initial_state)
        response = result.get("response", "")

        emit("tool_result", {
            "tool": "general_chat",
            "status": "ok",
            "preview": response[:200] if response else "",
        })

        return {
            "status": "completed",
            "response": response,
            "intent": "general_chat",
            "lang": lang,
        }

    def _run_stock_analysis(
        self,
        message: str,
        lang: str,
        personalization: Dict[str, Any],
        emit: Callable,
    ) -> Dict[str, Any]:
        """Run the stock analysis workflow."""
        from src.fin_agents.graphs.workflow.stock_analysis.builder import (
            compile_stock_analysis_graph,
        )

        graph = compile_stock_analysis_graph()
        initial_state = {
            "message": message,
            "lang": lang,
            "personalization_context": personalization,
        }

        result = {}
        for step in graph.stream(initial_state, stream_mode="updates"):
            for node_name, node_output in step.items():
                emit("tool_call", {"tool": node_name, "lang": lang})
                emit("tool_result", {
                    "tool": node_name,
                    "status": "ok",
                    "preview": self._summarize_node_output(node_name, node_output),
                })
                if isinstance(node_output, dict):
                    result.update(node_output)

        report = result.get("report", "")
        status = "completed" if report else "failed"

        return {
            "status": status,
            "response": report,
            "intent": "stock_analysis",
            "lang": lang,
            "error_message": result.get("error_message"),
        }
