"""
FastAPI routes for the stock advisory (portfolio generation) workflow.
"""

import logging
import os
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.fin_agents.db.database import get_db
from src.fin_agents.api.schemas import (
    StockAnalyzeRequest,
    StockAnalyzeResponse,
    HistoryItem,
)
from src.fin_agents.core.orchestrator import OrchestratorService
from src.fin_agents.db.repositories import (
    AdvisoryRequestRepository,
    GeneratedReportRepository,
)
from src.fin_agents.db.models import AdvisoryRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/portfolio", tags=["portfolio"])

STORAGE_BASE = os.getenv("STORAGE_BASE", "./storage")
STORAGE_PORTFOLIOS = os.path.join(STORAGE_BASE, "portfolios")
STORAGE_VISUALIZATIONS = os.path.join(STORAGE_BASE, "visualizations")


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@router.post("/analyze", response_model=StockAnalyzeResponse)
async def analyze_portfolio(
    request: StockAnalyzeRequest,
    db: Session = Depends(get_db),
):
    """
    Run the full stock portfolio generation workflow.
    Accepts a natural-language request, executes the LangGraph workflow,
    persists results to DB, and returns the Markdown report + structured data.
    """
    orchestrator = OrchestratorService(db)
    result = orchestrator.run_stock_workflow(
        initial_request=request.request,
        lang=request.lang or "en",
    )

    return StockAnalyzeResponse(
        run_id=result["run_id"],
        status=result["status"],
        final_report=result.get("final_report"),
        user_profile=result.get("user_profile"),
        proposed_portfolio=result.get("proposed_portfolio"),
        metrics=result.get("metrics"),
        validation_result=result.get("validation_result"),
        llm_commentary=result.get("llm_commentary"),
        market_news=result.get("market_news"),
        lang=result.get("lang"),
        error=result.get("error"),
    )


@router.get("/history", response_model=list[HistoryItem])
async def get_history(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    """
    Get all past portfolio analysis runs, most recent first.
    Returns all system-generated stock advisory requests (client_id IS NULL).
    """
    requests = db.query(AdvisoryRequest).filter(
        AdvisoryRequest.client_id.is_(None)
    ).order_by(AdvisoryRequest.created_at.desc()).offset(skip).limit(limit).all()

    return [
        HistoryItem(
            run_id=r.request_id,
            timestamp=r.created_at.isoformat() if r.created_at else "",
            request=r.question or "",
            status=r.status,
            portfolio=None,
        )
        for r in requests
    ]


@router.get("/report/{run_id}")
async def get_report(
    run_id: str,
    db: Session = Depends(get_db),
):
    """
    Get the full report data for a specific run, including metrics,
    portfolio allocation, validation result, and visualization URL.
    """
    report = GeneratedReportRepository.get_by_request(db, run_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    request_row = AdvisoryRequestRepository.get_by_id(db, run_id)

    portfolio_json = report.report_json or {}
    proposed_portfolio = portfolio_json.get("proposed_portfolio") or {}
    metrics = portfolio_json.get("metrics") or {}
    user_profile = portfolio_json.get("user_profile") or {}

    viz_path = os.path.join(STORAGE_VISUALIZATIONS, f"{run_id}.html")
    viz_url = f"/storage/visualizations/{run_id}.html"

    if not os.path.exists(viz_path) and proposed_portfolio:
        try:
            os.makedirs(STORAGE_VISUALIZATIONS, exist_ok=True)
            from src.fin_agents.core.finance.visualization import generate_dashboard
            generate_dashboard(
                metrics_data=metrics,
                allocation_data=proposed_portfolio,
                output_path=viz_path,
            )
        except Exception:
            viz_url = None
    elif not proposed_portfolio:
        viz_url = None

    return {
        "run_id": run_id,
        "status": request_row.status.lower() if request_row else "completed",
        "report": report.report_text,
        "created_at": report.created_at.isoformat() if report.created_at else "",
        "user_profile": user_profile,
        "proposed_portfolio": proposed_portfolio,
        "metrics": metrics,
        "validation_result": portfolio_json.get("validation_result"),
        "llm_commentary": portfolio_json.get("llm_commentary"),
        "market_news": portfolio_json.get("market_news"),
        "visualization_url": viz_url,
    }


@router.get("/visualization/{run_id}")
async def get_visualization(
    run_id: str,
    db: Session = Depends(get_db),
):
    """
    Get (or generate) the HTML visualization for a run.
    """
    report = GeneratedReportRepository.get_by_request(db, run_id)
    if not report:
        raise HTTPException(status_code=404, detail="Run not found")

    portfolio_json = report.report_json or {}
    portfolio = portfolio_json.get("proposed_portfolio")

    viz_path = os.path.join(STORAGE_VISUALIZATIONS, f"{run_id}.html")
    os.makedirs(STORAGE_VISUALIZATIONS, exist_ok=True)

    from src.fin_agents.core.finance.visualization import generate_dashboard

    metrics = portfolio_json.get("metrics") or {}
    viz_file = generate_dashboard(
        metrics_data=metrics,
        allocation_data=portfolio or {},
        output_path=viz_path,
    )
    if not viz_file:
        logger.error(f"generate_dashboard returned None for run_id={run_id}")
        raise HTTPException(status_code=500, detail="Failed to generate visualization")

    return {"run_id": run_id, "visualization_url": f"/storage/visualizations/{run_id}.html"}
