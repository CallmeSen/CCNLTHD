"""
OrchestratorService — central API-level coordinator for all LangGraph workflows.

Responsibilities:
  - Invoke the appropriate workflow (stock_advisory)
  - Persist workflow results into the DB (RiskAssessment, Decision, GeneratedReport, AuditLog)
  - Update AdvisoryRequest status (PENDING -> PROCESSING -> COMPLETED/FAILED)
  - Provide a unified entry point for all workflow execution
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, Optional

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
        lang: str = "en",
        request_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Run the stock_advisory (portfolio generation) LangGraph workflow.

        Steps
        -----
        1. Generate run_id / request_id
        2. Log START to AuditLog
        3. Load and compile the graph via builder
        4. Persist to DB (RiskAssessment, GeneratedReport, AdvisoryRequest)
        5. Save report and portfolio to disk
        6. Return full result dict

        Returns
        -------
        Dict with keys: run_id, status, final_report, user_profile,
                        proposed_portfolio, metrics, validation_result
        """
        _ensure_storage()

        if not request_id:
            request_id = f"STK{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

        _log_audit(self.db, request_id, "orchestrator", "WORKFLOW_START", {
            "workflow": "stock_advisory",
            "lang": lang,
        })

        try:
            initial_state: Dict[str, Any] = {"initial_request": initial_request}

            graph = self._load_stock_graph()
            result: Dict[str, Any] = graph.invoke(initial_state)

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
            }

        except Exception as e:
            logger.exception(f"[{request_id}] Stock workflow failed: {e}")
            _log_audit(self.db, request_id, "orchestrator", "WORKFLOW_FAILED", {
                "error": str(e),
            })
            return {
                "run_id": request_id,
                "status": "failed",
                "final_report": None,
                "llm_commentary": None,
                "market_news": None,
                "error": str(e),
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
    def _load_stock_graph():
        """Load and compile the stock advisory graph."""
        from src.fin_agents.graphs.workflow.stock_advisory.builder import (
            compile_stock_advisory_graph,
        )
        return compile_stock_advisory_graph()
