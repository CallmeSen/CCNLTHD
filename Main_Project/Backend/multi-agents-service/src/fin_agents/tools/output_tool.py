"""
Tool: structure_output
Formats the final workflow state into a Markdown report.
"""
import logging
from typing import Dict

from src.fin_agents.core.finance.report import structure_output_report

logger = logging.getLogger(__name__)


def structure_output_tool(state: Dict) -> str:
    """
    Tool: structure_output
    Formats the final workflow state into a Markdown report.
    Returns the report text.
    """
    logger.info("Tool: Structuring output report")
    try:
        return structure_output_report(state)
    except Exception as e:
        logger.error(f"Error structuring output: {e}")
        return f"# Portfolio Report\n\nError generating report: {e}"
