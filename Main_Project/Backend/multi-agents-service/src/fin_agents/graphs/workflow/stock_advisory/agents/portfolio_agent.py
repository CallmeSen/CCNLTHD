"""Agent 5: Propose portfolio allocation."""
import json
import logging
import os
from typing import Any, Dict, Optional

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from ..states.workflow_state import StockAdvisoryState
from ..prompts import PROPOSE_PORTFOLIO_SYSTEM_EN, PROPOSE_PORTFOLIO_SYSTEM_VI
from . import agent_loader  # noqa: F401 — registers _shared_llm on load

from .agent_loader import get_shared_llm

logger = logging.getLogger(__name__)


class PortfolioAgent:
    """Proposes a weighted portfolio allocation based on metrics and user profile."""

    name = "propose_portfolio"
    description = "Proposes portfolio allocation weights using LLM"

    def __init__(self, llm=None, config: Optional[dict] = None):
        self._llm = llm if llm is not None else get_shared_llm()
        self._config = config or {}

    def invoke(self, state: StockAdvisoryState) -> Dict[str, Any]:
        lang = state.get("lang", "en")
        system_prompt = PROPOSE_PORTFOLIO_SYSTEM_VI if lang == "vi" else PROPOSE_PORTFOLIO_SYSTEM_EN
        human_template_vi = "Hồ sơ người dùng:\n{user_profile}\n\nTài sản có sẵn: {assets}\n\nChỉ số tài sản:\n{metrics}\n\nTin tức thị trường:\n{news}"
        human_template_en = "User Profile:\n{user_profile}\n\nAvailable Assets: {assets}\n\nAsset Metrics:\n{metrics}\n\nMarket News:\n{news}"
        human_template = human_template_vi if lang == "vi" else human_template_en
        retry_system_vi = PROPOSE_PORTFOLIO_SYSTEM_VI + "\n\nQUAN TRỌNG: Bạn PHẢI trả về một JSON object không trống ánh xạ ticker đến trọng số float. Ví dụ: {{\"AAPL\": 0.4, \"MSFT\": 0.6}}. Không trả về object rỗng."
        retry_system_en = PROPOSE_PORTFOLIO_SYSTEM_EN + "\n\nIMPORTANT: You MUST return a non-empty JSON object mapping tickers to float weights. Example: {{\"AAPL\": 0.4, \"MSFT\": 0.6}}. Do not return empty objects."
        retry_system = retry_system_vi if lang == "vi" else retry_system_en
        retry_human_vi = "Hồ sơ người dùng:\n{user_profile}\n\nTài sản có sẵn: {assets}\n\nChỉ số tài sản:\n{metrics}\n\nTin tức thị trường:\n{news}\n\nQUAN TRỌNG: Cung cấp phân bổ danh mục không trống sử dụng CHỈ ticker từ Tài sản có sẵn ở trên."
        retry_human_en = "User Profile:\n{user_profile}\n\nAvailable Assets: {assets}\n\nAsset Metrics:\n{metrics}\n\nMarket News:\n{news}\n\nIMPORTANT: Provide a non-empty portfolio allocation using ONLY the tickers from Available Assets above."
        retry_human = retry_human_vi if lang == "vi" else retry_human_en
        from pydantic.v1 import BaseModel, Field
        from typing import Optional as Opt

        class _PortfolioAllocationSchema(BaseModel):
            portfolio_allocation: Dict[str, float] = Field(
                description="Dictionary mapping tickers to weights. Weights must sum to 1.0."
            )
            reasoning: Opt[str] = Field(None, description="Brief reasoning for the allocation")

        user_profile = state.get("user_profile")
        metrics = state.get("metrics")
        news = state.get("market_news")
        asset_universe = state.get("asset_universe")
        if not user_profile:
            return {"error_message": "Missing user profile for portfolio proposal."}
        if not asset_universe:
            return {"error_message": "No valid assets available for portfolio proposal (asset universe is empty)."}
        if not metrics or not isinstance(metrics, dict) or not any(k for k in metrics if k not in ("portfolio", "error")):
            return {"error_message": "Cannot propose portfolio: no asset metrics were calculated."}

        user_profile_json = json.dumps(user_profile)
        metrics_summary_json = json.dumps(metrics, indent=2)
        if len(metrics_summary_json) > 5000:
            metrics_summary_json = metrics_summary_json[:5000] + "\n... (truncated)"

        prompt_template = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_template),
        ])
        parser = JsonOutputParser(pydantic_object=_PortfolioAllocationSchema)
        chain = prompt_template | self._llm | parser

        max_retries = int(os.getenv("LLM_MAX_RETRIES", "2"))
        for attempt in range(max_retries + 1):
            try:
                proposal = chain.invoke({
                    "user_profile": user_profile_json,
                    "assets": ", ".join(asset_universe),
                    "metrics": metrics_summary_json,
                    "news": news or "N/A",
                })
                if isinstance(proposal, dict) and "portfolio_allocation" in proposal:
                    raw_portfolio = proposal.get("portfolio_allocation", {})
                    llm_reasoning = proposal.get("reasoning")
                elif isinstance(proposal, dict):
                    raw_portfolio = {
                        k: v for k, v in proposal.items()
                        if isinstance(k, str) and isinstance(v, (float, int))
                    }
                    llm_reasoning = None
                else:
                    return {"error_message": "LLM output format unexpected.", "step": self.name}

                if not raw_portfolio:
                    logger.warning(f"Attempt {attempt+1}: LLM returned empty allocation.")
                    if attempt < max_retries:
                        logger.info("Retrying with stricter prompt...")
                        retry_prompt = ChatPromptTemplate.from_messages([
                            ("system", retry_system),
                            ("human", retry_human),
                        ])
                        chain = retry_prompt | self._llm | parser
                        continue
                    return {
                        "error_message": (
                            f"LLM returned an empty portfolio allocation after {max_retries + 1} attempts. "
                            f"Available assets: {asset_universe}."
                        ),
                        "step": self.name,
                    }

                proposed_portfolio = {k.upper(): v for k, v in raw_portfolio.items()}
                asset_universe_upper = {a.upper() for a in asset_universe}
                filtered_portfolio = {t: w for t, w in proposed_portfolio.items() if t in asset_universe_upper}
                current_sum = sum(filtered_portfolio.values())
                if abs(current_sum) > 1e-6 and len(filtered_portfolio) > 0:
                    renormalized = {t: w / current_sum for t, w in filtered_portfolio.items()}
                    proposed_portfolio = renormalized
                elif not filtered_portfolio:
                    if attempt < max_retries:
                        logger.warning(f"Attempt {attempt+1}: LLM proposed no valid tickers, retrying...")
                        continue
                    return {
                        "error_message": (
                            f"LLM proposed portfolio contained no valid assets after {max_retries + 1} attempts. "
                            f"Available: {list(asset_universe_upper)}. Proposed: {list(proposed_portfolio.keys())}."
                        ),
                        "step": self.name,
                    }
                else:
                    proposed_portfolio = filtered_portfolio

                return {
                    "proposed_portfolio": proposed_portfolio,
                    "llm_commentary": llm_reasoning,
                    "step": self.name,
                }
            except Exception as e:
                logger.error(f"Error proposing portfolio (attempt {attempt+1}): {e}")
                if attempt >= max_retries:
                    return {"error_message": f"Failed to propose portfolio: {e}", "step": self.name}

    @property
    def output_keys(self) -> tuple[str, ...]:
        return ("proposed_portfolio", "llm_commentary", "error_message", "step")

    def route_next(self, state: StockAdvisoryState) -> str:
        if state.get("error_message"):
            return "handle_error"
        if not state.get("proposed_portfolio"):
            return "handle_error"
        return "validate_portfolio"
