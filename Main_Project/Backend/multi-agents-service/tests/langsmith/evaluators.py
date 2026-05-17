"""
LangSmith custom evaluators for multi-agents-service.

Each evaluator receives a LangSmith Run and Example and returns
{"score": 0|1, "comment": str}.
"""
from __future__ import annotations
from typing import Any


def portfolio_weights_sum(run, example) -> dict:
    """Portfolio weights must sum to 1.0 (±0.02 tolerance)."""
    portfolio = (run.outputs or {}).get("proposed_portfolio", {})
    if not portfolio:
        return {"score": 0, "comment": "No proposed_portfolio in output"}
    total = sum(portfolio.values())
    if abs(total - 1.0) <= 0.02:
        return {"score": 1, "comment": f"Weights sum = {total:.4f} ✓"}
    return {"score": 0, "comment": f"Weights sum = {total:.4f} — expected ~1.0"}


def report_has_required_sections(run, example) -> dict:
    """Final report must contain Portfolio, Metrics, and Commentary sections."""
    report: str = (run.outputs or {}).get("final_report", "")
    if not report:
        return {"score": 0, "comment": "No final_report in output"}

    required = ["portfolio", "metric", "comment"]
    missing = [kw for kw in required if kw.lower() not in report.lower()]
    if not missing:
        return {"score": 1, "comment": "All required sections present ✓"}
    return {"score": 0, "comment": f"Missing sections: {missing}"}


def no_error_state(run, example) -> dict:
    """Workflow must complete without error (status == 'completed')."""
    outputs = run.outputs or {}
    status = outputs.get("status", "")
    error = outputs.get("error") or outputs.get("error_message")

    if status == "completed" and not error:
        return {"score": 1, "comment": "Workflow completed successfully ✓"}
    return {"score": 0, "comment": f"status={status!r}, error={error!r}"}


def language_correct(run, example) -> dict:
    """Output language must match the requested language (vi/en)."""
    expected_lang = (example.inputs or {}).get("lang", "en")
    report: str = (run.outputs or {}).get("final_report", "")

    if not report:
        return {"score": 0, "comment": "No report to check language"}

    vi_keywords = ["danh mục", "tỷ lệ", "hiệu suất", "phân tích", "khuyến nghị"]
    en_keywords = ["portfolio", "allocation", "performance", "analysis", "recommendation"]

    vi_count = sum(1 for kw in vi_keywords if kw in report.lower())
    en_count = sum(1 for kw in en_keywords if kw in report.lower())

    detected = "vi" if vi_count > en_count else "en"
    if detected == expected_lang:
        return {"score": 1, "comment": f"Language correct: {detected} ✓"}
    return {"score": 0, "comment": f"Expected {expected_lang!r}, detected {detected!r}"}


def sharpe_ratio_reasonable(run, example) -> dict:
    """Individual asset Sharpe ratios must be in [-5, 5] range."""
    metrics: dict[str, Any] = (run.outputs or {}).get("metrics", {})
    if not metrics:
        return {"score": 0, "comment": "No metrics in output"}

    outliers = []
    for ticker, m in metrics.items():
        if ticker == "portfolio" or not isinstance(m, dict):
            continue
        sharpe = m.get("sharpe_ratio")
        if sharpe is not None and not (-5 <= sharpe <= 5):
            outliers.append(f"{ticker}: {sharpe:.2f}")

    if not outliers:
        return {"score": 1, "comment": "All Sharpe ratios in [-5, 5] ✓"}
    return {"score": 0, "comment": f"Outlier Sharpe ratios: {outliers}"}


ALL_EVALUATORS = [
    portfolio_weights_sum,
    report_has_required_sections,
    no_error_state,
    language_correct,
    sharpe_ratio_reasonable,
]
