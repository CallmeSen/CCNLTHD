"""
LLM configuration helper for OpenRouter.

Centralises all LLM settings in one place, reading from environment
variables and supporting multi-model selection per agent role.
"""
import os
import logging
from typing import Dict

logger = logging.getLogger(__name__)

# Default model via OpenRouter
_DEFAULT_MODEL = "google/gemini-3-flash-preview"


def get_llm_config(
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> Dict:
    """
    Return a dict of LLM parameters, falling back to env vars or defaults.

    Parameters
    ----------
    model : str, optional
        Override the model name. If None, reads LLM_MODEL from env.
    temperature : float, optional
        Override temperature. If None, reads LLM_TEMPERATURE from env.
    max_tokens : int, optional
        Override max_tokens. If None, reads LLM_MAX_TOKENS from env.

    Returns
    -------
    Dict with keys: model, temperature, max_tokens, max_retries
    """
    return {
        "model": model or os.getenv("LLM_MODEL", _DEFAULT_MODEL),
        "temperature": float(
            os.getenv("LLM_TEMPERATURE", "0.1") if temperature is None else str(temperature)
        ),
        "max_tokens": int(
            os.getenv("LLM_MAX_TOKENS", "2048") if max_tokens is None else str(max_tokens)
        ),
        "max_retries": int(os.getenv("LLM_MAX_RETRIES", "2")),
    }


# --------------------------------------------------------------------------- #
# Multi-model presets (use with specific agent roles)
# --------------------------------------------------------------------------- #
# Format: { "role": { "model": "...", "temperature": float, "max_tokens": int } }
MODEL_PRESETS: Dict[str, Dict] = {
    # Fast, cheap model for simple parsing / intake
    "intake": {
        "model": os.getenv("LLM_MODEL", _DEFAULT_MODEL),
        "temperature": 0.1,
        "max_tokens": 1024,
    },
    # Strong model for context gathering
    "context": {
        "model": os.getenv("LLM_MODEL", _DEFAULT_MODEL),
        "temperature": 0.1,
        "max_tokens": 2048,
    },
    # Strong model for evaluation and analysis
    "evaluation": {
        "model": os.getenv("LLM_MODEL", _DEFAULT_MODEL),
        "temperature": 0.1,
        "max_tokens": 2048,
    },
    # Highest quality for report writing
    "report": {
        "model": os.getenv("LLM_MODEL", _DEFAULT_MODEL),
        "temperature": 0.2,
        "max_tokens": 4096,
    },
    # Critical review of the report
    "critic": {
        "model": os.getenv("LLM_MODEL", _DEFAULT_MODEL),
        "temperature": 0.1,
        "max_tokens": 2048,
    },
}


def get_llm_for_role(role: str):
    """
    Instantiate a ChatOpenRouter model for a specific agent role.

    Parameters
    ----------
    role : str
        One of MODEL_PRESETS keys (intake, context, evaluation, report, critic).
    api_key : str, optional
        OpenRouter API key. If None, reads OPENROUTER_API_KEY from env.

    Returns
    -------
    ChatOpenRouter instance configured for the given role.
    """
    from langchain_openrouter import ChatOpenRouter

    preset = MODEL_PRESETS.get(role, MODEL_PRESETS["intake"])
    if not os.getenv("OPENROUTER_API_KEY"):
        raise ValueError("OPENROUTER_API_KEY is not set.")

    return ChatOpenRouter(
        model=preset["model"],
        temperature=preset["temperature"],
        max_tokens=preset["max_tokens"],
        max_retries=int(os.getenv("LLM_MAX_RETRIES", "2")),
    )
