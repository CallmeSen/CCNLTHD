"""
Centralised configuration — environment variables for the fin_agents package.
"""
import os
import logging

from dotenv import load_dotenv

load_dotenv()

# --- LLM ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# --- External APIs ---
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

# --- Market data ---
BENCHMARK_TICKER = os.getenv("BENCHMARK_TICKER", "^GSPC")
DEFAULT_PERIOD = os.getenv("DEFAULT_PERIOD", "5y")

# --- Storage ---
STORAGE_BASE = os.getenv("STORAGE_BASE", "./storage")
STORAGE_PORTFOLIOS = os.path.join(STORAGE_BASE, "portfolios")
STORAGE_REPORTS = os.path.join(STORAGE_BASE, "reports")
STORAGE_VISUALIZATIONS = os.path.join(STORAGE_BASE, "visualizations")

# --- Database ---
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/portfolio.db")

# --- Logging ---
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")


def _warn_missing(key: str, description: str):
    if not os.getenv(key):
        logging.warning(f"{key} not set in environment — {description}")


_warn_missing("OPENROUTER_API_KEY", "OpenRouter LLM calls will fail.")
_warn_missing("TAVILY_API_KEY", "market news will be skipped.")
