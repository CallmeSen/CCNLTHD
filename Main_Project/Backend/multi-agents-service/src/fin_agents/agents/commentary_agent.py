"""Agent 7: Generate LLM commentary explaining the portfolio."""
import json
import logging
from typing import Any, Dict, Optional

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from src.fin_agents.graphs.workflow.stock_advisory.prompts import (
    GENERATE_COMMENTARY_SYSTEM_EN,
    GENERATE_COMMENTARY_SYSTEM_VI,
)
from .agent_loader import get_shared_llm

logger = logging.getLogger(__name__)


class CommentaryAgent:
    """Generates a natural-language explanation of the portfolio allocation."""

    name = "generate_commentary"
    description = "Generates LLM commentary explaining the portfolio allocation"

    def __init__(self, llm=None, config: Optional[dict] = None):
        self._llm = llm if llm is not None else get_shared_llm()
        self._config = config or {}

    def invoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
        lang = state.get("lang", "en")
        system_prompt = GENERATE_COMMENTARY_SYSTEM_VI if lang == "vi" else GENERATE_COMMENTARY_SYSTEM_EN
        human_template_vi = "Ngữ cảnh:\n- Hồ sơ người dùng: {profile}\n- Danh mục đề xuất: {portfolio}\n- Chỉ số: {metrics}\n- Xác thực: {validation}\n- Tin tức thị trường: {news}\n- Lý do: {reasoning}"
        human_template_en = "Context:\n- User Profile: {profile}\n- Proposed Portfolio: {portfolio}\n- Metrics: {metrics}\n- Validation: {validation}\n- Market News: {news}\n- Reasoning: {reasoning}"
        human_template = human_template_vi if lang == "vi" else human_template_en
        disclaimer_vi = "\n\n**Tuyên bố miễn trừ trách nhiệm:** Đây là phân tích được tạo bởi AI và không cấu thành lời khuyên tài chính."
        disclaimer_en = "\n\n**Disclaimer:** This is an AI-generated analysis and does not constitute financial advice."
        disclaimer = disclaimer_vi if lang == "vi" else disclaimer_en
        user_profile = state.get("user_profile") or {}
        portfolio = state.get("proposed_portfolio") or {}
        metrics = state.get("metrics") or {}
        validation = state.get("validation_result") or {}
        news = state.get("market_news") or "N/A"
        llm_reasoning = state.get("llm_commentary") or "(No specific reasoning provided)"

        user_profile_summary = json.dumps(user_profile)
        metrics_summary = json.dumps(metrics, indent=2)
        if len(metrics_summary) > 4000:
            metrics_summary = metrics_summary[:4000] + "\n... (truncated)"
        validation_summary = f"Status: {validation.get('status', 'N/A').upper()}"
        if validation.get("errors"):
            validation_summary += f", Issues: {'; '.join(validation['errors'])}"
        portfolio_summary = json.dumps(portfolio) if isinstance(portfolio, dict) and portfolio else "No portfolio proposed."

        prompt_template = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_template),
        ])
        parser = StrOutputParser()
        chain = prompt_template | self._llm | parser

        try:
            commentary = chain.invoke({
                "profile": user_profile_summary,
                "portfolio": portfolio_summary,
                "metrics": metrics_summary,
                "validation": validation_summary,
                "news": news,
                "reasoning": llm_reasoning,
            })
            if "không phải là lời khuyên tài chính" not in commentary.lower() and "miễn trừ trách nhiệm" not in commentary.lower() and "disclaimer" not in commentary.lower():
                commentary += disclaimer
            return {"llm_commentary": commentary, "step": self.name}
        except Exception as e:
            logger.error(f"Error generating commentary: {e}")
            return {"llm_commentary": f"Failed to generate commentary: {e}", "step": self.name}

    @property
    def output_keys(self) -> tuple[str, ...]:
        return ("llm_commentary", "step")

    def route_next(self, state: Dict[str, Any]) -> str:
        return "structure_output"
