"""Agent 1: Parse user request into structured profile."""
import json
import logging
import os
import re
from typing import Any, Dict, Optional

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from ..states.workflow_state import StockAdvisoryState
from ..prompts import PARSE_USER_SYSTEM
from .agent_loader import get_shared_llm

logger = logging.getLogger(__name__)


def _safe_json_parse(text: str) -> dict | None:
    """Try to parse JSON, attempting repair on common failures."""
    text = text.strip()
    fences = re.findall(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fences:
        text = fences[0]
    text = text.strip()
    text = re.sub(r",(\s*[}\]])", r"\1", text)
    try:
        return json.loads(text)
    except Exception:
        return None


class ParseAgent:
    """Parses natural language investment request into a structured user profile."""

    name = "parse_user_request"
    description = "Parses natural language request into structured user profile"

    def __init__(self, llm=None, config: Optional[dict] = None):
        self._llm = llm if llm is not None else get_shared_llm()
        self._config = config or {}

    def invoke(self, state: StockAdvisoryState) -> Dict[str, Any]:
        from pydantic.v1 import BaseModel, Field
        from typing import Optional as Opt, List

        class _UserProfileSchema(BaseModel):
            goal: str = Field(description="Primary investment goal")
            risk_tolerance: str = Field(description="Risk tolerance (low, medium, high)")
            time_horizon: str = Field(description="Investment time horizon")
            initial_capital: Opt[float] = Field(None, description="Initial investment amount")
            preferences: Opt[Dict | List[str]] = Field(None, description="User preferences")
            specific_preferences: Opt[str] = Field(None, description="Specific preferences as string")
            suggested_assets: Opt[List[str]] = Field(None, description="Asset tickers")
            start_date: Opt[str] = Field(None, description="Start date YYYY-MM-DD")
            end_date: Opt[str] = Field(None, description="End date YYYY-MM-DD")

        parser = JsonOutputParser(pydantic_object=_UserProfileSchema)
        prompt = ChatPromptTemplate.from_messages([
            ("system", PARSE_USER_SYSTEM),
            ("human", "Here is the user request: {request}\n\nOutput ONLY valid JSON matching this schema. Do not add any text before or after the JSON."),
        ])

        for attempt in range(int(os.getenv("LLM_MAX_RETRIES", "2")) + 1):
            try:
                chain = prompt | self._llm | parser
                llm_output_raw = chain.invoke({"request": state["initial_request"]})
                user_profile = llm_output_raw
            except Exception as e:
                logger.warning(f"ParseAgent attempt {attempt+1} failed: {e}")
                if attempt == 0:
                    try:
                        raw_chain = prompt | self._llm
                        raw = raw_chain.invoke({"request": state["initial_request"]})
                        content = getattr(raw, "content", str(raw))
                        user_profile = _safe_json_parse(content)
                        if user_profile is None:
                            raise ValueError(f"Could not parse JSON from: {content[:200]}")
                    except Exception as e2:
                        logger.error(f"ParseAgent raw fallback also failed: {e2}")
                        return {"error_message": f"Failed to parse user request: {e2}"}
                else:
                    return {"error_message": f"Failed to parse user request: {e}"}

            assets = []
            if user_profile and user_profile.get("suggested_assets"):
                assets.extend(user_profile["suggested_assets"])
            if assets:
                assets = sorted(list(set(ticker.upper().strip() for ticker in assets if isinstance(ticker, str))))
            if not assets:
                logger.error("No assets identified.")
                return {"user_profile": user_profile, "asset_universe": [], "error_message": "No assets were identified."}
            return {"user_profile": user_profile, "asset_universe": assets}

        return {"error_message": "Max retries exceeded for parse_user_request"}

    @property
    def output_keys(self) -> tuple[str, ...]:
        return ("user_profile", "asset_universe", "error_message")

    def route_next(self, state: StockAdvisoryState) -> str:
        if state.get("error_message"):
            return "handle_error"
        if not state.get("asset_universe"):
            return "handle_error"
        return "fetch_market_news"
