"""Dynamic agent factory - loads agents from configuration.

Each agent class is instantiated with its config section from agents.yaml.
Agents auto-register with AgentRegistry at load time.
"""
import os
from functools import lru_cache
from typing import Any, Dict, Optional

from langchain_openrouter import ChatOpenRouter

from .base import AgentProtocol
from .registry import AgentRegistry


@lru_cache(maxsize=1)
def get_shared_llm():
    """Lazily create and cache the shared LLM instance.

    Avoids instantiating ChatOpenRouter at import time (which requires
    OPENROUTER_API_KEY to be set) when just building the graph.
    Tests can patch this via 'patch("...agents.agent_loader.get_shared_llm")'.
    """
    return ChatOpenRouter(
        model=os.getenv("LLM_MODEL", "google/gemini-3-flash-preview"),
        temperature=0.1,
        max_tokens=int(os.getenv("LLM_MAX_TOKENS", "4096")),
        max_retries=2,
    )


# Backward-compat alias — existing code patching agent_loader._shared_llm
# will get the cached LLM instance via the property.
class _SharedLLM:
    """Lazy wrapper so _shared_llm resolves at access time, not import time."""
    def __get__(self, obj, objtype=None):
        return get_shared_llm()


_shared_llm = _SharedLLM()


def load_agents(config: Optional[Dict[str, Any]] = None) -> Dict[str, AgentProtocol]:
    """
    Load and instantiate agents based on the provided config.

    If no config is passed, uses the config loader to read agents.yaml.
    Only agents with ``enabled: true`` are instantiated and registered.

    Parameters
    ----------
    config : dict, optional
        Dict with keys matching agent names, each containing an agent config
        dict (timeout_seconds, llm_temperature, etc.).

    Returns
    -------
    Dict[str, AgentProtocol]
        Mapping of agent name -> instantiated agent instance.
    """
    if config is None:
        config = _load_config()

    # Import agent classes lazily to avoid circular imports
    from .parse_agent import ParseAgent
    from .news_agent import NewsAgent
    from .data_agent import DataAgent
    from .metrics_agent import MetricsAgent
    from .portfolio_agent import PortfolioAgent
    from .validation_agent import ValidationAgent
    from .commentary_agent import CommentaryAgent
    from .report_agent import ReportAgent, ErrorAgent

    agent_classes: Dict[str, type] = {
        "parse_user_request": ParseAgent,
        "fetch_market_news": NewsAgent,
        "fetch_data": DataAgent,
        "calculate_metrics": MetricsAgent,
        "propose_portfolio": PortfolioAgent,
        "validate_portfolio": ValidationAgent,
        "generate_commentary": CommentaryAgent,
        "structure_output": ReportAgent,
        "handle_error": ErrorAgent,
    }

    loaded: Dict[str, AgentProtocol] = {}
    agents_config = config.get("agents", {})

    for agent_id, agent_cls in agent_classes.items():
        agent_cfg = agents_config.get(agent_id, {})
        if not agent_cfg.get("enabled", True):
            continue
        instance = agent_cls(config=agent_cfg)
        AgentRegistry.register(instance)
        loaded[agent_id] = instance

    return loaded


def _load_config() -> Dict[str, Any]:
    """Load agents configuration from agents.yaml."""
    try:
        from src.fin_agents.config.loader import load_agents_config
        return load_agents_config()
    except Exception:
        # Return empty config so agents use defaults if yaml is missing
        return {"agents": {}}
